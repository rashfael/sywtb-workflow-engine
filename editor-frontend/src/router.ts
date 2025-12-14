import { createRouter, createWebHistory } from 'vue-router'
import { token } from '~/api/auth'
let router = null
export { router as default }

export function initRouter (routes) {
	router = createRouter({
		history: createWebHistory(import.meta.env.BASE_URL),
		routes
	})

	router.beforeEach((to, _from, next) => {
		const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
		const isAuthenticated = !!token

		if (requiresAuth && !isAuthenticated) {
			next('/login')
		} else {
			next()
		}
	})
}
