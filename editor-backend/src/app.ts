// We need to put the hono app into a separate module to avoid circular dependency hell. baseWebSocketApp needs the root app BEFORE other subapps
import { Hono } from 'hono'

// we need to be non-strict for subapp / to route for some reason, investigate later
export default new Hono({ strict: false })
