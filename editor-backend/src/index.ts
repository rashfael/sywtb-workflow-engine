import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { showRoutes } from 'hono/dev'

import app from './app'
import { injectWebSocket } from './baseWebSocketApp'
import authApp from './auth'
import workflowsApp from './workflows'
import workflowApp from './workflow'
import loroApp from './loro/app'

app.use('*', cors())
app.use(logger())

app.route('/auth', authApp)
app.route('/workflows', workflowsApp)
app.route('/workflows/:workflowId', workflowApp)
app.route('/loro', loroApp)

const port = 8787
const server = serve({
	fetch: app.fetch,
	port
})
injectWebSocket(server)

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
