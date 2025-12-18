# frozen_string_literal: true

# This file is just a stub to satisfy bundler's native extension system.
# The actual build happens through Cargo via the Rakefile.

require "mkmf"

# Create a dummy Makefile that just calls our Rake task
File.write("Makefile", <<~MAKEFILE)
  all:
  \t@echo "Building loro-rb native extension via Cargo..."
  \tcd #{File.dirname(__FILE__)}/../.. && cargo build --release
  \t@echo "Done"

  install:
  \t@echo "Installing loro-rb..."

  clean:
  \t@echo "Cleaning..."
MAKEFILE
