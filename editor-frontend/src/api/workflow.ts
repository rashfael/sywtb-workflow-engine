import config from 'config'
import { exchangeWorkflowToken } from './auth'
import { createApi } from './base'

export async function createWorkflowApi (workflowId: string) {
	const api = await createApi({
		getToken: () => exchangeWorkflowToken(workflowId),
		prefixUrl: `${config.editorBackend.baseUrl}/workflows/${workflowId}`
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
