/* lognotes.js - the Log Notes screen (subject, chapter, material, save) and the Saved screen. */
(function () {
  var RQ = window.RQ;
  var h = RQ.h, icon = RQ.icon;

  /* ---------- Chapter picker (bottom sheet) ---------- */
  function openSheet(subject, onPick, selectedId) {
    var q = '';
    var backdrop = h('div', { class: 'backdrop' });
    var sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-label': 'Choose a chapter' });
    var list = h('div', { class: 'list' });
    document.body.style.overflow = 'hidden';
    function close() { backdrop.remove(); sheet.remove(); document.body.style.overflow = ''; }
    backdrop.addEventListener('click', close);

    function draw() {
      RQ.chapters.listFor(subject, false).then(function (rows) {
        var needle = q.trim().toLowerCase();
        var shown = rows.filter(function (c) { return !needle || c.name.toLowerCase().indexOf(needle) !== -1 || c.group.toLowerCase().indexOf(needle) !== -1; });
        list.replaceChildren();
        if (!shown.length) { list.append(h('div', { class: 'muted center-text pad', text: 'No chapter matches. You can add it below.' })); return; }
        var last = null, card = null;
        shown.forEach(function (c) {
          if (c.group !== last) { last = c.group; list.append(h('div', { class: 'label', text: c.group.toUpperCase() })); card = h('div', { class: 'glass rows' }); list.append(card); }
          card.append(h('button', { class: 'row pick' + (c.id === selectedId ? ' sel' : ''), onclick: function () { onPick(c); close(); } },
            h('span', { class: 'row-name', text: c.name }), c.id === selectedId ? icon('check', 18) : null));
        });
      });
    }
    var search = h('input', { class: 'input', type: 'search', placeholder: 'Search chapters', 'aria-label': 'Search chapters' });
    search.addEventListener('input', function () { q = search.value; draw(); });
    var nameIn = h('input', { class: 'input', type: 'text', placeholder: 'Not listed? Type a new chapter name', maxlength: '80', 'aria-label': 'New chapter name' });
    var addBtn = h('button', { class: 'btn ghost', onclick: function () {
      RQ.chapters.addCustom(subject, nameIn.value, RQ.chapters.CUSTOM_GROUP).then(function (rec) { onPick(rec); close(); }).catch(function (e) { RQ.toast(e.message); });
    } }, 'Add and use this chapter');
    sheet.append(
      h('div', { class: 'line' }, h('div', { class: 'strong', text: subject + ' chapters' }), h('button', { class: 'round-btn', 'aria-label': 'Close', onclick: close }, icon('x', 20))),
      search, list, h('div', { class: 'pad' }, nameIn, addBtn));
    document.body.append(backdrop, sheet);
    draw();
  }

  /* ---------- Log Notes ---------- */
  RQ.screens.lognotes = function (root) {
    var st = { subject: null, chapter: null, title: '', hints: '', text: '', photos: [], showText: false, showOpt: false };
    var saving = false, draftTimer = null;

    function saveDraftSoon() {
      clearTimeout(draftTimer);
      draftTimer = setTimeout(function () {
        var empty = !st.subject && !st.chapter && !st.title && !st.hints && !st.text;
        (empty ? RQ.notes.clearDraft() : RQ.notes.saveDraft({ subject: st.subject, chapterId: st.chapter && st.chapter.id, chapterName: st.chapter && st.chapter.name, title: st.title, hints: st.hints, text: st.text })).catch(function () {});
      }, 500);
    }

    /* Subject */
    var subjRow = h('div', { class: 'seg3' });
    function drawSubjects() {
      subjRow.replaceChildren();
      RQ.SUBJECTS.forEach(function (s) {
        var on = st.subject === s;
        subjRow.append(h('button', { class: 'pill' + (on ? ' on' : ''), onclick: function () {
          if (st.subject !== s) { st.subject = s; if (st.chapter && st.chapter.subject !== s) st.chapter = null; drawSubjects(); drawChapter(); saveDraftSoon(); }
        } }, on ? icon('check', 16) : null, s));
      });
    }

    /* Chapter */
    var chapterBtn = h('button', { class: 'glass picker' });
    function drawChapter() {
      chapterBtn.replaceChildren(h('span', { class: st.chapter ? 'strong' : 'muted', text: st.chapter ? st.chapter.name : 'Choose a chapter' }), icon('chevdown', 20));
    }
    chapterBtn.addEventListener('click', function () {
      if (!st.subject) { RQ.toast('Pick a subject first.'); return; }
      openSheet(st.subject, function (c) { st.chapter = c; drawChapter(); saveDraftSoon(); }, st.chapter && st.chapter.id);
    });

    /* Optional fields */
    var titleIn = h('input', { class: 'input', type: 'text', placeholder: 'Lecture title (optional)', maxlength: '100', 'aria-label': 'Lecture title' });
    var hintsIn = h('input', { class: 'input', type: 'text', placeholder: 'Topic hints (optional)', maxlength: '200', 'aria-label': 'Topic hints' });
    titleIn.addEventListener('input', function () { st.title = titleIn.value; saveDraftSoon(); });
    hintsIn.addEventListener('input', function () { st.hints = hintsIn.value; saveDraftSoon(); });
    var optBox = h('div', { class: 'stack', hidden: true }, titleIn, hintsIn);
    var optBtn = h('button', { class: 'glass picker small-row', onclick: function () { st.showOpt = !st.showOpt; optBox.hidden = !st.showOpt; } },
      h('span', { text: 'Optional: lecture title, topic hints' }), icon('chevdown', 18));

    /* Text */
    var area = h('textarea', { class: 'input area', rows: '9', placeholder: 'Type or paste your notes here', maxlength: '20000', 'aria-label': 'Notes text' });
    area.addEventListener('input', function () { st.text = area.value; saveDraftSoon(); });
    var textBox = h('div', { hidden: true }, area);
    function showText() { st.showText = true; textBox.hidden = false; }

    /* Photos */
    var cam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
    var gal = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
    [cam, gal].forEach(function (inp) { inp.addEventListener('change', function () { addFiles(inp.files); inp.value = ''; }); });
    var pages = h('div', { class: 'thumbs' });
    var pagesHint = h('div', { class: 'hint', text: 'Add several pages to keep them together as one upload.' });
    function drawPages() {
      pages.replaceChildren();
      st.photos.forEach(function (p, i) {
        pages.append(h('div', { class: 'thumb' },
          h('img', { src: p.url, alt: 'Page ' + (i + 1) }),
          h('span', { class: 'pg', text: 'Page ' + (i + 1) }),
          h('button', { class: 'x', 'aria-label': 'Remove page ' + (i + 1), onclick: function () { st.photos.splice(i, 1); drawPages(); } }, icon('x', 14))));
      });
      pagesHint.textContent = st.photos.length ? st.photos.length + ' of ' + RQ.notes.MAX_PAGES + ' pages added.' : 'Add several pages to keep them together as one upload.';
    }
    function addFiles(files) {
      var list = Array.prototype.slice.call(files || []);
      if (!list.length) return;
      var room = RQ.notes.MAX_PAGES - st.photos.length;
      if (room <= 0) { RQ.toast('You can add up to ' + RQ.notes.MAX_PAGES + ' pages in one note.'); return; }
      if (list.length > room) { RQ.toast('Only the first ' + room + ' photos were added (limit ' + RQ.notes.MAX_PAGES + ').'); list = list.slice(0, room); }
      RQ.notes.hasRoom().then(function (ok) {
        if (!ok) { RQ.toast('Phone storage is almost full. Free some space first.'); return; }
        return list.reduce(function (p, f) {
          return p.then(function () {
            return RQ.notes.compressImage(f).then(function (r) { r.url = RQ.blobUrl(r.blob); st.photos.push(r); drawPages(); })
              .catch(function () { RQ.toast('Could not read one of the photos.'); });
          });
        }, Promise.resolve());
      });
    }

    /* Save */
    var saveBtn = h('button', { class: 'btn', onclick: save }, 'Save notes');
    function need(msg, el) { RQ.toast(msg); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    function save() {
      if (saving) return;
      var text = st.text.trim();
      if (!st.subject) return need('Pick a subject first.', subjRow);
      if (!st.chapter) return need('Choose a chapter first.', chapterBtn);
      if (!text && !st.photos.length) return need('Add some notes first: type, paste, or add a photo.', pages);
      saving = true; saveBtn.disabled = true;
      RQ.notes.findDuplicate(st.chapter.id, text).then(function (dupe) {
        if (dupe && !window.confirm('You already saved this same text for this chapter. Save it again?')) { saving = false; saveBtn.disabled = false; return; }
        var note = {
          id: RQ.notes.newId(), subject: st.subject, chapterId: st.chapter.id, chapterName: st.chapter.name,
          lectureTitle: st.title.trim(), topicHints: st.hints.trim(), text: text,
          photos: st.photos.map(function (p) { return { blob: p.blob, w: p.w, h: p.h }; }),
          createdAt: Date.now(), aiStatus: 'waiting'
        };
        return RQ.notes.save(note).then(function () { return RQ.notes.clearDraft(); }).then(function () { location.hash = '#saved/' + note.id; });
      }).catch(function (e) {
        saving = false; saveBtn.disabled = false;
        RQ.toast('Could not save: ' + (e && e.message ? e.message : 'unknown problem') + '. Your notes are still here.');
      });
    }

    function leave() {
      if (st.photos.length && !window.confirm('Leave without saving? The photos you added will be discarded.')) return;
      location.hash = '#home';
    }

    root.append(
      h('div', { class: 'head' }, h('button', { class: 'round-btn', 'aria-label': 'Back', onclick: leave }, icon('back', 22)), h('h1', { text: 'Log Notes' })),
      h('section', { class: 'sec' }, h('div', { class: 'label', text: 'SUBJECT' }), subjRow),
      h('section', { class: 'sec' }, h('div', { class: 'label', text: 'CHAPTER' }), chapterBtn),
      optBtn, optBox,
      h('section', { class: 'sec' }, h('div', { class: 'label', text: 'ADD MATERIAL' }),
        h('div', { class: 'seg3' },
          h('button', { class: 'glass tile', onclick: function () { cam.click(); } }, icon('camera', 22), 'Camera'),
          h('button', { class: 'glass tile', onclick: function () { gal.click(); } }, icon('image', 22), 'Photos'),
          h('button', { class: 'glass tile', onclick: function () { showText(); area.focus(); } }, icon('pen', 22), 'Type'))),
      textBox,
      h('section', { class: 'sec' }, h('div', { class: 'label', text: 'PAGES IN THIS UPLOAD' }), pages, pagesHint),
      h('div', { class: 'privacy' }, icon('shield', 18), h('span', { text: 'Saved on this phone first. Nothing is sent anywhere unless you choose to process it with AI.' })),
      saveBtn, cam, gal);
    drawSubjects(); drawChapter(); drawPages();

    /* Bring back an unsaved draft (for example after the camera app closes the page). */
    RQ.notes.loadDraft().then(function (d) {
      if (!d || st.text || st.chapter || st.subject) return;
      st.subject = d.subject || null; st.title = d.title || ''; st.hints = d.hints || ''; st.text = d.text || '';
      if (d.chapterId) {
        RQ.chapters.all().then(function (rows) {
          var c = rows.filter(function (x) { return x.id === d.chapterId; })[0];
          if (c) { st.chapter = c; drawChapter(); }
        });
      }
      titleIn.value = st.title; hintsIn.value = st.hints; area.value = st.text;
      if (st.text) showText();
      if (st.title || st.hints) { st.showOpt = true; optBox.hidden = false; }
      drawSubjects(); drawChapter();
      if (st.subject || st.text || st.title) RQ.toast('Your unsaved draft was restored.');
    }).catch(function () {});
  };

  /* ---------- Saved ---------- */
  RQ.screens.saved = function (root, id) {
    var box = h('div', { class: 'stack' });
    root.append(RQ.header('Saved', { back: '#home' }), box);
    RQ.notes.get(id).then(function (n) {
      if (!n) { box.append(h('div', { class: 'glass pad', text: 'This note could not be found.' }), h('button', { class: 'btn', onclick: function () { location.hash = '#home'; } }, 'Back to Home')); return; }
      var parts = [];
      if (n.text) parts.push(n.text.length + ' characters of text');
      if (n.photos && n.photos.length) parts.push(n.photos.length + (n.photos.length === 1 ? ' photo' : ' photos'));
      box.append(
        h('div', { class: 'glass pad centered' },
          h('div', { class: 'ok-ic' }, icon('check', 28)),
          h('div', { class: 'strong big-s', text: 'Saved on this phone' }),
          h('div', { class: 'hint', text: 'Your original pages are safe, even if processing fails later.' })),
        h('div', { class: 'glass pad' },
          h('div', { class: 'line' }, h('span', { class: 'muted', text: 'Note' }), h('span', { class: 'right', text: n.subject + ' - ' + n.chapterName })),
          h('div', { class: 'line' }, h('span', { class: 'muted', text: 'Original pages' }), h('span', { class: 'right', text: parts.join(', ') + ' - saved locally' })),
          h('div', { class: 'line' }, h('span', { class: 'muted', text: 'Revision questions' }), h('span', { class: 'right', text: 'Not created yet' }))),
        h('div', { class: 'hint', text: 'AI can read your notes and draft questions. You will be asked before anything is sent, and you can do it later. AI is added in the next part, so this note is marked "Waiting for AI".' }),
        h('button', { class: 'btn ghost', onclick: function () { RQ.toast('AI processing arrives in the next part. Your note is saved and waiting.'); } }, 'Process with AI (next part)'),
        h('button', { class: 'btn ghost', onclick: function () { RQ.toast('Adding questions by hand arrives in a later part.'); } }, 'Add questions by hand (later)'),
        h('button', { class: 'btn ghost', onclick: function () { location.hash = '#note/' + n.id; } }, 'View this note'),
        h('button', { class: 'btn', onclick: function () { location.hash = '#lognotes'; } }, 'Log another note'),
        h('button', { class: 'btn ghost', onclick: function () { location.hash = '#home'; } }, 'Done'));
    }).catch(function (e) { box.append(h('div', { class: 'glass pad', text: 'Could not open the note: ' + e.message })); });
  };
})();
