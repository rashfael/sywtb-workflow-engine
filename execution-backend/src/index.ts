import * as restate from '@restatedev/restate-sdk'
import { workflowWorkflow } from './workflow'

const port = await restate.serve({
	services: [
		workflowWorkflow
	]
})

console.log(`Execution Backend running on http://localhost:${port}`)
