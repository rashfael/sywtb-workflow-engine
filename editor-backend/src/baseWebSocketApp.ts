/**
 * WebSocket App Factory
 *
 * Creates a Hono app with WebSocket support using CBOR encoding.
 * JWT verification is handled automatically - onAuth receives the verified payload.
 *
 * @example
 * ```typescript
 * const app = createWebSocketApp('/ws', (ctx) => {
 *   let userId: string
 *
 *   return {
 *     onAuth: (payload) => {
 *       userId = payload.sub
 *     },
 *     onClose: () => {
 *       console.log(`User ${userId} disconnected`)
 *     },
 *     actions: {
 *       async saveDocument(content: string) {
 *         await db.save(content)
 *         ctx.publish('documentUpdated', content) // notify others
 *         return { saved: true }
 *       }
 *     }
 *   }
 * })
 * ```
 *
 * Context utilities (available on ctx):
 * - `ctx.send(action, ...args)` - Send to this client
 * - `ctx.publish(action, ...args)` - Send to all clients except this one
 * - `ctx.broadcast(action, ...args)` - Send to all clients including this one
 */

import { createNodeWebSocket } from '@hono/node-ws'
import { Hono, HonoRequest } from 'hono'
import { decode, encode } from 'cbor-x'
import type { WSContext } from 'hono/ws'
import { verify } from 'hono/jwt'

import app from '~/app'
import { JWT_SECRET, type JWTPayload } from '~/auth'

export type SendFn = (action: string, ...args: unknown[]) => void

export interface WebSocketCtx {
	req: HonoRequest,
	/** Send to this client */
	send: SendFn,
	/** Send to all clients except this one */
	publish: SendFn,
	/** Send to all clients including this one */
	broadcast: SendFn,
}

export type ActionHandler = (
	...args: unknown[]
) => Promise<unknown> | unknown

export interface WebSocketAppHooks {
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
	ctx: WebSocketCtx
	hooks: WebSocketAppHooks
}

// injecting just once with the root app seems to work fine
const { upgradeWebSocket, injectWebSocket } = createNodeWebSocket({ app })
export { injectWebSocket }

export function createWebSocketApp (
	path: string,
	createHooks: (ctx: WebSocketCtx) => WebSocketAppHooks
) {
	const app = new Hono()

	const clients = new Map<WSContext, WebSocketClient>()
	console.log(upgradeWebSocket)
	app.get(
		path,
		upgradeWebSocket(({ req }) => {
			let socket: WSContext

			function send (...data: unknown[]) {
				if (socket.readyState !== WebSocket.OPEN) return
				// I think the send type signature is actually wrong here
				socket.send(encode(data) as unknown as ArrayBuffer)
			}

			return {
				onOpen (_event, ws) {
					socket = ws

					const clientSend: SendFn = (action: string, ...args: unknown[]) => {
						send(action, ...args)
					}

					const publish: SendFn = (action: string, ...args: unknown[]) => {
						for (const client of clients.values()) {
							if (client.socket !== socket) {
								client.ctx.send(action, ...args)
							}
						}
					}

					const broadcast: SendFn = (action: string, ...args: unknown[]) => {
						for (const client of clients.values()) {
							client.ctx.send(action, ...args)
						}
					}

					const ctx: WebSocketCtx = {
						req,
						send: clientSend,
						publish,
						broadcast
					}

					const hooks = createHooks(ctx)

					const client: WebSocketClient = {
						socket,
						ctx,
						hooks
					}
					clients.set(socket, client)
				},

				async onMessage (event) {
					const client = clients.get(socket)
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
					const client = clients.get(socket)
					if (!client) return

					if (client.hooks.onClose) {
						try {
							await client.hooks.onClose()
						} catch (error) {
							console.error('Error in onClose handler:', error)
						}
					}

					clients.delete(socket)
				},

				async onError (event) {
					console.log('WS ERROR', event)
					const client = clients.get(socket)
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
