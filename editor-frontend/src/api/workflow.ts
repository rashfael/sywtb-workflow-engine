import ky from 'ky'
import config from 'config'
import { exchangeWorkflowToken } from './auth'

export async function createWorkflowApi (workflowId: string) {
	const token = await exchangeWorkflowToken(workflowId)
	// TODO less copypasta?
	const api = ky.create({
		prefixUrl: `${config.editorBackend.baseUrl}/workflows/${workflowId}`,
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
		async exchangeLoroToken () {
			const { token } = await api.post(`tokens/loro`).json() as { token: string }
			return token
		},
		async deploy () {
			return await api.post(`deploy`).json() as { success: boolean }
		}
	}
}
