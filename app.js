/* app.js - start-up, screen switching, Home screen, self-check, and the "Update available" message. */
(function () {
  var RQ = window.RQ;
  var h = RQ.h, icon = RQ.icon;
  var refreshing = false;

  /* ---------- Update available ---------- */
  function showUpdate(worker) {
    var box = document.getElementById('banner');
    if (!box || box.firstChild) return;
    box.append(h('div', { class: 'glass banner' },
      h('div', null, h('div', { class: 'strong', text: 'Update available' }), h('div', { class: 'hint', text: 'Tap to refresh and get the new version.' })),
      h('button', { class: 'btn small', onclick: function () {
        refreshing = true;
        if (worker) worker.postMessage({ type: 'SKIP_WAITING' }); else location.reload();
      } }, 'Refresh')));
  }

  function setupServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
      RQ.swReg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(nw);
        });
      });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update().catch(function () {});
      });
      reg.update().catch(function () {});
    }).catch(function () {});
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) location.reload();
    });
  }

  RQ.checkUpdate = function () {
    if (!RQ.swReg) { RQ.toast('Updates work once the app is opened from its web address.'); return; }
    RQ.toast('Checking...');
    RQ.swReg.update().then(function () {
      setTimeout(function () {
        if (RQ.swReg.waiting) { showUpdate(RQ.swReg.waiting); RQ.toast('Update found.'); }
        else RQ.toast('You have the latest version (' + self.APP_VERSION + ').');
      }, 1500);
    }).catch(function () { RQ.toast('Could not check. Are you online?'); });
  };

  /* ---------- Self-check (so you can test Part 1 on your phone) ---------- */
  function runSelfCheck() {
    var checks = [];
    function add(name, status, detail) { checks.push({ name: name, status: status, detail: detail }); }

    return RQ.db.put('settings', { key: '_selfcheck', value: 'ok-' + Date.now() })
      .then(function () { return RQ.db.get('settings', '_selfcheck'); })
      .then(function (r) {
        var ok = r && String(r.value).indexOf('ok-') === 0;
        add('Phone storage: save and read back', ok ? 'pass' : 'fail', ok ? 'Works' : 'Read back did not match');
        return RQ.db.delete('settings', '_selfcheck');
      })
      .catch(function (e) { add('Phone storage: save and read back', 'fail', e.message); })
      .then(function () { return RQ.chapters.all(); })
      .then(function (rows) {
        var by = {};
        rows.forEach(function (c) { by[c.subject] = (by[c.subject] || 0) + 1; });
        var expected = 0;
        RQ.SUBJECTS.forEach(function (s) { RQ.BUILTIN[s].forEach(function (g) { expected += g.items.length; }); });
        var builtins = rows.filter(function (c) { return !c.isCustom; }).length;
        add('Chapter list loaded', builtins >= expected ? 'pass' : 'fail',
          builtins + ' built-in (Physics ' + (by.Physics || 0) + ', Chemistry ' + (by.Chemistry || 0) + ', Maths ' + (by.Maths || 0) + ')');
      })
      .catch(function (e) { add('Chapter list loaded', 'fail', e.message); })
      .then(function () {
        var s = RQ.settings.get('theme');
        add('Settings loaded', 'pass', 'Colour ' + s + ', daily goal ' + RQ.settings.get('dailyGoal'));
        add('Version', 'pass', self.APP_VERSION);
        var swOk = 'serviceWorker' in navigator;
        add('Works offline', swOk && RQ.swReg && RQ.swReg.active ? 'pass' : 'warn',
          !swOk ? 'Not available in this browser or address' : (RQ.swReg && RQ.swReg.active ? 'Offline file is active' : 'Not active yet. Close and reopen the app once.'));
        var photoOk = typeof window.createImageBitmap === 'function' && !!document.createElement('canvas').toBlob;
        add('Photo handling', photoOk ? 'pass' : 'warn', photoOk ? 'Can shrink photos before saving' : 'Photos may be saved at full size');
        add('Vibration', navigator.vibrate ? 'pass' : 'warn', navigator.vibrate ? 'Supported' : 'Not supported here');
        var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
        add('Installed on home screen', standalone ? 'pass' : 'warn', standalone ? 'Yes' : 'Not yet (optional): Chrome menu > Add to Home screen');
        if (navigator.storage && navigator.storage.persisted) {
          return navigator.storage.persisted().then(function (p) { add('Data protected from clearing', p ? 'pass' : 'warn', p ? 'Yes' : 'Not yet. Settings > Protect my data'); });
        }
      })
      .then(function () { return checks; });
  }

  /* ---------- Home ---------- */
  function renderHome(root) {
    var resultBox = h('div', { class: 'glass pad', hidden: true });
    var chapterCount = h('span', { class: 'muted', text: '' });
    var noteCount = h('span', { class: 'muted', text: '' });
    RQ.notes.all().then(function (r) { noteCount.textContent = r.length === 1 ? '1 note saved' : r.length + ' notes saved'; }).catch(function () {});
    RQ.chapters.all().then(function (r) { chapterCount.textContent = r.length + ' chapters'; }).catch(function () {});

    root.append.apply(root, [
      h('div', { class: 'head' },
        h('div', { class: 'grow' }, h('h1', { text: 'Revise' }), h('div', { class: 'hint', text: 'Revision Quest - Part 2: Log Notes' })),
        h('button', { class: 'round-btn', 'aria-label': 'Settings', onclick: function () { location.hash = '#settings'; } }, icon('gear', 22))),
      RQ.bootError ? h('div', { class: 'glass pad error' }, h('div', { class: 'strong', text: 'Storage problem' }), h('div', { class: 'hint', text: RQ.bootError.message || String(RQ.bootError) })) : null,
      h('div', { class: 'glass pad' },
        h('div', { class: 'strong', text: 'Foundation and Log Notes are ready' }),
        h('p', { class: 'hint', text: 'You can now log notes (typed, pasted or photos) and they are saved on this phone. Questions and revision screens arrive in the next parts.' })),
      h('button', { class: 'btn', onclick: function () { location.hash = '#lognotes'; } }, h('span', null, icon('pen', 18), ' Log Notes')),
      h('button', { class: 'glass nav', onclick: function () { location.hash = '#notes'; } },
        h('span', { class: 'nav-ic' }, icon('notes', 22)), h('span', { class: 'grow left' }, h('span', { class: 'strong', text: 'My notes' }), h('br'), noteCount), icon('chevron', 20)),
      h('button', { class: 'glass nav', onclick: function () { location.hash = '#chapters'; } },
        h('span', { class: 'nav-ic' }, icon('book', 22)), h('span', { class: 'grow left' }, h('span', { class: 'strong', text: 'Chapters' }), h('br'), chapterCount), icon('chevron', 20)),
      h('button', { class: 'glass nav', onclick: function () { location.hash = '#settings'; } },
        h('span', { class: 'nav-ic' }, icon('gear', 22)), h('span', { class: 'grow left' }, h('span', { class: 'strong', text: 'Settings' }), h('br'), h('span', { class: 'muted', text: 'Colour, daily goal, vibration, exam dates' })), icon('chevron', 20)),
      h('button', { class: 'btn', onclick: function () {
        resultBox.hidden = false;
        resultBox.replaceChildren(h('div', { class: 'muted', text: 'Running checks...' }));
        runSelfCheck().then(function (list) {
          var rows = list.map(function (c) {
            return h('div', { class: 'check ' + c.status },
              h('span', { class: 'tag', text: c.status === 'pass' ? 'PASS' : (c.status === 'warn' ? 'NOTE' : 'FAIL') }),
              h('div', null, h('div', { class: 'strong', text: c.name }), h('div', { class: 'hint', text: c.detail })));
          });
          resultBox.replaceChildren.apply(resultBox, [h('div', { class: 'strong', text: 'Self-check' })].concat(rows));
        });
      } }, h('span', null, icon('pulse', 18), ' Run self-check')),
      resultBox].filter(Boolean));
  }

  /* ---------- Screen switching ---------- */
  var routes = {
    home: renderHome,
    settings: function (r) { RQ.screens.settings(r); },
    chapters: function (r) { RQ.screens.chapters(r); },
    lognotes: function (r) { RQ.screens.lognotes(r); },
    saved: function (r, a) { RQ.screens.saved(r, a); },
    notes: function (r) { RQ.screens.notes(r); },
    note: function (r, a) { RQ.screens.note(r, a); }
  };
  function route() {
    var parts = (location.hash || '#home').slice(1).split('/');
    var fn = routes[parts[0]] || renderHome;
    var root = document.getElementById('app');
    RQ.freeUrls();
    document.querySelectorAll('.sheet,.backdrop,.lightbox').forEach(function (el) { el.remove(); });
    document.body.style.overflow = '';
    root.replaceChildren();
    window.scrollTo(0, 0);
    fn(root, parts.slice(1).join('/'));
  }
  window.addEventListener('hashchange', route);

  function boot() {
    RQ.db.open()
      .then(function () { return RQ.settings.load(); })
      .then(function () { return RQ.chapters.seed(); })
      .catch(function (e) { RQ.bootError = e; })
      .then(function () {
        route();
        setupServiceWorker();
        if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(function (p) { if (!p) navigator.storage.persist(); }).catch(function () {});
      });
  }
  boot();
})();
