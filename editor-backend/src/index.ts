import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'

import authApp from './auth.js'

const app = new Hono()

app.use('*', cors())

app.get('/', (c) => c.text('Hono!'))

app.route('/auth', authApp)

const port = 8787
const server = serve({
	fetch: app.fetch,
	port
})

console.log(`Editor Backend running on http://localhost:${port}`)

// graceful shutdown
process.on('SIGINT', () => {
	console.log('SIGINT')
	server.close()
	process.exit(0)
})
process.on('SIGTERM', () => {
	console.log('SIGTERM')
	server.close((err) => {
		if (err) {
			console.error(err)
			process.exit(1)
		}
		process.exit(0)
	})
})
