import ky from 'ky'
import config from 'config'
import { createApi } from './base'

let token = localStorage.getItem('authToken') || null
export { token }

const unauthedApi = ky.create({
	prefixUrl: `${config.editorBackend.baseUrl}/auth`,
	headers: { 'Content-Type': 'application/json' }
})

const api = await createApi({
	prefixUrl: `${config.editorBackend.baseUrl}/auth`
})
export { api as default }

export async function login (email: string, password: string) {
	const response = await unauthedApi.post('login', {
		json: {
			email,
			password
		}
	}).json() as { token: string }
	token = response.token
	localStorage.setItem('authToken', token)
}

export async function exchangeWorkflowToken (workflowId: string) {
	const { token } = await api.post(`tokens/workflow/${workflowId}`).json() as { token: string }
	return token
}
