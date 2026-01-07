/**
 * Single Workflow API
 *
 * This subapp handles operations on a single workflow.
 * All endpoints require a workflow-scoped JWT token.
 */
import { Hono } from 'hono'
import {
	authMiddleware,
	verifyWorkflowToken,
	createLoroToken,
	type JWTPayload,
	type WorkflowJWTPayload
} from '~/auth.js'

const app = new Hono<{
	Variables: {
		jwtPayload: JWTPayload
		workflowId: string
	}
}>()

// All routes require workflow token auth
app.use('*', authMiddleware)

// Verify the workflow token matches the workflowId in the path
app.use('*', async (c, next) => {
	const workflowId = c.req.param('workflowId')
	verifyWorkflowToken(c.var.jwtPayload as JWTPayload, workflowId)
	c.set('workflowId', workflowId)
	await next()
})

app.post('/tokens/loro', async ({ json, var: { jwtPayload, workflowId } }) => {
	const path = `workflows/${workflowId}/workflow`
	const token = await createLoroToken(jwtPayload as WorkflowJWTPayload, path)
	return json({ token })
})

export default app
