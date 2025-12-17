import fs from 'fs/promises'
import path from 'path'
import { LoroDoc } from 'loro-crdt'

const STORAGE_BASE_PATH = './.storage/loroDocs'
const MIN_SAVE_DELAY = 5000 // only save at most once every 5s

const openDocs = new Map<string, StoredLoroDoc>()

export default class StoredLoroDoc {
	doc: LoroDoc = new LoroDoc()
	path: string

	constructor (path: string) {
		this.path = path
	}

	// Promise that tracks loading to avoid loading while already loading
	#eventuallyLoaded: Promise<void> | undefined

	/**
	 * Loads the document from disk if not already loaded.
	 */
	load () {
		if (this.#eventuallyLoaded) return this.#eventuallyLoaded

		this.#eventuallyLoaded = (async () => {
			const data = await fs.readFile(`${STORAGE_BASE_PATH}/${this.path}.loro`).catch(() => null)
			// not having a file is fine, it just means a fresh doc
			if (data) this.doc.import(new Uint8Array(data))
		})()
	}

	#dirty = false
	#savingLock: Promise<void> | null = null
	#lastSavedAt: number = 0
	#saveQueued = false

	/**
	 * Saves the document to disk and debounces frequent saves.
	 * @returns {Promise<void>}
	 */
	async save () {
		if (this.#lastSavedAt + MIN_SAVE_DELAY > Date.now()) {
			// schedule a save for later, but only once
			if (this.#saveQueued) return
			this.#saveQueued = true
			setTimeout(() => {
				this.#saveQueued = false
				this.save()
			}, MIN_SAVE_DELAY - (Date.now() - this.#lastSavedAt))
			return
		}
		if (this.#savingLock) await this.#savingLock
		if (!this.#dirty) return
		const { promise, resolve: unlock } = Promise.withResolvers<void>()
		this.#savingLock = promise

		try {
			const data = this.doc.export({ mode: 'snapshot' })
			this.#dirty = false
			this.#lastSavedAt = Date.now()
			// TODO compression?
			const filepath = `${STORAGE_BASE_PATH}/${this.path}.loro`
			await fs.mkdir(path.dirname(filepath), { recursive: true })
			await fs.writeFile(filepath, data)
		} finally {
			unlock()
			this.#savingLock = null
		}
	}

	update (update: any) {
		this.#dirty = true
		this.doc.import(update)
		this.save()
	}

	getSnapshot () {
		return this.doc.export({ mode: 'snapshot' })
	}

	destroy () {
		console.log('Destroying StoredLoroDoc for', this.path)
		openDocs.delete(this.path)
		this.save()
	}

	/**
	 * Loads a Loro document from the filesystem at the given path.
	 * Returns a shared instance if already loaded.
	 * @param path
	 * @returns {Promise<StoredLoroDoc>}
	 */
	static async fromPath (path: string): Promise<StoredLoroDoc> {
		if (openDocs.has(path)) return openDocs.get(path)
		console.log('Loading StoredLoroDoc for', path)
		const storedDoc = new StoredLoroDoc(path)
		await storedDoc.load()
		openDocs.set(path, storedDoc)
		return storedDoc
	}
}
