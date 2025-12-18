# frozen_string_literal: true

require "rack"
require "rack/cors"
require "dotenv"

# Load environment variables
Dotenv.load

# Load database configuration
require_relative "config/database"

# Load models
require_relative "models/user"
require_relative "models/workflow"

# Load routes
require_relative "routes/auth"
require_relative "routes/workflows"
require_relative "routes/workflows_ws"
require_relative "loro/app"

# Main application that combines all routes
class App
  def initialize
    @auth_app = AuthRoutes.app
    @workflows_app = WorkflowRoutes.app
    @workflows_ws_app = WorkflowWebSocket.app
    @loro_app = LoroWebSocket.app
  end

  def call(env)
    path = env["PATH_INFO"]

    # Route to appropriate sub-application
    case path
    when %r{^/auth}
      # Strip /auth prefix for the auth app
      env["PATH_INFO"] = path.sub(%r{^/auth}, "")
      env["PATH_INFO"] = "/" if env["PATH_INFO"].empty?
      @auth_app.call(env)
    when %r{^/workflows/ws/}
      # WebSocket connections for workflows
      @workflows_ws_app.call(env)
    when %r{^/workflows}
      # Strip /workflows prefix
      env["PATH_INFO"] = path.sub(%r{^/workflows}, "")
      env["PATH_INFO"] = "/" if env["PATH_INFO"].empty?
      @workflows_app.call(env)
    when %r{^/loro/}
      # Loro document sync WebSocket
      @loro_app.call(env)
    else
      [404, { "Content-Type" => "application/json" }, ['{"error": "Not Found"}']]
    end
  end
end

# Build the Rack application with middleware
RackApp = Rack::Builder.new do
  # Enable CORS
  use Rack::Cors do
    allow do
      origins "*"
      resource "*",
        headers: :any,
        methods: %i[get post put patch delete options head]
    end
  end

  # Request logging
  use Rack::CommonLogger

  # Run our app
  run App.new
end

# Export for config.ru
app = RackApp
