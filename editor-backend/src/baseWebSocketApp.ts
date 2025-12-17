/**
 * WebSocket App Factory
 *
 * Creates a Hono app with WebSocket support using CBOR encoding.
 * JWT verification is handled automatically - onAuth receives the verified payload.
 *
 * @example
 * ```typescript
 * const app = createWebSocketApp('/ws/:docId', async (room) => {
 *   // Setup room-level state here
 *   const docState = new Map()
 *
 *   return {
 *     async roomTeardown() {
 *       // Cleanup room when last client disconnects
 *       docState.clear()
 *     },
 *     async onClientConnect(client) {
 *       let userId: string
 *
 *       return {
 *         onAuth: (payload) => {
 *           userId = payload.sub
 *         },
 *         onClose: () => {
 *           console.log(`User ${userId} disconnected`)
 *         },
 *         actions: {
 *           async saveDocument(content: string) {
 *             await db.save(content)
 *             client.broadcastOthers('documentUpdated', content) // notify others
 *             return { saved: true }
 *           },
 *           async notifyAll(message: string) {
 *             room.broadcast('notification', message) // notify all including self
 *           }
 *         }
 *       }
 *     }
 *   }
 * })
 * ```
 *
 * Room context (available on room):
 * - `room.broadcast(action, ...args)` - Send to all clients including sender
 *
 * Client context (available on client):
 * - `client.req` - The original Hono request
 * - `client.send(action, ...args)` - Send to this client only
 * - `client.broadcastOthers(action, ...args)` - Send to all clients except this one
 */

import { createNodeWebSocket } from '@hono/node-ws'
import { Hono, HonoRequest } from 'hono'
import { decode, encode } from 'cbor-x'
import type { WSContext } from 'hono/ws'
import { verify } from 'hono/jwt'

import app from '~/app'
import { JWT_SECRET, type JWTPayload } from '~/auth'

export type SendFn = (action: string, ...args: unknown[]) => void

export interface RoomCtx {
	/** Room url */
	url: string
	/** Path params */
	params: Record<string, string>
	/** Send to all clients including sender */
	broadcast: SendFn
}

export interface ClientCtx {
	req: HonoRequest
	/** Send to this client only */
	send: SendFn
	/** Send to all clients except this one */
	broadcastOthers: SendFn
}

export type ActionHandler = (
	...args: unknown[]
) => Promise<unknown> | unknown

export interface RoomHooks {
	/** Called when last client disconnects from the room */
	roomTeardown?: () => Promise<void> | void
	/** Called when a new client connects, return client hooks */
	onClientConnect: (client: ClientCtx) => Promise<ClientHooks> | ClientHooks
}

export interface ClientHooks {
	/** Called before authentication is processed */
	onBeforeAuth?: (token: string) => Promise<void> | void
	/** Called to authorize the connection after JWT verification, receives the JWT payload. Throw to reject */
	onAuth?: (payload: JWTPayload) => Promise<void> | void
	/** Called after successful authorization */
	onAfterAuth?: () => Promise<void> | void
	/** Called when connection is closed */
	onClose?: () => Promise<void> | void
	/** Called when an error occurs */
	onError?: (error: Error) => Promise<void> | void
	/** Action handlers for [action, id, args] calls */
	actions?: Record<string, ActionHandler>
}

export interface WebSocketClient {
	socket: WSContext
	ctx: ClientCtx
	hooks: ClientHooks
}

// injecting just once with the root app seems to work fine
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app })
export { injectWebSocket }

