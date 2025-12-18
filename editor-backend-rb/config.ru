# frozen_string_literal: true

# Rack configuration file for Falcon
# Run with: bundle exec falcon serve --bind http://localhost:8788

require_relative "lib/app"

run RackApp
