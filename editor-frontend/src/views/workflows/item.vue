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

import { createWorkflowsApi } from '~/api/workflows'

const workflowsApi = createWorkflowsApi()
workflowsApi.workflows.socket(workflowId)

const editorOptions = {
	language: 'typescript',
	theme: 'vs-dark'
}
</script>
<template lang="pug">
.v-workflow
	LoroMonacoEditor(:text="workflowStore.doc.getText('config.ts')" :editorOptions="editorOptions")
</template>
<style lang="sass">
.v-workflow
	flex: auto
	display: flex
	flex-direction: column
	padding: 16px
	width: 100%
</style>
