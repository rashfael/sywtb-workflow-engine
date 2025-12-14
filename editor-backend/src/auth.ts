import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { Hono } from 'hono'
import { sign, jwt } from 'hono/jwt'
import { createMiddleware } from 'hono/factory'

import { mongodb } from '~/mongodb'

const app = new Hono()

const SECRET_KEY = process.env.JWT_SECRET || 'totally random secret key do not steal'

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
		}, SECRET_KEY)
	})
})

export const authMiddleware = jwt({
	secret: SECRET_KEY
})

app.get('/me', authMiddleware, async ({ req, json, var: { jwtPayload } }) => {
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
