// separate file so router.ts can be imported without circular dependencies inside components

export default [{
	path: '/',
	component: () => import('~/App.vue'),
	meta: {
		requiresAuth: true
	}
}, {
	path: '/login',
	component: () => import('~/views/login.vue')
}]
