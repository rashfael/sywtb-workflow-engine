<script setup>
import authApi from '~/api/auth'

let user = $ref(null)

;(async function () {
	user = await authApi.get('me').json()
})()
</script>
<template lang="pug">
h1 Hi {{ user.sub }}!
h2 Welcome to the SYWTB Workflow Engine Editor
</template>
<style lang="sass">
</style>
