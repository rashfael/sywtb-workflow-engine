import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { logger } from 'hono/logger'
import { showRoutes } from 'hono/dev'

import * as clients from '@restatedev/restate-sdk-clients'
import { workflowWrapperService } from './workflow'
const restateClient = clients.connect({ url: 'http://localhost:8080' })

const app = new Hono({ strict: false })

app.use(logger())

app.post('/:workflowId/execute', async ({ req, json }) => {
	const workflowId = req.param('workflowId')
	const payload = await req.json()
	restateClient.serviceSendClient<typeof workflowWrapperService>(workflowWrapperService).execute({ workflowId, payload })
	return json({ status: 'submitted' })
})

const port = 8888
serve({
	fetch: app.fetch,
	port
})

console.log(`Public Execution API running on http://localhost:${port}`)
showRoutes(app, {
	verbose: true
})
