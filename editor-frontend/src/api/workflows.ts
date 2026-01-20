import config from 'config'
import { createApi } from './base'

export function createWorkflowsApi () {
	const api = createApi({
		prefixUrl: `${config.editorBackend.baseUrl}/workflows`
	})

	return {
		...api,
		workflows: {
			async list () {
				return await api.get('').json() as Array<{ _id: string, label: string, owner: string }>
			},
			async create ({ _id, label }: { _id: string, label: string }) {
				return await api.post('', {
					json: {
						_id,
						label
					}
				}).json() as { _id: string, label: string, owner: string }
			}
		}
	}
}
