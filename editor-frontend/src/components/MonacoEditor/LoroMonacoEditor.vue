<script setup lang="ts">
import { inject, onMounted, onBeforeUnmount } from 'vue'
import './workerLoader'
import * as monaco from 'monaco-editor'
import { LoroDoc, LoroText, type Subscription } from 'loro-crdt'
import { createReentrancyGuard } from '~/lib/locking'

const { text, editorOptions } = defineProps<{
	text: LoroText,
	editorOptions: monaco.editor.IStandaloneEditorConstructionOptions
}>()

const doc = inject<LoroDoc>('loroDoc')

const editorEl = $ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | undefined
let loroSubscription: Subscription | undefined
let monacoDisposable: monaco.IDisposable | undefined

const reentrancyGuard = createReentrancyGuard()

onMounted(() => {
	if (!editorEl) return

	editor = monaco.editor.create(
		editorEl, {
			value: text.toString(),
			...editorOptions
		})

	// loro => monaco
	loroSubscription = text.subscribe(reentrancyGuard((event) => {
		if (!editor) return
		const model = editor.getModel()

		for (const { diff } of event.events) {
			if (diff.type !== 'text') continue

			let offset = 0
			for (const op of diff.diff) {
				if (op.retain !== undefined) {
					offset += op.retain
				} else if (op.insert !== undefined) {
					const pos = model.getPositionAt(offset)
					model.applyEdits([{
						range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
						text: op.insert
					}])
					offset += op.insert.length
				} else if (op.delete !== undefined) {
					const startPos = model.getPositionAt(offset)
					const endPos = model.getPositionAt(offset + op.delete)
					model.applyEdits([{
						range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
						text: ''
					}])
				}
			}
		}
	}))

	// monaco => loro
	monacoDisposable = editor.onDidChangeModelContent(reentrancyGuard((event) => {
		if (!doc) return
		for (const change of event.changes) {
			const startOffset = change.rangeOffset
			const deleteLength = change.rangeLength

			if (deleteLength > 0) {
				text.delete(startOffset, deleteLength)
			}
			if (change.text.length > 0) {
				text.insert(startOffset, change.text)
			}
		}

		doc.commit()
	}))
})

onBeforeUnmount(() => {
	loroSubscription?.()
	monacoDisposable?.dispose()
	editor?.dispose()
})
</script>
<template lang="pug">
.c-monaco-editor(ref="editorEl")
</template>
<style lang="sass">
.c-monaco-editor
	height: 100%
	width: 100%
</style>
