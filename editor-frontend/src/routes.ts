// separate file so router.ts can be imported without circular dependencies inside components

export default [{
	path: '/login',
	name: 'login',
	component: () => import('~/views/login.vue')
}, {
	path: '/',
	component: () => import('~/App.vue'),
	meta: {
		requiresAuth: true
	},
	children: [{
		path: '',
		component: () => import('~/views/index.vue')
	}, {
		path: '/workflows/create',
		name: 'workflows:create',
		component: () => import('~/views/workflows/create.vue')
	}, {
		path: '/workflows/:workflowId',
		name: 'workflow',
		component: () => import('~/views/workflows/item.vue'),
		props: true
	}]
}]
