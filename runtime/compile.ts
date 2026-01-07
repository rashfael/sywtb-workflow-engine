import * as path from 'path'
import * as jco from '@bytecodealliance/jco'
import { componentize } from '@bytecodealliance/componentize-js'

export async function compileWorkflow (workflowSource: string) {
	// @ts-ignore
	const { component } = await componentize(workflowSource, {
		witPath: path.join(import.meta.dirname, './runtime.wit')
	})

	const { files } = await jco.transpile(component, {
		name: 'workflow',
		instantiation: 'async',
		namespacedExports: false,
		asyncMode: 'jspi',
		asyncExports: ['run']
	})

	return files['workflow.core.wasm']
}
