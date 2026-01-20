import * as restate from '@restatedev/restate-sdk'
import { workflowWorkflow, workflowWrapperService } from './workflow'

import './public-api'

const port = await restate.serve({
	services: [
		workflowWorkflow,
		workflowWrapperService
	]
})

console.log(`Restate Services running on http://localhost:${port}`)
