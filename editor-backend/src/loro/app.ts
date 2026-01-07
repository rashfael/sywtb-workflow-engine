import { createWebSocketApp } from '~/baseWebSocketApp'
import { verifyLoroToken, type JWTPayload } from '~/auth'

import StoredLoroDoc from './doc'

export default createWebSocketApp('/:docPath{.+}', async (room) => {
	const doc = await StoredLoroDoc.fromPath(room.params.docPath)
	return {
		async onClientConnect (client) {
			return {
				onAuth (payload: JWTPayload) {
					verifyLoroToken(payload, room.params.docPath)
				},
				actions: {
					async update (update: any) {
						doc.update(update)
						client.broadcastOthers('update', update)
					},
					async getSnapshot () {
						return doc.getSnapshot()
					}
				}
			}
		},
		roomTeardown () {
			// TODO avoid race condition where while destroying, another client connects
			doc.destroy()
		}
	}
})
