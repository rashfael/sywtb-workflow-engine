<script setup lang="ts">
import { login } from '~/api/auth'
import router from '~/router'

let email = $ref('')
let password = $ref('')

let loggingIn = $ref(false)
let error = $ref<string | null>(null)
async function handleSubmit () {
	try {
		loggingIn = true
		await login(email, password)
		router.replace('/')
	} catch (err) {
		error = err.message
	} finally {
		loggingIn = false
	}
}

</script>
<template lang="pug">
.v-login
	form(@submit.prevent="handleSubmit")
		bunt-input(v-model="email", label="Email")
		bunt-input(v-model="password", label="Password", type="password")
		bunt-button(type="submit", :loading="loggingIn", :errorMessage="error") Login
</template>
<style lang="sass">
.v-login
	flex: auto
	display: flex
	justify-content: center
	align-items: center

	form
		display: flex
		flex-direction: column
		gap: 1rem
		width: 240px
</style>
