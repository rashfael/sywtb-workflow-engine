import * as restate from '@restatedev/restate-sdk'

const port = await restate.serve({
	services: []
})

console.log(`Execution Backend running on http://localhost:${port}`)
