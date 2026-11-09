/* db.js - local storage on the phone (IndexedDB). All stores for the whole app are created here. */
(function () {
  var RQ = (window.RQ = window.RQ || {});
  var NAME = 'revision-quest';
  var VERSION = 1;
  var STORES = {
    settings: { keyPath: 'key' },
    chapters: { keyPath: 'id', indexes: [['subject', 'subject']] },
    notes: { keyPath: 'id', indexes: [['chapterId', 'chapterId']] },
    questions: { keyPath: 'id', indexes: [['chapterId', 'chapterId'], ['noteId', 'noteId']] },
    schedules: { keyPath: 'questionId' },
    reviewLogs: { keyPath: 'id' },
    sessions: { keyPath: 'id' },
    mistakes: { keyPath: 'id' },
    explanations: { keyPath: 'questionId' },
    vaultSuggestions: { keyPath: 'id' }
  };
  var dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('This browser has no local database (IndexedDB).')); return; }
      var req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        Object.keys(STORES).forEach(function (name) {
          var def = STORES[name];
          var store = db.objectStoreNames.contains(name)
            ? req.transaction.objectStore(name)
            : db.createObjectStore(name, { keyPath: def.keyPath });
          (def.indexes || []).forEach(function (ix) {
            if (!store.indexNames.contains(ix[0])) store.createIndex(ix[0], ix[1]);
          });
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error('Database is blocked by another open tab. Close other tabs and reload.')); };
    });
    dbPromise.catch(function () { dbPromise = null; });
    return dbPromise;
  }

  function run(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(store, mode);
        var req = fn(tx.objectStore(store));
        tx.oncomplete = function () { resolve(req ? req.result : undefined); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error('Save was cancelled.')); };
      });
    });
  }

  RQ.db = {
    STORES: STORES,
    open: open,
    get: function (store, key) { return run(store, 'readonly', function (s) { return s.get(key); }); },
    getAll: function (store) { return run(store, 'readonly', function (s) { return s.getAll(); }); },
    getAllByIndex: function (store, index, value) { return run(store, 'readonly', function (s) { return s.index(index).getAll(value); }); },
    count: function (store) { return run(store, 'readonly', function (s) { return s.count(); }); },
    countByIndex: function (store, index, value) { return run(store, 'readonly', function (s) { return s.index(index).count(value); }); },
    put: function (store, value) { return run(store, 'readwrite', function (s) { return s.put(value); }); },
    delete: function (store, key) { return run(store, 'readwrite', function (s) { return s.delete(key); }); },
    clear: function (store) { return run(store, 'readwrite', function (s) { return s.clear(); }); },
    putMany: function (store, values) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(store, 'readwrite');
          var s = tx.objectStore(store);
          values.forEach(function (v) { s.put(v); });
          tx.oncomplete = function () { resolve(values.length); };
          tx.onerror = function () { reject(tx.error); };
          tx.onabort = function () { reject(tx.error || new Error('Save was cancelled.')); };
        });
      });
    }
  };
})();
