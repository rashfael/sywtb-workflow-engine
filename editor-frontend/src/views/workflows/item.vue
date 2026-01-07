<script setup lang="ts">
import { provide } from 'vue'
import { createWorkflowStore } from '~/stores/workflow'
import LoroMonacoEditor from '~/components/MonacoEditor/LoroMonacoEditor.vue'

const {
	workflowId
} = defineProps<{
	workflowId: string
}>()

const workflowStore = createWorkflowStore(workflowId)
provide('workflowStore', workflowStore)
provide('loroDoc', workflowStore.doc)

workflowStore.connect()

const editorOptions = {
	language: 'typescript',
	theme: 'vs-dark'
}
</script>
<template lang="pug">
.v-workflow(v-if="workflowStore.isReady")
	.actions
		bunt-button(loading="auto", @click="workflowStore.deploy") Deploy
	LoroMonacoEditor(:text="workflowStore.doc.getText('config.ts')" :editorOptions="editorOptions")
bunt-progress-circular(v-else)
</template>
<style lang="sass">
.v-workflow
	flex: auto
	display: flex
	flex-direction: column
	padding: 16px
	width: 100%
	gap: 8px
</style>
