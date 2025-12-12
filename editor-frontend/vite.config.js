import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ReactivityTransform from '@vue-macros/reactivity-transform/vite'

export default defineConfig(async ({ mode }) => {
	const config = {
		server: {
			port: 6626,
			fs: {
				strict: !process.env.UNSAFE_FS
			},
			warmup: {
				clientFiles: ['src/main.ts']
			}
		},
		plugins: [
			vue({
				template: {
					preprocessOptions: {
						basedir: path.resolve(__dirname, './src')
					}
				}
			}),
			ReactivityTransform()
		],
		build: {
			target: 'esnext',
		},
		optimizeDeps: {
			entries: [
				'src/main.js'
			]
		},
		resolve: {
			mainFields: ['browser', 'module', 'jsnext:main', 'jsnext'],
			extensions: ['.js', '.ts', '.json', '.vue'],
			alias: [
				{ find: 'lodash', replacement: 'lodash-es' },
				{ find: '~', replacement: path.resolve(__dirname, './src') },
				{ find: 'common', replacement: path.resolve(__dirname, '../common') },
				{ find: 'runtime', replacement: path.resolve(__dirname, '../runtime') },
				{ find: 'definitions', replacement: path.resolve(__dirname, '../definitions') },
			],
		}
	}
	return config
})
