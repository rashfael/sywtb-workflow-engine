# So you want to build a Workflow Engine!

After nearly a decade working on low-code platforms, I want to share how I would build a workflow engine from scratch in 2026. I'm going to use some bits of tech I've used in the past that fit very well and some fundamental programminglanguages and tools that are just my personal preference.

I'm not going to write a guide exactly, but rather I'll take you along my journey of building this project. I'll share my thought process, the decisions I make, and the challenges I face along the way. I will of course rely on my experience building similar systems in the past, but everything I do here will be from the ground up if not otherwise stated.

## What is a workflow engine even?

First off, what are we going to build here? I'm not going to define exact terms. Instead, here is what I want to build:

- A tool that allows users to define workflows made up of tasks.
- Each task can perform a specific action, such as sending an email, making an API call, or processing data.
- Each workflows can have multiple entry and exit points, conditional logic, and parallel execution paths.
- The tool should be scalable, reliable, and easy to use.
- I want to be as no-code as possible, but also allow power users to just straight up write code if they want to.

What's that going to look like from the user's perspective?

- A web application where users can manage their workflows.
- A visual editor to design workflows using nodes and connections, because that fits well with an intuitive understanding of "flow".
- Monitoring for running and completed workflows, with logs and introspection.
- An API for triggering workflows.
- No save buttons whenever possible, and multiplayer collaboration.

I'll add a bunch more features as I go along, but that's a good MVP to start with.

## Architecture

::: info Author's note
Usually I would reach for cloud offerings for certain parts of the system for scalability and reliability if I'd build something commercially. However, for this project, I want to have everything self-hosted and running locally.
:::

What do we need to make this happen? We'll need a few key components:

- A single page application for the GUI. We're going to use Vue for this, with my favorite Vue stack.
- A backend that provides the API for the frontend (some people call that a "BFF" or Backend For Frontend). I'm going with node.js to have fullstack JS/TS and because I'll heavily rely on websockets. A eventloop-based runtime is just the best fit for that.
- The workflow execution engine itself. This again will be node.js and I'm picking restate as a durable execution engine, which is going to save us a lot of work around state management, retries, and durability.

Those are the most basic moving parts, but we'll also need a few more things:
- A database to store basic settings and all sorts of low-impact guff. I'll use mongodb, because, hey change streams. Don't run single-node mongodb in production, kids!
- A blob store for workflow configuration, logs and other geneneral objects that don't need to be queried. No clue what to use for that yet, something S3-compatible probably.
- For collaboration and multi-user features, CRDTs are a good pick, in this case loro.
- A sandbox for running user code safely. Wasm is the rising star for this, not only because it can run the browser, but also because it's largely language-agnostic.

::: danger
The code for this project is NOT licensed under an open source license. I just want to show this off and maybe teach some things. I'm not going to maintain any of this or accept bug reports or feature requests. And of course, don't copy any of this code and sell it.
Like what you see? Reach out to me and we can talk about building something together!
:::


