import ky, { HTTPError, type Options } from 'ky'
import router from '~/router'
import { token as rootToken } from './auth'

export interface CreateApiOptions extends Options {
	getToken?: () => string | Promise<string>
}

export function createApi ({
	getToken,
	...options
}: CreateApiOptions = {}) {
	let eventualToken = getToken?.()

	return ky.create({
		headers: {
			'Content-Type': 'application/json'
		},
		retry: {
			// Don't retry auth failures via normal retry - handled by afterResponse
			shouldRetry: ({ error }) => {
				if (error instanceof HTTPError && error.response.status === 401) return false
				return undefined
			}
		},
		hooks: {
			beforeRequest: [
				async (request) => {
					const token = await eventualToken || rootToken
					request.headers.set('Authorization', `Bearer ${token}`)
				}
			],
			beforeError: [
				async (error) => {
					const { response } = error
					if (response) {
						try {
							const body = await response.clone().json() as any
							error.message = `${body.message} (${response.status})`
						} catch {
							// Response wasn't JSON, keep original message
						}
					}
					return error
				}
			],
			afterResponse: [
				async (_request, _options, response) => {
					if (response.status === 401) {
						if (getToken) {
							eventualToken = getToken()
							return ky.retry({ code: 'TOKEN_REFRESHED' })
						} else {
							// rootToken needs to be refreshed via login
							router.push({ name: 'login' })
							// TODO redirect back to where we left off
						}
					}
				}
			]
		},
		...options
	})
}