export function createWebSocketApp (
	path: string,
	createRoom: (room: RoomCtx) => Promise<RoomHooks> | RoomHooks
) {
	const app = new Hono()

	// Map of URL path -> room state
	const rooms = new Map<string, {
		clients: Map<WSContext, WebSocketClient>
		hooks: RoomHooks
		ctx: RoomCtx
	}>()

	async function getOrCreateRoom (req: HonoRequest) {
		const url = req.url
		let room = rooms.get(url)
		if (!room) {
			const clients = new Map<WSContext, WebSocketClient>()
			const ctx: RoomCtx = {
				url,
				params: req.param(), // TODO can we type this better?
				broadcast (action: string, ...args: unknown[]) {
					for (const client of clients.values()) {
						client.ctx.send(action, ...args)
					}
				}
			}
			const hooks = await createRoom(ctx)
			room = { clients, hooks, ctx }
			rooms.set(url, room)
		}
		return room
	}

	app.get(
		path,
		upgradeWebSocket(({ req }) => {
			let socket: WSContext
			const {
				promise: eventualRoom,
				resolve: resolveRoom
			} = Promise.withResolvers<Awaited<ReturnType<typeof getOrCreateRoom>>>()

			function send (...data: unknown[]) {
				if (socket.readyState !== WebSocket.OPEN) return
				// I think the send type signature is actually wrong here
				socket.send(encode(data) as unknown as ArrayBuffer)
			}

			return {
				async onOpen (_event, ws) {
					socket = ws
					const room = await getOrCreateRoom(req)
					resolveRoom(room)

					const clientSend: SendFn = (action: string, ...args: unknown[]) => {
						send(action, ...args)
					}

					const broadcastOthers: SendFn = (action: string, ...args: unknown[]) => {
						for (const client of room.clients.values()) {
							if (client.socket !== socket) {
								client.ctx.send(action, ...args)
							}
						}
					}

					const clientCtx: ClientCtx = {
						req,
						send: clientSend,
						broadcastOthers
					}

					const clientHooks = await room.hooks.onClientConnect(clientCtx)

					const client: WebSocketClient = {
						socket,
						ctx: clientCtx,
						hooks: clientHooks
					}
					room.clients.set(socket, client)
				},

				async onMessage (event) {
					// wait for room to be loaded
					const room = await eventualRoom
					const client = room.clients.get(socket)
					if (!client) return

					let data: ArrayBuffer
					if (event.data instanceof ArrayBuffer) {
						data = event.data
					} else if (event.data instanceof Blob) {
						data = await event.data.arrayBuffer()
					} else {
						return
					}

					try {
						const message = decode(new Uint8Array(data)) as unknown[]
						const action = message.shift() as string

						switch (action) {
							case 'ping': {
								client.ctx.send('pong', message[0])
								break
							}
							case 'auth': {
								// Auth follows the same [action, id, args] pattern
								const [requestId, args] = message as [number, { token: string }]
								const { token } = args

								try {
									if (client.hooks.onBeforeAuth) {
										await client.hooks.onBeforeAuth(token)
									}

									// Verify JWT
									const payload = await verify(token, JWT_SECRET) as unknown as JWTPayload

									// Let instance do additional authorization
									if (client.hooks.onAuth) {
										await client.hooks.onAuth(payload)
									}

									if (client.hooks.onAfterAuth) {
										await client.hooks.onAfterAuth()
									}

									// Respond to auth call
									send('success', requestId, { authenticated: true })
								} catch (error) {
									const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
									send('error', requestId, errorMessage)
									socket.close(1008, errorMessage)
								}
								break
							}
							default: {
								// Handle action calls [action, id, args]
								// TODO handle one-way [action, args] ?
								const [requestId, ...args] = message as [number, ...unknown[]]
								const handler = client.hooks.actions?.[action]

								if (!handler) {
									send('error', requestId, `Unknown action: ${action}`)
									return
								}

								try {
									const result = await handler(...args)
									send('success', requestId, result)
								} catch (error) {
									const errorMessage = error instanceof Error ? error.message : 'Action failed'
									send('error', requestId, errorMessage)

									if (client.hooks.onError) {
										await client.hooks.onError(error instanceof Error ? error : new Error(errorMessage))
									}
								}
							}
						}
					} catch (error) {
						console.error('Failed to handle WebSocket message:', error)
						if (client.hooks.onError) {
							await client.hooks.onError(error instanceof Error ? error : new Error('Message handling failed'))
						}
					}
				},

				async onClose (_event) {
					const room = await eventualRoom
					const client = room.clients.get(socket)
					if (!client) return

					if (client.hooks.onClose) {
						try {
							await client.hooks.onClose()
						} catch (error) {
							console.error('Error in onClose handler:', error)
						}
					}

					room.clients.delete(socket)

					// Teardown room when last client disconnects
					if (room.clients.size === 0 && room.hooks.roomTeardown) {
						try {
							await room.hooks.roomTeardown()
						} catch (error) {
							console.error('Error in roomTeardown handler:', error)
						}
						rooms.delete(req.url)
					}
				},

				async onError (event) {
					console.log('WS ERROR', event)
					const room = await eventualRoom
					const client = room.clients.get(socket)
					if (!client) return

					if (client.hooks.onError) {
						const error = event instanceof Error ? event : new Error('WebSocket error')
						try {
							await client.hooks.onError(error)
						} catch (err) {
							console.error('Error in onError handler:', err)
						}
					}
				}
			}
		})
	)

	return app
}
