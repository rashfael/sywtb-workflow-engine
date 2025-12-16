import { createStore } from '~/lib/store'
import { LoroDoc } from 'loro-crdt'

export function createWorkflowStore (workflowId: string) {
	return createStore('workflow', {
		state () {
			const doc = new LoroDoc()
			doc.getText('config.ts')
			return {
				doc
			}
		},
		actions: {
		}
	})
}
