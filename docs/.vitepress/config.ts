import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'SYWTB a Workflow Engine',
	description: 'So You Want To Build A Workflow Engine',
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: 'Intro', link: '/chapter-0/0-intro' },
		],

		sidebar: [
			{
				text: 'Chapter 0',
				items: [
					{ text: 'Intro', link: '/chapter-0/0-intro' },
					{ text: 'Setup', link: '/chapter-0/1-setup' },
					{ text: 'Boilerplate', link: '/chapter-0/2-boilerplate' }
				]
			},
			{
				text: 'Chapter 1',
				items: [
					{ text: 'Order of Operations', link: '/chapter-1/0-order-of-operations' },
					{ text: 'Collaborative Editing', link: '/chapter-1/1-collaborative-editing' }
				]
			}
		],

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/rashfael/sywtb-workflow-engine' },
			{ icon: 'mastodon', link: 'https://chaos.social/@rash' },
			{ icon: 'linkedin', link: 'https://www.linkedin.com/in/rash-codes/' }
		]
	}
})
