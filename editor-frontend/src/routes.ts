// separate file so router.ts can be imported without circular dependencies inside components

export default [{
	path: '/',
	component: () => import('~/App.vue')
}]
