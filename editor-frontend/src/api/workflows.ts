import ky from 'ky'
import config from 'config'
import { token } from './auth.js'

export function createWorkflowsApi () {
	// TODO less copypasta?
	const api = ky.create({
		prefixUrl: `${config.editorBackend.baseUrl}/workflows`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		hooks: {
			beforeError: [
				async (error) => {
					const { response } = error
					if (response) {
						const body = await response.json() as any
						error.message = `${body.message} (${response.status})`
					}

					return error
				}
			]
		}
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
