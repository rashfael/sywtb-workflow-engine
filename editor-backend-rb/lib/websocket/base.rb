# frozen_string_literal: true

require "async"
require "async/websocket/adapters/rack"
require "cbor"
require_relative "../auth/helpers"

# WebSocket App Factory
#
# Creates a Rack app with WebSocket support using CBOR encoding.
# JWT verification is handled automatically - on_auth receives the verified payload.
#
# This is the Ruby equivalent of the Node.js createWebSocketApp, using Ruby's
# async gem for cooperative concurrency (similar to Node's event loop).
#
# @example
#   app = WebSocket::App.new(path_pattern: %r{^/ws/(?<doc_id>[^/]+)$}) do |room|
#     # Setup room-level state here
#     doc_state = {}
#
#     room.on_teardown do
#       # Cleanup room when last client disconnects
#       doc_state.clear
#     end
#
#     room.on_client_connect do |client|
#       user_id = nil
#
#       client.on_auth do |payload|
#         user_id = payload[:sub]
#       end
#
#       client.on_close do
#         puts "User #{user_id} disconnected"
#       end
#
#       client.action(:save_document) do |content|
#         save_to_db(content)
#         client.broadcast_others(:document_updated, content)
#         { saved: true }
#       end
#
#       client.action(:notify_all) do |message|
#         room.broadcast(:notification, message)
#       end
#     end
#   end
#
module WebSocket
  # Represents a room that groups WebSocket connections by URL
  class Room
    attr_reader :url, :params, :clients

    def initialize(url, params)
      @url = url
      @params = params
      @clients = {}
      @teardown_callback = nil
      @client_connect_callback = nil
    end

    # Register callback for room teardown (when last client disconnects)
    def on_teardown(&block)
      @teardown_callback = block
    end

    # Register callback for new client connections
    def on_client_connect(&block)
      @client_connect_callback = block
    end

    # Send message to all clients in the room
    def broadcast(action, *args)
      @clients.each_value do |client|
        client.send_message(action, *args)
      end
    end

    # Called internally when a new client connects
    def handle_client_connect(client)
      @clients[client.object_id] = client
      Console.logger.info(self) { "Client connected, room now has #{@clients.size} clients" }
      @client_connect_callback&.call(client)
    end

    # Called internally when a client disconnects
    def handle_client_disconnect(client)
      @clients.delete(client.object_id)
      @teardown_callback&.call if @clients.empty?
      @clients.empty?
    end
  end

  # Represents a single WebSocket client connection
  class Client
    attr_reader :connection, :room, :request_env

    def initialize(connection, room, request_env)
      @connection = connection
      @room = room
      @request_env = request_env
      @actions = {}
      @before_auth_callback = nil
      @auth_callback = nil
      @after_auth_callback = nil
      @close_callback = nil
      @error_callback = nil
      @authenticated = false
    end

    # Register a callback to run before auth
    def on_before_auth(&block)
      @before_auth_callback = block
    end

    # Register a callback for auth (receives JWT payload)
    def on_auth(&block)
      @auth_callback = block
    end

    # Register a callback to run after successful auth
    def on_after_auth(&block)
      @after_auth_callback = block
    end

    # Register a callback for connection close
    def on_close(&block)
      @close_callback = block
    end

    # Register a callback for errors
    def on_error(&block)
      @error_callback = block
    end

    # Register an action handler
    def action(name, &block)
      @actions[name.to_s] = block
    end

    # Send a message to this client only
    def send_message(action, *args)
      data = CBOR.encode([action.to_s, *args])
      @connection.send_binary(data)
      @connection.flush
    rescue StandardError => e
      handle_error(e)
    end

    # Send to all clients in the room except this one
    def broadcast_others(action, *args)
      Console.logger.info(self) { "Broadcasting #{action} to #{@room.clients.size - 1} other clients" }
      @room.clients.each do |id, client|
        unless id == object_id
          Console.logger.debug(self) { "Sending to client #{id}" }
          client.send_message(action, *args)
        end
      end
    end

    # Process incoming message
    def handle_message(data)
      message = CBOR.decode(data)
      action = message.shift.to_s

      case action
      when "ping"
        send_message("pong", message[0])
      when "auth"
        handle_auth(message)
      else
        handle_action(action, message)
      end
    rescue StandardError => e
      handle_error(e)
    end

    # Handle connection close
    def handle_close
      @close_callback&.call
    end

    # Handle errors
    def handle_error(error)
      @error_callback&.call(error) if @error_callback
      Console.logger.error(self) { error }
    end

    private

    def handle_auth(message)
      request_id, args = message
      token = args["token"] || args[:token]

      begin
        @before_auth_callback&.call(token)

        # Verify JWT
        payload = Auth.verify_token(token)

        # Let instance do additional authorization
        @auth_callback&.call(payload)
        @after_auth_callback&.call

        @authenticated = true
        send_message("success", request_id, { authenticated: true })
      rescue StandardError => e
        error_message = e.message || "Authentication failed"
        send_message("error", request_id, error_message)
        @connection.close
      end
    end

    def handle_action(action, message)
      request_id, *args = message
      handler = @actions[action]

      unless handler
        send_message("error", request_id, "Unknown action: #{action}")
        return
      end

      begin
        result = handler.call(*args)
        send_message("success", request_id, result)
      rescue StandardError => e
        error_message = e.message || "Action failed"
        send_message("error", request_id, error_message)
        handle_error(e)
      end
    end
  end

  # The main WebSocket Rack application
  class App
    def initialize(path_pattern:, &room_setup)
      @path_pattern = path_pattern
      @room_setup = room_setup
      @rooms = {}
    end

    def call(env)
      # Check if this is a WebSocket upgrade request
      return not_found_response unless Async::WebSocket::Adapters::Rack.websocket?(env)

      # Match the path pattern
      path = env["PATH_INFO"]
      match = @path_pattern.match(path)
      return not_found_response unless match

      # Extract named captures as params
      params = match.named_captures.transform_keys(&:to_sym)

      # Handle the WebSocket connection
      Async::WebSocket::Adapters::Rack.open(env, protocols: ["cbor"]) do |connection|
        handle_connection(env, connection, path, params)
      end
    end

    private

    def handle_connection(env, connection, url, params)
      room = get_or_create_room(url, params)
      client = Client.new(connection, room, env)
      room.handle_client_connect(client)

      # Read messages in a loop using Fibers (async)
      while (message = connection.read)
        # async-websocket returns message objects, extract the data
        data = message.respond_to?(:buffer) ? message.buffer : message.to_s
        client.handle_message(data)
      end
    rescue StandardError => e
      client&.handle_error(e)
    ensure
      # Client disconnected
      client&.handle_close
      cleanup_room(url) if room&.handle_client_disconnect(client)
    end

    def get_or_create_room(url, params)
      Console.logger.info(self) { "get_or_create_room: url=#{url}, existing_rooms=#{@rooms.keys}" }
      @rooms[url] ||= begin
        Console.logger.info(self) { "Creating new room for #{url}" }
        room = Room.new(url, params)
        @room_setup.call(room)
        room
      end
    end

    def cleanup_room(url)
      @rooms.delete(url)
    end

    def not_found_response
      [404, { "Content-Type" => "text/plain" }, ["Not Found"]]
    end
  end
end
