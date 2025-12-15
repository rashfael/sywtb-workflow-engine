import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { showRoutes } from 'hono/dev'

import authApp from './auth.js'
import workflowsApp from './workflows.js'

// we need to be non-strict for subapp / to route for some reason, investigate later
const app = new Hono({ strict: false })

app.use('*', cors())
app.use(logger())

app.get('/', (c) => c.text('Hono!'))

app.route('/auth', authApp)
app.route('/workflows', workflowsApp)

const port = 8787
const server = serve({
	fetch: app.fetch,
	port
})

console.log(`Editor Backend running on http://localhost:${port}`)
showRoutes(app, {
	verbose: true,
})

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
