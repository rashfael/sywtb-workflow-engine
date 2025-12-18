# frozen_string_literal: true

require_relative "../websocket/base"
require_relative "stored_doc"

# WebSocket handler for Loro document sync
# This matches the Node.js loro/app.ts implementation
module LoroWebSocket
  def self.app
    # Match paths like /loro/workflows/abc123 or /loro/documents/nested/path
    WebSocket::App.new(path_pattern: %r{^/loro/(?<doc_path>.+)$}) do |room|
      # Load the document when room is created
      doc = StoredLoroDoc.from_path(room.params[:doc_path])

      room.on_client_connect do |client|
        client.on_auth do |_payload|
          # TODO: do a key exchange or something
        end

        # Action: apply an update to the document
        client.action(:update) do |update_data|
          # Convert to binary if needed
          binary_data = update_data.is_a?(String) ? update_data.b : update_data.pack("C*")
          doc.update(binary_data)
          client.broadcast_others(:update, update_data)
          nil
        end

        # Action: get full document snapshot (camelCase to match JS client)
        client.action(:getSnapshot) do
          doc.snapshot
        end
      end

      room.on_teardown do
        # TODO: avoid race condition where while destroying, another client connects
        doc.destroy
      end
    end
  end
end
