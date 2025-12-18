# Editor Backend Ruby

A Ruby implementation of the editor backend using Falcon (async) and Roda.

## Technology Stack

- **Falcon** - Async HTTP/WebSocket server using Ruby Fibers
- **Roda** - Lightweight, fast routing tree web toolkit
- **ActiveRecord** - ORM (standalone, no Rails)
- **PostgreSQL** - Database
- **async-websocket** - Async WebSocket support
- **JWT** - Authentication tokens
- **Argon2** - Password hashing

## Architecture Notes

This implementation uses Ruby's `async` gem and Falcon server to achieve Node.js-like
single-process concurrency using Fibers. This means:

- **No Redis needed** for WebSocket state sharing
- **In-memory state** works across all connections
- **Cooperative concurrency** via Fibers (similar to async/await)

## Setup

```bash
# Install dependencies
bundle install

# Create database
createdb sywtb_workflow_engine_development

# Run migrations
bundle exec rake db:migrate

# Start server
bundle exec falcon serve --bind http://localhost:8788
```

## Project Structure

```
lib/
├── app.rb              # Main Roda application
├── config/
│   └── database.rb     # ActiveRecord setup
├── models/
│   ├── user.rb
│   └── workflow.rb
├── routes/
│   ├── auth.rb         # /auth routes
│   └── workflows.rb    # /workflows routes
├── websocket/
│   ├── base.rb         # WebSocket app factory
│   └── rooms.rb        # Room management
└── loro/
    ├── app.rb          # Loro WebSocket handler
    └── stored_doc.rb   # StoredLoroDoc equivalent
```
