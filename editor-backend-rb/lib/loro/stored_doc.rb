# frozen_string_literal: true

require "fileutils"
require "async"
require "async/barrier"

# Add loro-rb to load path (sibling directory)
LORO_RB_LIB = File.expand_path("../../../loro-rb/lib", __dir__)
$LOAD_PATH.unshift(LORO_RB_LIB) unless $LOAD_PATH.include?(LORO_RB_LIB)

# Try to load the native Loro binding, fall back to mock if not available
begin
  require "loro"
  LORO_NATIVE = true
rescue LoadError => e
  LORO_NATIVE = false
  warn "loro-rb native extension not found (#{e.message}), using mock implementation"
  warn "Build it with: cd loro-rb && rake build"

  # Mock Loro binding
  # This simulates the loro-crdt library interface for development.
  # Build loro-rb native extension for production use.
  module Loro
    class Doc
      attr_reader :data

      def initialize
        @data = "".b
      end

      def import(bytes)
        @data = bytes.dup
      end

      def export_snapshot
        @data.dup
      end

      # Mock version vector (empty)
      def version_vector
        "".b
      end
    end
  end
end

# Persistent Loro document with debounced saving
# Ruby equivalent of the Node.js StoredLoroDoc
class StoredLoroDoc
  STORAGE_BASE_PATH = "./.storage/loroDocs"
  MIN_SAVE_DELAY = 5 # seconds


  # Class-level cache of open documents (shared across all Fibers in the process)
  @open_docs = {}

  class << self
    attr_reader :open_docs

    # Load a document from path, returning shared instance if already loaded
    # @param path [String] the document path
    # @return [StoredLoroDoc]
    def from_path(path)
      return @open_docs[path] if @open_docs.key?(path)

      Console.logger.info(self) { "Loading StoredLoroDoc for #{path}" }
      doc = new(path)
      doc.load
      @open_docs[path] = doc
      doc
    end
  end

  attr_reader :doc, :path

  def initialize(path)
    @path = path
    @doc = Loro::Doc.new
    @dirty = false
    @saving = false
    @last_saved_at = 0
    @save_scheduled = false
    @mutex = Mutex.new
  end

  # Load document from disk
  def load
    filepath = "#{STORAGE_BASE_PATH}/#{@path}.loro"
    return unless File.exist?(filepath)

    data = File.binread(filepath)
    @doc.import(data)
  rescue StandardError => e
    Console.logger.warn(self) { "Failed to load document #{@path}: #{e.message}" }
  end

  # Save document to disk with debouncing
  def save
    @mutex.synchronize do
      now = Time.now.to_f

      # Debounce: if we saved recently, schedule a save for later
      if @last_saved_at + MIN_SAVE_DELAY > now
        schedule_save unless @save_scheduled
        return
      end

      return unless @dirty

      perform_save
    end
  end

  # Apply an update to the document
  def update(update_data)
    @dirty = true
    @doc.import(update_data)
    save
  end

  # Get a snapshot of the document
  def snapshot
    @doc.export_snapshot
  end

  # Cleanup when room closes
  def destroy
    Console.logger.info(self) { "Destroying StoredLoroDoc for #{@path}" }
    self.class.open_docs.delete(@path)
    save # Final save
  end

  private

  def schedule_save
    @save_scheduled = true
    delay = MIN_SAVE_DELAY - (Time.now.to_f - @last_saved_at)

    # Use Async for non-blocking sleep
    Async do
      sleep(delay)
      @mutex.synchronize do
        @save_scheduled = false
        perform_save if @dirty
      end
    end
  end

  def perform_save
    return if @saving
    return unless @dirty

    @saving = true
    begin
      data = @doc.export_snapshot
      @dirty = false
      @last_saved_at = Time.now.to_f

      filepath = "#{STORAGE_BASE_PATH}/#{@path}.loro"
      FileUtils.mkdir_p(File.dirname(filepath))
      File.binwrite(filepath, data)
    ensure
      @saving = false
    end
  end
end
