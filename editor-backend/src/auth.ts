import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { Hono } from 'hono'
import { sign, jwt } from 'hono/jwt'
import { HTTPException } from 'hono/http-exception'

import { mongodb } from '~/mongodb'

const app = new Hono()

export const JWT_SECRET = process.env.JWT_SECRET || 'totally random secret key do not steal'

export interface BaseJWTPayload {
	sub: string
	exp: number
}

export type GlobalJWTPayload = BaseJWTPayload

export interface WorkflowJWTPayload extends BaseJWTPayload {
	workflowId: string
}

export interface LoroJWTPayload extends BaseJWTPayload {
	path: string
}

export type JWTPayload = GlobalJWTPayload | WorkflowJWTPayload | LoroJWTPayload

export const authMiddleware = jwt({
	secret: JWT_SECRET,
	alg: 'HS256'
})

export function verifyWorkflowToken (jwtPayload: JWTPayload, workflowId: string): WorkflowJWTPayload {
	if (!('workflowId' in jwtPayload)) throw new HTTPException(403, { message: 'Must use workflow token' })
	if (jwtPayload.workflowId !== workflowId) throw new HTTPException(403, { message: 'Token does not match workflow' })
	return jwtPayload
}

export function verifyLoroToken (jwtPayload: JWTPayload, expectedPath: string): LoroJWTPayload {
	if (!('path' in jwtPayload)) throw new HTTPException(403, { message: 'Must use loro token' })
	if (jwtPayload.path !== expectedPath) throw new HTTPException(403, { message: 'Token does not match document path' })
	return jwtPayload
}

export async function createLoroToken (workflowPayload: WorkflowJWTPayload, path: string): Promise<string> {
	return await sign({
		sub: workflowPayload.sub,
		path,
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2 // 2 hour expiration
	} satisfies LoroJWTPayload, JWT_SECRET)
}

app.post('/login', async ({ req, json }) => {
	const { email, password } = await req.json()

	const user = await mongodb.users.findOne({ email })

	if (!user) {
		// just create user if they don't exist
		const passwordHash = await hashPassword(password)
		await mongodb.users.insertOne({
			email,
			passwordHash
		})
	} else {
		const isValid = await verifyPassword(password, user.passwordHash)
		if (!isValid) {
			return json({ message: 'Invalid credentials' }, 401)
		}
	}

	return json({
		token: await sign({
			sub: email,
			exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 // 12 hour expiration
		} satisfies GlobalJWTPayload, JWT_SECRET)
	})
})

app.post('/tokens/workflow/:workflowId', authMiddleware, async ({ req, json, var: { jwtPayload } }) => {
	const payload = jwtPayload as JWTPayload
	if ('workflowId' in payload || 'path' in payload) throw new HTTPException(403, { message: 'Must use global token to exchange for workflow token' })

	const workflowId = req.param('workflowId')
	const workflow = await mongodb.workflows.findOne({
		_id: workflowId,
		owner: payload.sub
	})
	if (!workflow) throw new HTTPException(404, { message: 'Workflow not found or access denied' })

	const token = await sign({
		sub: payload.sub,
		workflowId,
		exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4 // 4 hour expiration
	} satisfies WorkflowJWTPayload, JWT_SECRET)

	return json({
		token
	})
})

app.get('/me', authMiddleware, async ({ json, var: { jwtPayload } }) => {
	return json(jwtPayload)
})

export default app

// PASSWORD HELPERS

// using argon2id as per current OWASP recommendation
const argon2 = promisify(crypto.argon2)

const argon2params = {
	parallelism: 4,
	tagLength: 64,
	memory: 65536,
	passes: 3
}

async function hashPassword (password: string): Promise<string> {
	const nonce = crypto.randomBytes(16)
	const hash = await argon2('argon2id', {
		message: password,
		nonce,
		...argon2params
	})
	return `${nonce.toString('base64')}$${hash.toString('base64')}`
}

async function verifyPassword (password: string, storedHash: string): Promise<boolean> {
	const [nonceB64, hashB64] = storedHash.split('$')
	const nonce = Buffer.from(nonceB64, 'base64')
	const expectedHash = Buffer.from(hashB64, 'base64')
	const hash = await argon2('argon2id', {
		message: password,
		nonce,
		...argon2params
	})
	return crypto.timingSafeEqual(hash, expectedHash)
}
