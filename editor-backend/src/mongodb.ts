import { MongoClient } from 'mongodb'

const db = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017').db('sywtb-workflow-engine')

type User = {
	email: string,
	passwordHash: string
}

export const mongodb = {
	...db,
	users: db.collection<User>('users')
}
