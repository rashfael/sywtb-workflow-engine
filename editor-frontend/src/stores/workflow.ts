import { markRaw, type Raw } from 'vue'
import config from 'config'
import { token } from '~/api/auth'
import { createStore } from '~/lib/store'
import { LoroDoc } from 'loro-crdt'
import LoroClient from '~/api/LoroClient'

export function createWorkflowStore (workflowId: string) {
	return createStore('workflow', {
		state () {
			const doc = new LoroDoc()
			doc.getText('config.ts')
			return {
				doc,
				client: null as Raw<LoroClient> | null
			}
		},
		getters: {
			isSynced () {
				return this.client?.isSynced.value ?? false
			}
		},
		actions: {
			connect () {
				this.client = markRaw(new LoroClient({
					doc: this.doc,
					url: `${config.editorBackend.baseUrl}/loro/workflows/${workflowId}`,
					token: token
				}))
			}
		}
	})
}
