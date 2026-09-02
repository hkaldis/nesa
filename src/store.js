/* Persistence. IndexedDB holds tools, photo blobs and settings; if IndexedDB is
   unavailable (private windows, file:// origins) we fall back to localStorage
   with photos kept as data URLs. The API is identical either way. */
(function (App) {
  'use strict';

  const DB_NAME = 'nesa-tools';
  const DB_VERSION = 1;
  const STORES = { tools: 'tools', photos: 'photos', settings: 'settings' };

  let dbPromise = null;
  let usingFallback = false;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('no indexeddb')); return; }
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function (event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORES.tools)) {
          const tools = db.createObjectStore(STORES.tools, { keyPath: 'id' });
          tools.createIndex('category', 'category', { unique: false });
          tools.createIndex('brand', 'brand', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.photos)) {
          db.createObjectStore(STORES.photos, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('indexeddb blocked')); };
    }).catch(function (err) {
      usingFallback = true;
      console.warn('Falling back to localStorage:', err && err.message);
      return null;
    });
    return dbPromise;
  }

  function tx(storeName, mode, run) {
    return openDb().then(function (db) {
      if (!db) return fallback[storeName][mode === 'readwrite' ? 'write' : 'read'](run);
      return new Promise(function (resolve, reject) {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let result;
        try { result = run(store); } catch (err) { reject(err); return; }
        transaction.oncomplete = function () { resolve(result && result.__value !== undefined ? result.__value : result); };
        transaction.onerror = function () { reject(transaction.error); };
        transaction.onabort = function () { reject(transaction.error); };
      });
    });
  }

  function request(store, method, arg) {
    const req = arg === undefined ? store[method]() : store[method](arg);
    const box = { __value: undefined };
    req.onsuccess = function () { box.__value = req.result; };
    return box;
  }

  /* ------------------------------------------------------- localStorage fallback */
  const LS_PREFIX = 'nesa:';
  function lsRead(name) {
    try { return JSON.parse(window.localStorage.getItem(LS_PREFIX + name) || '[]'); }
    catch (err) { return []; }
  }
  function lsWrite(name, rows) {
    window.localStorage.setItem(LS_PREFIX + name, JSON.stringify(rows));
  }
  const fallback = {};
  Object.keys(STORES).forEach(function (name) {
    fallback[name] = {
      read: function (run) { return run(makeShim(name)); },
      write: function (run) {
        const shim = makeShim(name);
        const result = run(shim);
        lsWrite(name, shim.__rows);
        return result && result.__value !== undefined ? result.__value : result;
      }
    };
  });
  function makeShim(name) {
    const rows = lsRead(name);
    const key = name === 'settings' ? 'key' : 'id';
    return {
      __rows: rows,
      getAll: function () { return { __value: rows }; },
      get: function (id) { return { __value: rows.filter(function (r) { return r[key] === id; })[0] }; },
      put: function (value) {
        const index = rows.findIndex(function (r) { return r[key] === value[key]; });
        if (index >= 0) rows[index] = value; else rows.push(value);
        return { __value: value[key] };
      },
      delete: function (id) {
        const index = rows.findIndex(function (r) { return r[key] === id; });
        if (index >= 0) rows.splice(index, 1);
        return { __value: true };
      },
      clear: function () { rows.length = 0; return { __value: true }; }
    };
  }

  /* ---------------------------------------------------------------- public API */
  const store = {
    isFallback: function () { return usingFallback; },

    allTools: function () {
      return tx(STORES.tools, 'readonly', function (s) { return request(s, 'getAll'); })
        .then(function (rows) { return rows || []; });
    },

    getTool: function (id) {
      return tx(STORES.tools, 'readonly', function (s) { return request(s, 'get', id); });
    },

    saveTool: function (tool) {
      tool.updatedAt = new Date().toISOString();
      if (!tool.createdAt) tool.createdAt = tool.updatedAt;
      return tx(STORES.tools, 'readwrite', function (s) { return request(s, 'put', tool); })
        .then(function () { return tool; });
    },

    saveTools: function (tools) {
      return tx(STORES.tools, 'readwrite', function (s) {
        tools.forEach(function (tool) {
          if (!tool.createdAt) tool.createdAt = new Date().toISOString();
          tool.updatedAt = new Date().toISOString();
          s.put(tool);
        });
        return { __value: tools.length };
      });
    },

    deleteTool: function (id) {
      return store.getTool(id).then(function (tool) {
        const photoIds = (tool && tool.photos) || [];
        return Promise.all(photoIds.map(store.deletePhoto)).then(function () {
          return tx(STORES.tools, 'readwrite', function (s) { return request(s, 'delete', id); });
        });
      });
    },

    clearTools: function () {
      return Promise.all([
        tx(STORES.tools, 'readwrite', function (s) { return request(s, 'clear'); }),
        tx(STORES.photos, 'readwrite', function (s) { return request(s, 'clear'); })
      ]);
    },

    /* Photos are stored separately so the tool list stays cheap to load. */
    savePhoto: function (record) {
      return tx(STORES.photos, 'readwrite', function (s) { return request(s, 'put', record); })
        .then(function () { return record.id; });
    },

    getPhoto: function (id) {
      return tx(STORES.photos, 'readonly', function (s) { return request(s, 'get', id); });
    },

    allPhotos: function () {
      return tx(STORES.photos, 'readonly', function (s) { return request(s, 'getAll'); })
        .then(function (rows) { return rows || []; });
    },

    deletePhoto: function (id) {
      return tx(STORES.photos, 'readwrite', function (s) { return request(s, 'delete', id); });
    },

    getSetting: function (key, fallbackValue) {
      return tx(STORES.settings, 'readonly', function (s) { return request(s, 'get', key); })
        .then(function (row) { return row && row.value !== undefined ? row.value : fallbackValue; });
    },

    setSetting: function (key, value) {
      return tx(STORES.settings, 'readwrite', function (s) {
        return request(s, 'put', { key: key, value: value });
      });
    },

    estimateUsage: function () {
      if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
      return navigator.storage.estimate().catch(function () { return null; });
    }
  };

  App.store = store;
})(window.App = window.App || {});
