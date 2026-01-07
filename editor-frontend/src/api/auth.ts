import ky from 'ky'
import config from 'config'

let api = ky.create({
	prefixUrl: `${config.editorBackend.baseUrl}/auth`,
	headers: {
		'Content-Type': 'application/json'
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

export { api as default }

let token = localStorage.getItem('authToken') || null
export { token }

function extendApiWithAuth () {
	api = api.extend({
		headers: {
			Authorization: `Bearer ${token}`
		}
	})
}

if (token) extendApiWithAuth()

export async function login (email: string, password: string) {
	const response = await api.post('login', {
		json: {
			email,
			password
		}
	}).json() as { token: string }
	token = response.token
	localStorage.setItem('authToken', token)
	extendApiWithAuth()
}

export async function exchangeWorkflowToken (workflowId: string) {
	const { token } = await api.post(`tokens/workflow/${workflowId}`).json() as { token: string }
	return token
}
