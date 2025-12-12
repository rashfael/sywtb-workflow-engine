import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

const port = 8787
const server = serve({
	fetch: app.fetch,
	port
})

console.log(`Editor Backend running on http://localhost:${port}`)

// graceful shutdown
process.on('SIGINT', () => {
	server.close()
	process.exit(0)
})
process.on('SIGTERM', () => {
	server.close((err) => {
		if (err) {
			console.error(err)
			process.exit(1)
		}
		process.exit(0)
	})
})
