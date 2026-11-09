/* notes-screen.js - "My notes" list and a note's detail page (simple for now; the Vault notes library comes later). */
(function () {
  var RQ = window.RQ;
  var h = RQ.h, icon = RQ.icon;

  function when(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function statusText(n) { return n.aiStatus === 'waiting' ? 'Waiting for AI' : (n.aiStatus === 'done' ? 'Questions made' : 'Saved'); }

  RQ.screens.notes = function (root) {
    var box = h('div', { class: 'stack' });
    root.append(RQ.header('My notes'), box);
    RQ.notes.all().then(function (rows) {
      if (!rows.length) {
        box.append(h('div', { class: 'glass pad centered' }, h('div', { class: 'strong', text: 'No notes yet' }), h('div', { class: 'hint', text: 'Notes you log will appear here.' })),
          h('button', { class: 'btn', onclick: function () { location.hash = '#lognotes'; } }, 'Log your first note'));
        return;
      }
      box.append(h('div', { class: 'hint center-text', text: rows.length + (rows.length === 1 ? ' note' : ' notes') }));
      rows.forEach(function (n) {
        var bits = [];
        if (n.photos && n.photos.length) bits.push(n.photos.length + (n.photos.length === 1 ? ' photo' : ' photos'));
        if (n.text) bits.push('text');
        box.append(h('button', { class: 'glass note-card', onclick: function () { location.hash = '#note/' + n.id; } },
          h('div', { class: 'line' }, h('span', { class: 'badge', text: n.subject }), h('span', { class: 'hint', text: when(n.createdAt) })),
          h('div', { class: 'strong', text: n.chapterName }),
          n.lectureTitle ? h('div', { class: 'muted', text: n.lectureTitle }) : null,
          n.text ? h('div', { class: 'preview', text: n.text.slice(0, 110) }) : null,
          h('div', { class: 'line' }, h('span', { class: 'hint', text: bits.join(' + ') }), h('span', { class: 'tagline', text: statusText(n) }))));
      });
    }).catch(function (e) { box.append(h('div', { class: 'glass pad', text: 'Could not load notes: ' + e.message })); });
  };

  RQ.screens.note = function (root, id) {
    var box = h('div', { class: 'stack' });
    root.append(RQ.header('Note', { back: '#notes' }), box);
    RQ.notes.get(id).then(function (n) {
      if (!n) { box.append(h('div', { class: 'glass pad', text: 'This note could not be found.' })); return; }
      var armed = false;
      var del = h('button', { class: 'btn ghost danger-btn' }, 'Delete this note');
      del.addEventListener('click', function () {
        if (!armed) { armed = true; del.textContent = 'Tap again to delete'; setTimeout(function () { if (armed) { armed = false; del.textContent = 'Delete this note'; } }, 3000); return; }
        RQ.notes.remove(n.id).then(function () { location.hash = '#notes'; }).catch(function (e) { RQ.toast('Could not delete: ' + e.message); armed = false; del.textContent = 'Delete this note'; });
      });
      var photos = h('div', { class: 'photo-grid' });
      (n.photos || []).forEach(function (p, i) {
        var url = RQ.blobUrl(p.blob);
        photos.append(h('button', { class: 'photo', 'aria-label': 'Open page ' + (i + 1), onclick: function () {
          var layer = h('div', { class: 'lightbox', onclick: function () { layer.remove(); } }, h('img', { src: url, alt: 'Page ' + (i + 1) }));
          document.body.append(layer);
        } }, h('img', { src: url, alt: 'Page ' + (i + 1) })));
      });
      box.append(
        h('div', { class: 'glass pad' },
          h('div', { class: 'line' }, h('span', { class: 'badge', text: n.subject }), h('span', { class: 'hint', text: when(n.createdAt) })),
          h('div', { class: 'strong', text: n.chapterName }),
          n.lectureTitle ? h('div', { class: 'muted', text: n.lectureTitle }) : null,
          n.topicHints ? h('div', { class: 'hint', text: 'Hints: ' + n.topicHints }) : null,
          h('div', { class: 'tagline', text: statusText(n) })),
        n.text ? h('div', { class: 'glass pad' }, h('div', { class: 'label', text: 'NOTES' }), h('div', { class: 'note-text', text: n.text })) : null,
        (n.photos && n.photos.length) ? h('div', { class: 'glass pad' }, h('div', { class: 'label', text: 'PAGES (' + n.photos.length + ')' }), photos) : null,
        del);
    }).catch(function (e) { box.append(h('div', { class: 'glass pad', text: 'Could not open the note: ' + e.message })); });
  };
})();
