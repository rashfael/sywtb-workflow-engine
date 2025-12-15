<script setup lang="ts">
import globalStore from '~/store/global'
</script>
<template lang="pug">
.v-root
	bunt-button(:to="{ name: 'workflows:create'}") Create Workflow
	bunt-scrollbars(y).workflows
		router-link.workflow(v-for="workflow in globalStore.workflows" :key="workflow._id", :to="{ name: 'workflow', params: { workflowId: workflow._id }}") {{ workflow.label }}
</template>
<style lang="sass">
.v-root
	flex: auto
	display: flex
	flex-direction: column
	padding: 16px
	width: 360px
	gap: 16px
	.workflows
		.workflow
			display: flex
			align-items: center
			height: 48px
			padding: 0 8px
			// line-height: 36px
			font-size: 18px
			font-weight: 500
			border: var(--border-separator)
			border-radius: 4px
			&:hover
				background-color: var(--clr-background-hover)
</style>
