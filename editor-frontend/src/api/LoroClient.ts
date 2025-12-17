import { ref, type Ref } from 'vue'
import { LoroDoc } from 'loro-crdt'
import BaseWebSocketClient from './BaseWebSocketClient'

export default class LoroClient extends BaseWebSocketClient {
	#doc: LoroDoc
	isSynced: Ref<boolean> = ref(false)

	constructor ({ doc, url, token }: { doc: LoroDoc, url: string, token: string }) {
		super({ url, token }, {
			update (update) {
				doc.import(update)
			}
		})

		this.#doc = doc
		doc.subscribeLocalUpdates((update) => {
			this.call('update', update)
		})

		this.on('authenticated', async () => {
			this.#doc.import(await this.call('getSnapshot'))
			this.isSynced.value = true
		})
	}
}
