import fs from 'fs/promises'
import path from 'path'

const STORAGE_BASE_PATH = '../.storage'

export async function load (filepath: string): Promise<Uint8Array | null> {
	return await fs.readFile(`${STORAGE_BASE_PATH}/${filepath}`)
}

export async function store (filepath: string, data: Uint8Array): Promise<void> {
	const fullPath = `${STORAGE_BASE_PATH}/${filepath}`
	await fs.mkdir(path.dirname(fullPath), { recursive: true })
	await fs.writeFile(fullPath, data)
}
