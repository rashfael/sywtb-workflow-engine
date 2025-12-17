import { createWebSocketApp } from '~/baseWebSocketApp'

import StoredLoroDoc from './doc'

export default createWebSocketApp('/:docPath{.+}', async (room) => {
	const doc = await StoredLoroDoc.fromPath(room.params.docPath)
	return {
		async onClientConnect (client) {
			return {
				onAuth (_payload) {
					// TODO do a key exchange or something
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
