#!/usr/bin/env ruby
# frozen_string_literal: true

# Simple startup script
# Usage: bundle exec ruby bin/server.rb

require "bundler/setup"
require_relative "../lib/app"

port = ENV.fetch("PORT", 8788)

puts "Editor Backend Ruby starting on http://localhost:#{port}"
puts "Press Ctrl+C to stop"

# Note: For production, use Falcon directly:
#   bundle exec falcon serve --bind http://localhost:8788 --config falcon.rb
#
# This script is for development convenience

exec("bundle", "exec", "falcon", "serve", "--bind", "http://localhost:#{port}", "--config", "falcon.rb")
