import { createStore } from '~/lib/store'
import authApi from '~/api/auth'
import { createWorkflowsApi } from '~/api/workflows'

let store
export { store as default }

export function initGlobalStore () {
	const api = createWorkflowsApi()
	store = createStore('workflows', {
		state () {
			return {
				user: null,
				workflows: null as null | Array<{ _id: string; label: string }>
			}
		},
		actions: {
			async fetchUser () {
				this.user = await authApi.get('me').json()
			},
			async fetchWorkflows () {
				this.workflows = await api.workflows.list()
			},
			async createWorkflow ({ label, _id }: { label: string; _id: string }) {
				const workflow = await api.workflows.create({ _id, label })
				this.workflows.push(workflow)
			}
		}
	})
}
