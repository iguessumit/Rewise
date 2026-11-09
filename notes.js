/* notes.js - saving, reading and deleting notes, plus photo compression. (Screens are in lognotes.js and notes-screen.js.) */
(function () {
  var RQ = window.RQ;
  var MAX_SIDE = 1600;
  var MAX_PAGES = 12;
  var DRAFT_KEY = 'draftNote';

  function newId() { return 'n-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(file); });
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read this photo.')); };
      img.src = url;
    });
  }

  /* Shrinks a photo so its longest side is at most 1600 px and saves it as a JPEG. */
  function compressImage(file) {
    return loadBitmap(file).then(function (bmp) {
      var w = bmp.width, h = bmp.height, s = Math.min(1, MAX_SIDE / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(bmp, 0, 0, cw, ch);
      if (bmp.close) bmp.close();
      return new Promise(function (resolve, reject) {
        c.toBlob(function (b) { b ? resolve({ blob: b, w: cw, h: ch }) : reject(new Error('Could not compress this photo.')); }, 'image/jpeg', 0.82);
      });
    });
  }

  /* True if there is room to store more photos (needs about 30 MB free). */
  function hasRoom() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(true);
    return navigator.storage.estimate().then(function (e) {
      if (typeof e.quota !== 'number' || typeof e.usage !== 'number') return true;
      return e.quota - e.usage > 30 * 1048576;
    }).catch(function () { return true; });
  }

  RQ.notes = {
    MAX_PAGES: MAX_PAGES,
    newId: newId,
    compressImage: compressImage,
    hasRoom: hasRoom,
    save: function (note) { return RQ.db.put('notes', note); },
    get: function (id) { return RQ.db.get('notes', id); },
    all: function () {
      return RQ.db.getAll('notes').then(function (rows) { return rows.sort(function (a, b) { return b.createdAt - a.createdAt; }); });
    },
    remove: function (id) { return RQ.db.delete('notes', id); },
    findDuplicate: function (chapterId, text) {
      if (!text) return Promise.resolve(null);
      return RQ.db.getAllByIndex('notes', 'chapterId', chapterId).then(function (rows) {
        return rows.filter(function (n) { return (n.text || '').trim() === text; })[0] || null;
      });
    },
    saveDraft: function (d) { return RQ.db.put('settings', { key: DRAFT_KEY, value: d }); },
    loadDraft: function () { return RQ.db.get('settings', DRAFT_KEY).then(function (r) { return r ? r.value : null; }); },
    clearDraft: function () { return RQ.db.delete('settings', DRAFT_KEY); }
  };
})();
