import { Hono } from 'hono'
import { authMiddleware } from '~/auth.js'
import { mongodb } from '~/mongodb.js'
import { createWebSocketApp } from './baseWebSocketApp'

const wrapperApp = new Hono()

// this needs to go before auth middleware
wrapperApp.route('/ws', createWebSocketApp('/:workflowId', (_room) => {
	return {
		onClientConnect (client) {
			return {
				onAuth (payload) {
					console.log('WebSocket connection authorized for', payload.sub, client.req.param('workflowId'))
				}
			}
		}
	}
}))

const app = new Hono()
app.route('/', wrapperApp)

app.use(authMiddleware)

app.get('/', async ({ json, var: { jwtPayload } }) => {
	const owner = jwtPayload!.sub

	const workflows = await mongodb.workflows.find({ owner }).toArray()
	return json(workflows)
})

app.post('/', async ({ json, req, var: { jwtPayload } }) => {
	const owner = jwtPayload!.sub
	const { _id, label } = await req.json() as { _id: string, label: string }

	// TODO proper error for existing workflow

	const result = await mongodb.workflows.insertOne({
		_id, // TODO enforce id format
		label,
		owner
	})

	return json({
		_id: result.insertedId.toString(),
		label,
		owner
	})
})

export default app
