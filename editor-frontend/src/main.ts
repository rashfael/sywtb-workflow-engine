import { createApp } from 'vue'
import { RouterView } from 'vue-router'
import Buntpapier from 'buntpapier'


import router, { initRouter } from '~/router'
import routes from '~/routes'

import '~/styles/main.sass'
import 'buntpapier/style' // load this after main to enforce layer order

import '@fontsource/roboto'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import '@fontsource/roboto/400-italic.css'
import '@fontsource/roboto/700-italic.css'
import '@fontsource/roboto-mono'
import '@mdi/font/css/materialdesignicons.css'

initRouter(routes)

const app = createApp(RouterView)
app.use(router)
app.use(Buntpapier)

window.vapp = app.mount('#app')

if (import.meta.env.DEV) {
	document.documentElement.style.setProperty('--bunt-will-change', 'all')
}
