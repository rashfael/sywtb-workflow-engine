#!/usr/bin/env ruby
# frozen_string_literal: true

# Development server with hot reloading
# Usage: bundle exec ruby bin/dev.rb

require "bundler/setup"

port = ENV.fetch("PORT", 8788)

puts "Starting development server with hot reload on http://localhost:#{port}"
puts "Watching lib/ for changes..."

# Use --count 1 to ensure single process (required for in-memory WebSocket state sharing)
exec(
  "bundle", "exec", "rerun",
  "--dir", "lib,.",
  "--pattern", "**/*.rb",
  "--no-notify",
  "--",
  "falcon", "serve", "--bind", "http://localhost:#{port}", "--count", "1"
)
