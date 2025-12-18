//! loro-rb: Ruby bindings for Loro CRDT
//!
//! This crate provides Ruby bindings for the Loro CRDT library using Magnus.
//! It mirrors the API style of loro-py for consistency.

use magnus::{
    exception, function, method, prelude::*, Error, RArray, RString, Ruby,
};
use std::borrow::Cow;
use std::cell::RefCell;

/// Wrapper around loro::LoroDoc
#[magnus::wrap(class = "Loro::Doc", free_immediately, size)]
struct LoroDoc {
    inner: RefCell<loro::LoroDoc>,
}

impl LoroDoc {
    /// Create a new LoroDoc
    fn new() -> Self {
        Self {
            inner: RefCell::new(loro::LoroDoc::new()),
        }
    }

    /// Get the peer ID of this document
    fn peer_id(&self) -> u64 {
        self.inner.borrow().peer_id()
    }

    /// Set the peer ID of this document
    fn set_peer_id(&self, peer_id: u64) {
        self.inner.borrow().set_peer_id(peer_id).ok();
    }

    /// Import data into the document (updates or snapshot)
    fn import(&self, bytes: RString) -> Result<(), Error> {
        let data = unsafe { bytes.as_slice() };
        self.inner
            .borrow_mut()
            .import(data)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Import a batch of updates
    fn import_batch(&self, updates: RArray) -> Result<(), Error> {
        let mut batch: Vec<Vec<u8>> = Vec::new();
        for update in updates.into_iter() {
            let s = RString::try_convert(update)?;
            let data = unsafe { s.as_slice() };
            batch.push(data.to_vec());
        }

        self.inner
            .borrow_mut()
            .import_batch(&batch)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Export the document as a snapshot
    fn export_snapshot(&self) -> Result<RString, Error> {
        let data = self
            .inner
            .borrow()
            .export(loro::ExportMode::Snapshot)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(RString::from_slice(&data))
    }

    /// Export updates from a version vector
    fn export_updates_from(&self, vv_bytes: RString) -> Result<RString, Error> {
        let vv_data = unsafe { vv_bytes.as_slice() };
        let vv = loro::VersionVector::decode(vv_data)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;

        let data = self
            .inner
            .borrow()
            .export(loro::ExportMode::Updates {
                from: Cow::Owned(vv),
            })
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(RString::from_slice(&data))
    }

    /// Get the current version vector encoded as bytes
    fn version_vector(&self) -> RString {
        let vv = self.inner.borrow().oplog_vv();
        let encoded: Vec<u8> = vv.encode();
        RString::from_slice(&encoded)
    }

    /// Get the frontiers encoded as bytes
    fn frontiers(&self) -> RString {
        let frontiers = self.inner.borrow().oplog_frontiers();
        let encoded: Vec<u8> = frontiers.encode();
        RString::from_slice(&encoded)
    }

    /// Commit pending changes
    fn commit(&self) {
        self.inner.borrow().commit();
    }

    /// Get a LoroText container by name (root container)
    fn get_text(&self, name: String) -> LoroText {
        let text = self.inner.borrow().get_text(name);
        LoroText {
            inner: RefCell::new(text),
        }
    }

    /// Get a LoroMap container by name (root container)
    fn get_map(&self, name: String) -> LoroMap {
        let map = self.inner.borrow().get_map(name);
        LoroMap {
            inner: RefCell::new(map),
        }
    }

    /// Get a LoroList container by name (root container)
    fn get_list(&self, name: String) -> LoroList {
        let list = self.inner.borrow().get_list(name);
        LoroList {
            inner: RefCell::new(list),
        }
    }

    /// Get the deep value of the document as JSON string
    fn to_json(&self) -> String {
        let value = self.inner.borrow().get_deep_value();
        serde_json::to_string(&value).unwrap_or_else(|_| "{}".to_string())
    }
}

/// Wrapper around loro::LoroText
#[magnus::wrap(class = "Loro::Text", free_immediately, size)]
struct LoroText {
    inner: RefCell<loro::LoroText>,
}

impl LoroText {
    /// Insert text at position
    fn insert(&self, pos: usize, text: String) -> Result<(), Error> {
        self.inner
            .borrow()
            .insert(pos, &text)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Delete text at position
    fn delete(&self, pos: usize, len: usize) -> Result<(), Error> {
        self.inner
            .borrow()
            .delete(pos, len)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Get the text content as a string
    fn to_string(&self) -> String {
        self.inner.borrow().to_string()
    }

    /// Get the length of the text
    fn len(&self) -> usize {
        self.inner.borrow().len_unicode()
    }

    /// Check if the text is empty
    fn is_empty(&self) -> bool {
        self.inner.borrow().is_empty()
    }
}

/// Wrapper around loro::LoroMap
#[magnus::wrap(class = "Loro::Map", free_immediately, size)]
struct LoroMap {
    inner: RefCell<loro::LoroMap>,
}

impl LoroMap {
    /// Insert a string value
    fn insert_string(&self, key: String, value: String) -> Result<(), Error> {
        self.inner
            .borrow()
            .insert(&key, value)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Insert an integer value
    fn insert_int(&self, key: String, value: i64) -> Result<(), Error> {
        self.inner
            .borrow()
            .insert(&key, value)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Insert a float value
    fn insert_float(&self, key: String, value: f64) -> Result<(), Error> {
        self.inner
            .borrow()
            .insert(&key, value)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Insert a boolean value
    fn insert_bool(&self, key: String, value: bool) -> Result<(), Error> {
        self.inner
            .borrow()
            .insert(&key, value)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Insert a null value
    fn insert_null(&self, key: String) -> Result<(), Error> {
        self.inner
            .borrow()
            .insert(&key, loro::LoroValue::Null)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Delete a key
    fn delete(&self, key: String) -> Result<(), Error> {
        self.inner
            .borrow()
            .delete(&key)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Get the value for a key as JSON string (for complex values)
    fn get(&self, key: String) -> Option<String> {
        self.inner.borrow().get(&key).map(|v| {
            match v {
                loro::ValueOrContainer::Value(v) => serde_json::to_string(&v).unwrap_or_default(),
                loro::ValueOrContainer::Container(_) => "[container]".to_string(),
            }
        })
    }

    /// Get the number of entries
    fn len(&self) -> usize {
        self.inner.borrow().len()
    }

    /// Check if the map is empty
    fn is_empty(&self) -> bool {
        self.inner.borrow().is_empty()
    }

    /// Get all keys
    fn keys(&self) -> Vec<String> {
        self.inner.borrow().keys().map(|k| k.to_string()).collect()
    }

    /// Get a nested LoroMap container
    fn get_or_create_map(&self, key: String) -> Result<LoroMap, Error> {
        let map = self
            .inner
            .borrow()
            .get_or_create_container(&key, loro::LoroMap::new())
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(LoroMap {
            inner: RefCell::new(map),
        })
    }

    /// Get a nested LoroList container
    fn get_or_create_list(&self, key: String) -> Result<LoroList, Error> {
        let list = self
            .inner
            .borrow()
            .get_or_create_container(&key, loro::LoroList::new())
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(LoroList {
            inner: RefCell::new(list),
        })
    }

    /// Get a nested LoroText container
    fn get_or_create_text(&self, key: String) -> Result<LoroText, Error> {
        let text = self
            .inner
            .borrow()
            .get_or_create_container(&key, loro::LoroText::new())
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(LoroText {
            inner: RefCell::new(text),
        })
    }
}

/// Wrapper around loro::LoroList
#[magnus::wrap(class = "Loro::List", free_immediately, size)]
struct LoroList {
    inner: RefCell<loro::LoroList>,
}

impl LoroList {
    /// Push a string value
    fn push_string(&self, value: String) -> Result<(), Error> {
        self.inner
            .borrow()
            .push(value)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Push an integer value
    fn push_int(&self, value: i64) -> Result<(), Error> {
        self.inner
            .borrow()
            .push(value)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Push a float value
    fn push_float(&self, value: f64) -> Result<(), Error> {
        self.inner
            .borrow()
            .push(value)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Insert a string at position
    fn insert_string(&self, pos: usize, value: String) -> Result<(), Error> {
        self.inner
            .borrow()
            .insert(pos, value)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Delete at position
    fn delete(&self, pos: usize, len: usize) -> Result<(), Error> {
        self.inner
            .borrow()
            .delete(pos, len)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(())
    }

    /// Get the length
    fn len(&self) -> usize {
        self.inner.borrow().len()
    }

    /// Check if empty
    fn is_empty(&self) -> bool {
        self.inner.borrow().is_empty()
    }

    /// Get value at index as JSON string
    fn get(&self, index: usize) -> Option<String> {
        self.inner.borrow().get(index).map(|v| {
            match v {
                loro::ValueOrContainer::Value(v) => serde_json::to_string(&v).unwrap_or_default(),
                loro::ValueOrContainer::Container(_) => "[container]".to_string(),
            }
        })
    }
}

/// Version vector wrapper
#[magnus::wrap(class = "Loro::VersionVector", free_immediately, size)]
struct VersionVector {
    inner: loro::VersionVector,
}

impl VersionVector {
    /// Create a new empty version vector
    fn new() -> Self {
        Self {
            inner: loro::VersionVector::new(),
        }
    }

    /// Decode from bytes
    fn decode(bytes: RString) -> Result<Self, Error> {
        let data = unsafe { bytes.as_slice() };
        let vv = loro::VersionVector::decode(data)
            .map_err(|e| Error::new(exception::runtime_error(), e.to_string()))?;
        Ok(Self { inner: vv })
    }

    /// Encode to bytes
    fn encode(&self) -> RString {
        let data: Vec<u8> = self.inner.encode();
        RString::from_slice(&data)
    }
}

// We need serde_json for JSON serialization
use serde_json;

#[magnus::init(name = "loro")]
fn init(ruby: &Ruby) -> Result<(), Error> {
    let loro_module = ruby.define_module("Loro")?;

    // Define LoroDoc class
    let doc_class = loro_module.define_class("Doc", ruby.class_object())?;
    doc_class.define_singleton_method("new", function!(LoroDoc::new, 0))?;
    doc_class.define_method("peer_id", method!(LoroDoc::peer_id, 0))?;
    doc_class.define_method("set_peer_id", method!(LoroDoc::set_peer_id, 1))?;
    doc_class.define_method("import", method!(LoroDoc::import, 1))?;
    doc_class.define_method("import_batch", method!(LoroDoc::import_batch, 1))?;
    doc_class.define_method("export_snapshot", method!(LoroDoc::export_snapshot, 0))?;
    doc_class.define_method("export_updates_from", method!(LoroDoc::export_updates_from, 1))?;
    doc_class.define_method("version_vector", method!(LoroDoc::version_vector, 0))?;
    doc_class.define_method("frontiers", method!(LoroDoc::frontiers, 0))?;
    doc_class.define_method("commit", method!(LoroDoc::commit, 0))?;
    doc_class.define_method("get_text", method!(LoroDoc::get_text, 1))?;
    doc_class.define_method("get_map", method!(LoroDoc::get_map, 1))?;
    doc_class.define_method("get_list", method!(LoroDoc::get_list, 1))?;
    doc_class.define_method("to_json", method!(LoroDoc::to_json, 0))?;

    // Define LoroText class
    let text_class = loro_module.define_class("Text", ruby.class_object())?;
    text_class.define_method("insert", method!(LoroText::insert, 2))?;
    text_class.define_method("delete", method!(LoroText::delete, 2))?;
    text_class.define_method("to_s", method!(LoroText::to_string, 0))?;
    text_class.define_method("to_str", method!(LoroText::to_string, 0))?;
    text_class.define_method("length", method!(LoroText::len, 0))?;
    text_class.define_method("empty?", method!(LoroText::is_empty, 0))?;

    // Define LoroMap class
    let map_class = loro_module.define_class("Map", ruby.class_object())?;
    map_class.define_method("insert_string", method!(LoroMap::insert_string, 2))?;
    map_class.define_method("insert_int", method!(LoroMap::insert_int, 2))?;
    map_class.define_method("insert_float", method!(LoroMap::insert_float, 2))?;
    map_class.define_method("insert_bool", method!(LoroMap::insert_bool, 2))?;
    map_class.define_method("insert_null", method!(LoroMap::insert_null, 1))?;
    map_class.define_method("delete", method!(LoroMap::delete, 1))?;
    map_class.define_method("get", method!(LoroMap::get, 1))?;
    map_class.define_method("[]", method!(LoroMap::get, 1))?;
    map_class.define_method("length", method!(LoroMap::len, 0))?;
    map_class.define_method("empty?", method!(LoroMap::is_empty, 0))?;
    map_class.define_method("keys", method!(LoroMap::keys, 0))?;
    map_class.define_method("get_or_create_map", method!(LoroMap::get_or_create_map, 1))?;
    map_class.define_method("get_or_create_list", method!(LoroMap::get_or_create_list, 1))?;
    map_class.define_method("get_or_create_text", method!(LoroMap::get_or_create_text, 1))?;

    // Define LoroList class
    let list_class = loro_module.define_class("List", ruby.class_object())?;
    list_class.define_method("push_string", method!(LoroList::push_string, 1))?;
    list_class.define_method("push_int", method!(LoroList::push_int, 1))?;
    list_class.define_method("push_float", method!(LoroList::push_float, 1))?;
    list_class.define_method("insert_string", method!(LoroList::insert_string, 2))?;
    list_class.define_method("delete", method!(LoroList::delete, 2))?;
    list_class.define_method("length", method!(LoroList::len, 0))?;
    list_class.define_method("empty?", method!(LoroList::is_empty, 0))?;
    list_class.define_method("get", method!(LoroList::get, 1))?;
    list_class.define_method("[]", method!(LoroList::get, 1))?;

    // Define VersionVector class
    let vv_class = loro_module.define_class("VersionVector", ruby.class_object())?;
    vv_class.define_singleton_method("new", function!(VersionVector::new, 0))?;
    vv_class.define_singleton_method("decode", function!(VersionVector::decode, 1))?;
    vv_class.define_method("encode", method!(VersionVector::encode, 0))?;

    Ok(())
}
