<script setup lang="ts">
import { watchEffect } from 'vue'
import router from '~/router'
import globalStore from '~/stores/global'
let label = $ref('')
let id = $ref('')

// autogenerate id from label
watchEffect(() => {
	id = label
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
})

async function handleSubmit () {
	await globalStore.createWorkflow({ label, _id: id })
	router.push({ name: 'workflow', params: { workflowId: id } })
}

</script>
<template lang="pug">
.v-workflows-create
	h1 Create Workflow
	form(@submit.prevent="handleSubmit")
		bunt-input(v-model="label", label="Workflow Label")
		bunt-input(v-model="id", label="Workflow ID")
		bunt-button(type="submit") Create
</template>
<style lang="sass">
.v-workflows-create
	flex: auto
	display: flex
	flex-direction: column
	padding: 16px

	form
		display: flex
		flex-direction: column
		width: 360px
</style>
