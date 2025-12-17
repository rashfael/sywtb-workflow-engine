# Order of Operations 

Even with design and architecture figured out, you are still faced with a big choice when starting an new project:

> In which order do I build the different components of my system?
>
> <cite>– everyone, hopefully</cite>

Instead of going into full detail in one component, I like to get all parts figured out and connected early on, even if I need to simplify some features. By doing this, I can see the technical challenges in certain corners that might impact other components (usually some backend limitation that means that the UI can't just have a "make it all work" button). I then add features and maybe even rewrite large parts of the system if needed later.

With setup and some boilerplate out of the way, here's the plan on how to get a minimal working version going:

1. Build the collaborative editor:
	- Create a Loro WebSocket server to store workflow config and connect a frontend to it.
	- Add basic code editing by using Monaco.
2. Build the workflow execution backend:
	- Compile the loro workflow definition to wasm.
	- Load and execute wasm and give the workflow guest a host api to call webhooks for example.
	- Add a simple public API endpoint to trigger workflow runs.

What I am going to skip in the first version:

- No-code graph editor. Instead, each workflow will be one big blob of code.
- Any form of workflow observability. Did it run or error? Who knows!
- Browser preview. (But still design the wasm sandbox to be usable in the browser later.)
