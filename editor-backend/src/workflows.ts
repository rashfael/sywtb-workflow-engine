import { Hono } from 'hono'
import { authMiddleware } from '~/auth.js'
import { mongodb } from '~/mongodb.js'

const app = new Hono()

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
