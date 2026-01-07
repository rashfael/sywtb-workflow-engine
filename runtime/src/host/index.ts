import fs from 'fs/promises'
import path from 'path'
import { WASIShim } from '@bytecodealliance/preview2-shim/instantiation'
import type { VersionedWASIImportObject } from '@bytecodealliance/preview2-shim/instantiation'
import { instantiate } from 'runtime/dist/workflow'

export async function runWorkflow (core: any, payload: any): Promise<any> {
	async function getCoreModule (modulePath: string) {
		if (modulePath === 'workflow.core.wasm') return await WebAssembly.compile(core)
		return await WebAssembly.compile(await fs.readFile(path.join(import.meta.dirname, '../../dist', modulePath)))
	}

	const instance = await instantiate(
		getCoreModule,
		new WASIShim().getImportObject() satisfies VersionedWASIImportObject<'0.2.3'> // idk why the types want versioned but the call itself wants it without
	)
	return await instance.run({ entryPoint: '' }, JSON.stringify(payload))
}
