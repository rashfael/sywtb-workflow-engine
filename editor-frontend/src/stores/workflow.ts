import { markRaw, type Raw } from 'vue'
import config from 'config'
import { createStore } from '~/lib/store'
import { LoroDoc } from 'loro-crdt'
import LoroClient from '~/api/LoroClient'
import { createWorkflowApi } from '~/api/workflow'

export function createWorkflowStore (workflowId: string) {
	return createStore('workflow', {
		state () {
			const doc = new LoroDoc()
			doc.getText('config.ts')
			return {
				api: null as Awaited<ReturnType<typeof createWorkflowApi>> | null,
				doc: markRaw(doc),
				client: null as Raw<LoroClient> | null
			}
		},
		getters: {
			isReady () {
				return this.api !== null && (this.client?.isSynced.value ?? false)
			}
		},
		actions: {
			async connect () {
				this.api = await createWorkflowApi(workflowId)
				this.client = markRaw(new LoroClient({
					doc: this.doc,
					url: `${config.editorBackend.baseUrl}/loro/workflows/${workflowId}/workflow`,
					token: await this.api.exchangeLoroToken()
				}))
			},
			async deploy () {
				await this.api.deploy()
			}
		}
	})
}
