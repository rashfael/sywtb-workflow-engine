import fs from 'fs/promises'
import * as restate from '@restatedev/restate-sdk'
import { runWorkflow } from 'runtime/src/host/index'

const STORAGE_BASE_PATH = '../.storage'

const workflowWorkflow = restate.workflow({
	name: 'Workflow',
	handlers: {
		async run (_ctx: restate.WorkflowContext, { workflowId, payload }) {
			const core = await fs.readFile(`${STORAGE_BASE_PATH}/workflows/${workflowId}/workflow.core.wasm`)
			await runWorkflow(core, payload || {})
		}
	}
})

const workflowWrapperService = restate.service({
	name: 'ExecuteWorkflow',
	handlers: {
		execute: async (ctx: restate.Context, { workflowId, payload }) => {
			const key = `${workflowId}/${ctx.rand.uuidv4()}`
			await ctx.workflowSendClient<typeof workflowWorkflow>(workflowWorkflow, key).run({ workflowId, payload })
		},
	},
})

export { workflowWorkflow, workflowWrapperService }
