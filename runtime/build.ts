import fs from 'fs/promises'
import path from 'path'
import * as jco from '@bytecodealliance/jco'
import { componentize } from '@bytecodealliance/componentize-js'
const { component } = await componentize(`
export async function run (ctx, payload) {
	// stub
}
`,
// @ts-ignore
{
	witPath: path.join(import.meta.dirname, './runtime.wit'),
})

await fs.writeFile(path.join(import.meta.dirname, './dist/workflow.component.wasm'), component)

const transpileResult = await jco.transpile(component, {
	name: 'workflow',
	instantiation: 'async',
	namespacedExports: false,
	outDir: path.join(import.meta.dirname, './dist/'),
	asyncMode: 'jspi',
	asyncExports: ['run']
})

for (const [name, content] of Object.entries(transpileResult.files)) {
	await fs.mkdir(path.dirname(name), { recursive: true })
	await fs.writeFile(name, content as Uint8Array)
}
