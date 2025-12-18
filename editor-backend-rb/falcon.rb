# frozen_string_literal: true

# Falcon configuration
# See: https://github.com/socketry/falcon

require "falcon/environment/rack"
require "async/container/forked"

# Use a single process to maintain in-memory state sharing
# This is similar to Node.js single-process model
hostname = "localhost"
port = ENV.fetch("PORT", 8788).to_i

load :rack

rack hostname do
  # Single process, multiple fibers
  # This allows in-memory state sharing across all WebSocket connections
  count 1

  endpoint Async::HTTP::Endpoint.parse("http://#{hostname}:#{port}")
end
