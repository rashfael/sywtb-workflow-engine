# frozen_string_literal: true

require_relative "../websocket/base"

# WebSocket handler for workflow editing
# This matches the Node.js workflows WebSocket implementation
module WorkflowWebSocket
  def self.app
    WebSocket::App.new(path_pattern: %r{^/workflows/ws/(?<workflow_id>[^/]+)$}) do |room|
      room.on_client_connect do |client|
        client.on_auth do |payload|
          Console.logger.info(self) do
            "WebSocket connection authorized for #{payload[:sub]} on workflow #{room.params[:workflow_id]}"
          end
        end
      end

      room.on_teardown do
        Console.logger.info(self) { "Workflow room #{room.params[:workflow_id]} closed" }
      end
    end
  end
end
