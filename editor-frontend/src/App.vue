<script setup>
import globalStore, { initGlobalStore } from '~/stores/global'

;(async function () {
	initGlobalStore()
	await globalStore.fetchUser()
	await globalStore.fetchWorkflows()
})()
</script>
<template lang="pug">
router-view(v-if="globalStore.workflows")
bunt-progress-circular(v-else)
</template>
<style lang="sass">
</style>
