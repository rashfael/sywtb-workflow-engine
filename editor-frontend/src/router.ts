import { createRouter, createWebHistory } from 'vue-router'

let router = null
export { router as default }

export function initRouter (routes) {
	router = createRouter({
		history: createWebHistory(import.meta.env.BASE_URL),
		routes
	})
}
