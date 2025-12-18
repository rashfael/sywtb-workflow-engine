# loro-rb

Ruby bindings for [Loro CRDT](https://github.com/loro-dev/loro) using [Magnus](https://github.com/matsadler/magnus).

## Building

### Prerequisites

- Rust toolchain (1.70+)
- Ruby 3.0+
- `rb-sys` gem

### Development Build

```bash
cd loro-rb
cargo build --release
```

The compiled library will be in `target/release/`. Copy or symlink it to Ruby's load path:

```bash
# On Linux
cp target/release/libloro_rb.so /path/to/your/project/loro.so

# On macOS
cp target/release/libloro_rb.dylib /path/to/your/project/loro.bundle
```

### Using with Bundler (rb_sys)

Add to your Gemfile:

```ruby
gem 'rb_sys'
```

## Usage

```ruby
require 'loro'

# Create a new document
doc = Loro::Doc.new

# Get a text container
text = doc.get_text("content")
text.insert(0, "Hello, ")
text.insert(7, "World!")
puts text.to_s  # => "Hello, World!"

# Get a map container
map = doc.get_map("metadata")
map.insert_string("title", "My Document")
map.insert_int("version", 1)

# Export snapshot
snapshot = doc.export_snapshot

# Create another document and import
doc2 = Loro::Doc.new
doc2.import(snapshot)

# Export incremental updates
vv = doc.version_vector
# ... make changes ...
updates = doc.export_updates_from(vv)
```

## API

### Loro::Doc

- `Loro::Doc.new` - Create a new document
- `Loro::Doc.new_with_peer_id(peer_id)` - Create with specific peer ID
- `#peer_id` - Get the peer ID
- `#import(bytes)` - Import snapshot or updates
- `#import_batch(array_of_bytes)` - Import multiple updates
- `#export_snapshot` - Export full snapshot
- `#export_updates_from(version_vector_bytes)` - Export updates since version
- `#version_vector` - Get encoded version vector
- `#frontiers` - Get encoded frontiers
- `#commit` - Commit pending changes
- `#get_text(name)` - Get root text container
- `#get_map(name)` - Get root map container
- `#get_list(name)` - Get root list container
- `#to_json` - Get document state as JSON string

### Loro::Text

- `#insert(pos, text)` - Insert text at position
- `#delete(pos, len)` - Delete text
- `#to_s` / `#to_str` - Get content as string
- `#length` - Get length
- `#empty?` - Check if empty

### Loro::Map

- `#insert_string(key, value)` - Insert string
- `#insert_int(key, value)` - Insert integer
- `#insert_float(key, value)` - Insert float
- `#insert_bool(key, value)` - Insert boolean
- `#insert_null(key)` - Insert null
- `#delete(key)` - Delete key
- `#get(key)` / `#[key]` - Get value as JSON string
- `#keys` - Get all keys
- `#length` - Get number of entries
- `#empty?` - Check if empty
- `#get_or_create_map(key)` - Get nested map
- `#get_or_create_list(key)` - Get nested list
- `#get_or_create_text(key)` - Get nested text

### Loro::List

- `#push_string(value)` - Push string
- `#push_int(value)` - Push integer
- `#push_float(value)` - Push float
- `#insert_string(pos, value)` - Insert at position
- `#delete(pos, len)` - Delete range
- `#get(index)` / `#[index]` - Get value as JSON string
- `#length` - Get length
- `#empty?` - Check if empty
