import { EventEmitter } from 'events'
import { decode, encode } from 'cbor-x'

export type WebsocketEventHandler = (data: any) => void

export default class BaseWebsocketClient extends EventEmitter {
	#socket: WebSocket | null = null
	#url: string
	#token: string
	#eventHandlers: Record<string, WebsocketEventHandler> = {}

	#pendingRequests: Map<number, PromiseWithResolvers<any>> = new Map()
	#nextRequestId = 1

	constructor ({ url, token }: { url: string, token: string }, eventHandlers: Record<string, WebsocketEventHandler>) {
		super()
		this.#url = url
		this.#token = token
		this.#eventHandlers = eventHandlers
		this.#connect()
	}

	send (action: string, args: any) {
		if (!this.#socket) return
		this.#socket.send(encode([action, args]))
	}

	call (action: string, args?: any): Promise<any> {
		const { id, promise } = this.#createRequest()
		this.#socket.send(encode([action, id, args]))
		return promise
	}

	#connect () {
		this.#socket = new WebSocket(this.#url)
		this.#socket.binaryType = 'arraybuffer'

		this.#socket.addEventListener('open', async () => {
			console.log('WebSocket connected to', this.#url)
			this.emit('open')
			await this.call('auth', { token: this.#token })
			this.emit('authenticated')
			// start pinging
			this.send('ping', Date.now())
		})

		this.#socket.addEventListener('message', this.#handleMessage.bind(this))

		this.#socket.addEventListener('close', () => {
			this.emit('close')
			// TODO autoreconnect
		})
	}

	#handleMessage (event: MessageEvent) {
		const data = decode(new Uint8Array(event.data))
		const action = data.shift() as string
		switch (action) {
			case 'success': {
				const [id, ...args] = data as [number, ...any[]]
				const request = this.#pendingRequests.get(id)
				if (request) {
					request.resolve(args.length === 1 ? args[0] : args)
					this.#pendingRequests.delete(id)
				}
				break
			}
			case 'error': {
				const [id, errorMessage] = data as [number, string]
				const request = this.#pendingRequests.get(id)
				if (request) {
					request.reject(new Error(errorMessage))
					this.#pendingRequests.delete(id)
				}
				break
			}
			case 'pong': {
				setTimeout(() => {
					this.send('ping', Date.now())
				}, 15000)
				break
			}
			default: {
				const handler = this.#eventHandlers[action]
				if (handler) {
					handler(data.length === 1 ? data[0] : data)
				} else {
					console.warn(`No handler for websocket event: ${action}`)
				}
			}
		}
	}

	#createRequest () {
		const id = this.#nextRequestId++
		const request = Promise.withResolvers()
		this.#pendingRequests.set(id, request)
		return { id, promise: request.promise }
	}
}
