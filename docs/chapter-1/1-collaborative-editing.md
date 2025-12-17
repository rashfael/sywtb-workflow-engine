# Collaborative Editing

I want to avoid "save" buttons as much as possible and allow multiple users to edit the same workflow at the same time. To do this, I am going to use Conflict-free Replicated Data Types (CRDTs) via the [Loro](https://loro.dev/) library. Loro has just released their own websocket client/server implementation which I *won't* be using here, since I want to use websockets for other stuff in the future, integrate vue reactivity deeply, and rather share a common implementation between everything. Since Loro operates on binary data, I'm going to use CBOR as the serialization format and build a simple rpc protocol on top of it to send/receive updates.

## A Quick Word on CRDTs

**C**onflict-free **R**eplicated **D**ata **T**ypes are an umbrella term for data structures and algorithms that, for our purposes, allow concurrent changes on data  to always converge to the same state, **without a central authority** (in contrast to **O**perational **T**ransformation, which usually requires a central server to order operations). CRDTs achieve this by ordering events logically with Lamport timestamps and/or version vectors. Operations range from Last-Write-Wins ("Last" in this case just meaning the logical order, not actual temporal order) to making edits to rich text without overwriting content from other clients.

The server we are building does not hold any special authority as far as CRDTs/Loro is concered, it just relays updates and persists the state.


## Using Loro

Using CRDTs with Loro is super simple, with a couple of things that you need to be aware of:

- you always start with a new empty LoroDoc and then sync into it ([more on syncronization in the docs](https://loro.dev/docs/api/js#synchronization))
- Loro wants peerIds, which **need** to be unique per process/client. That means every browser tab needs its own peerId. It's best to just let Loro autogenerate a peerId (which is just random) instead of trying to cleverly reuse peerIds. Changes are linked to peerIds, so we will need to track peerId-user mappings if we want to show who made which change later on.

I'm going start in the frontend and add a store that gets instantiated when the app routes to a workflow and holds the LoroDoc for the workflow. We're going to need multiple workflow stores open at the same time in the future for things like versioning, diffing and such, so I want to avoid global stores from here on out.
Vue does provide (hah) us with a way to easily share that store reference to child components:

```ts
const workflowStore = createWorkflowStore(workflowId)
provide('workflowStore', workflowStore)
```

## Code Editor

For our first "oops all code" editor, I'm adding [Monaco](https://microsoft.github.io/monaco-editor/) as the code editor and build a component that takes a LoroText and keeps the internal monaco model in sync with it.

LoroText provides a `subscribe` method and monaco gives us `onDidChangeModelContent` to listen for changes. We need to add a reentrancy guard though, or updates will just loop indefinitely between the two.

*[See the code for loro and monaco in the frontend.](https://github.com/rashfael/sywtb-workflow-engine/commit/c96521bbfa27558b0e0be65bf55d1f9e2b418e84)*

With this we already have a code editor backed by a CRDT.

Locally, that is. To actually persist the code and share it between clients, we need a server and talk to it via websockets.


## Base Websocket Client & Server

The websocket protocol is pretty straight forward:

```js
One way:
=> [action: string, args: any]
<= [event: string, args: any]

RPC:
=> [action: string, id: number, args: any]
<= ['success', id: number, result: any]
or
<= ['error', id: number, error: string]

initial auth:
=> ['auth', id: number, token: string]

Keepalive:
=> ['ping', timestamp: number]
<= ['pong', timestamp: number]
```

*[Here's the implementation](https://github.com/rashfael/sywtb-workflow-engine/commit/54c603a3e7261a29b6244e9eeba9803a10dce637)*

I'm also adding url-based room support so that the server can broadcast messages inside the same workflow and save state per workflow, for example an open LoroDoc that I'm going to add next.
I'm going to be a bit non-traditional here and do this by nesting closures, so we get something like this as an API:

```ts
createWebSocketApp('/some-path/:withDynamicPart', (room) => {
	// setup room here
	return {
		roomTeardown () {
			// cleanup room here
		},
		onClientConnect (client) {
			// setup client here
			return {
				onAuth,
				onClose,
				actions: {
					someAction (args) {
						// handle action here
					}
				}
			}
	}
})
```

Just as I started to use the base websocket app with loro I noticed that I need room support, so I [added that real quick](https://github.com/rashfael/sywtb-workflow-engine/commit/1ede1ff08da7578aea0ea30c45c7ae19a1e73912)


## Syncing Loro over Websockets

To get the stored doc from the server, we need to open a socket in the frontend and initiate a handshake, requesting a loro snapshot. For now we won't store already loaded data in the frontend, but in the future we can only request updates from a certain point on and send updates that the client did locally (maybe because a user just went through a tunnel).

Loro also provides us with a handy `subscribeLocalUpdates` so we can send updates to the server, which then broadcasts them to all other clients.

```ts
// Client

// wire up local edits to server
doc.subscribeLocalUpdates((update) => {
	this.call('update', update)
})

// do an initial sync
doc.import(await this.call('getSnapshot'))

// and apply server updates to local doc
doc.import(update)
```

The server is a bit more involved, since it needs to track multiple clients and do periodic saving and avoiding race conditions. See the [full code for details](https://github.com/rashfael/sywtb-workflow-engine/commit/38b35256a9efa7c61ee85b31872a3016d55201e5)

::: warning No Papers, please!

I'm going to be lazy here and skip authorization for websockets for now, meaning that every user can edit every workflow, because we're going to add some namespacing and rights managment later, which I want to do with fine-grained JWTs.

:::

<video src="./1-multiplayer.webm" autoplay nocontrols></video>

