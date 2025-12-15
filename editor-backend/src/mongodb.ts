import { MongoClient } from 'mongodb'

const db = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017').db('sywtb-workflow-engine')

type User = {
	email: string,
	passwordHash: string
}

type Workflow = {
	_id: string,
	label: string,
	owner: string
}

export const mongodb = {
	...db,
	users: db.collection<User>('users'),
	workflows: db.collection<Workflow>('workflows')
}
