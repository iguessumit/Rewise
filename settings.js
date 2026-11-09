/* settings.js - saved settings (colour, daily goal, vibration, exam dates) and the Settings screen. */
(function () {
  var RQ = window.RQ;
  var h = RQ.h, icon = RQ.icon;

  var DEFAULTS = { theme: 'gold', dailyGoal: 20, vibration: true, examMainDate: '', examAdvancedDate: '', lastBackupAt: null };
  var THEMES = [
    { id: 'gold', name: 'Gold', hex: '#E9D5A2', soft: '#F4E6BF', deep: '#DCC388', rgb: '233,213,162' },
    { id: 'violet', name: 'Violet', hex: '#A894FF', soft: '#D2C6FF', deep: '#8F7BEA', rgb: '168,148,255' },
    { id: 'ocean', name: 'Ocean', hex: '#7DB9FF', soft: '#B5DAFF', deep: '#5FA0EE', rgb: '125,185,255' },
    { id: 'sunset', name: 'Sunset', hex: '#FF9F80', soft: '#FFCDB8', deep: '#F58662', rgb: '255,159,128' },
    { id: 'emerald', name: 'Emerald', hex: '#7BDDA6', soft: '#B6F0CF', deep: '#5CC78B', rgb: '123,221,166' }
  ];
  var cache = {};
  Object.keys(DEFAULTS).forEach(function (k) { cache[k] = DEFAULTS[k]; });

  function applyTheme() {
    var t = THEMES.filter(function (x) { return x.id === cache.theme; })[0] || THEMES[0];
    var s = document.documentElement.style;
    s.setProperty('--a', t.hex);
    s.setProperty('--a-soft', t.soft);
    s.setProperty('--a-deep', t.deep);
    s.setProperty('--a-rgb', t.rgb);
  }
  function load() {
    return RQ.db.getAll('settings').then(function (rows) {
      rows.forEach(function (r) { if (Object.prototype.hasOwnProperty.call(DEFAULTS, r.key)) cache[r.key] = r.value; });
      applyTheme();
    });
  }
  function get(k) { return cache[k]; }
  function set(k, v) {
    var old = cache[k];
    cache[k] = v;
    if (k === 'theme') applyTheme();
    return RQ.db.put('settings', { key: k, value: v }).catch(function (e) {
      cache[k] = old;
      if (k === 'theme') applyTheme();
      RQ.toast('Could not save that setting.');
      throw e;
    });
  }
  /* Short vibration for right / wrong answers (used from Part 5). Respects the Settings switch. */
  function buzz(kind) {
    if (!cache.vibration || !navigator.vibrate) return;
    navigator.vibrate(kind === 'wrong' ? [40, 60, 40] : 25);
  }

  RQ.settings = { THEMES: THEMES, DEFAULTS: DEFAULTS, load: load, get: get, set: set };
  RQ.buzz = buzz;

  function section(title, body) { return h('section', { class: 'sec' }, h('div', { class: 'label', text: title }), body); }

  RQ.screens.settings = function (root) {
    root.append(RQ.header('Settings'));

    /* Colour */
    var swatches = h('div', { class: 'swatches' });
    function drawSwatches() {
      swatches.replaceChildren();
      THEMES.forEach(function (t) {
        var on = cache.theme === t.id;
        swatches.append(h('button', {
          class: 'swatch' + (on ? ' on' : ''), 'aria-label': t.name + (on ? ' (selected)' : ''),
          onclick: function () { RQ.settings.set('theme', t.id).then(drawSwatches).catch(function () {}); drawSwatches(); }
        }, h('span', { class: 'dot', style: 'background:' + t.hex }, on ? icon('check', 16) : null), h('span', { text: t.name })));
      });
    }
    drawSwatches();
    root.append(section('APP COLOUR', h('div', { class: 'glass pad' }, swatches,
      h('p', { class: 'hint', text: 'Gold is the default. The colour changes buttons, highlights and glows across the app.' }))));

    /* Daily goal */
    var goalVal = h('div', { class: 'big', text: String(cache.dailyGoal) });
    function setGoal(n) {
      n = Math.max(5, Math.min(200, n));
      goalVal.textContent = String(n);
      RQ.settings.set('dailyGoal', n).catch(function () {});
    }
    root.append(section('DAILY GOAL', h('div', { class: 'glass pad' },
      h('div', { class: 'stepper' },
        h('button', { class: 'round-btn', 'aria-label': 'Decrease goal', onclick: function () { setGoal(cache.dailyGoal - 5); } }, icon('minus', 22)),
        h('div', { class: 'center' }, goalVal, h('div', { class: 'hint', text: 'items cleared per day' })),
        h('button', { class: 'round-btn', 'aria-label': 'Increase goal', onclick: function () { setGoal(cache.dailyGoal + 5); } }, icon('plus', 22))))));

    /* Vibration */
    var sw = h('button', { class: 'switch' + (cache.vibration ? ' on' : ''), role: 'switch', 'aria-checked': String(cache.vibration), 'aria-label': 'Vibration on answers' }, h('span', { class: 'knob' }));
    sw.addEventListener('click', function () {
      var v = !cache.vibration;
      RQ.settings.set('vibration', v).catch(function () {});
      sw.classList.toggle('on', v);
      sw.setAttribute('aria-checked', String(v));
      if (v) RQ.buzz('right');
    });
    root.append(section('FEEL', h('div', { class: 'glass pad' },
      h('div', { class: 'line' }, h('div', null, h('div', { class: 'strong', text: 'Vibration on answers' }), h('div', { class: 'hint', text: 'Short buzz for right, double buzz for wrong' })), sw),
      h('button', { class: 'btn ghost', onclick: function () {
        if (!navigator.vibrate) { RQ.toast('This browser cannot vibrate.'); return; }
        navigator.vibrate(25);
        setTimeout(function () { navigator.vibrate([40, 60, 40]); }, 400);
      } }, 'Test vibration'))));

    /* Exam dates */
    function dateRow(label, key) {
      var input = h('input', { type: 'date', class: 'input', value: cache[key] || '', 'aria-label': label });
      input.addEventListener('change', function () { RQ.settings.set(key, input.value).catch(function () {}); });
      var clear = h('button', { class: 'btn ghost small', onclick: function () { input.value = ''; RQ.settings.set(key, '').catch(function () {}); } }, 'Clear');
      return h('div', { class: 'datebox' }, h('div', { class: 'strong', text: label }), h('div', { class: 'line' }, input, clear));
    }
    root.append(section('EXAM DATES (OPTIONAL)', h('div', { class: 'glass pad' },
      dateRow('JEE Main', 'examMainDate'), dateRow('JEE Advanced', 'examAdvancedDate'),
      h('p', { class: 'hint', text: 'Used later so revision gets tighter as an exam gets closer. Safe to leave empty.' }))));

    /* Storage */
    var storageLine = h('div', { class: 'strong', text: 'Checking...' });
    var storageHint = h('div', { class: 'hint', text: '' });
    var protectBtn = h('button', { class: 'btn', hidden: true }, 'Protect my data');
    function refreshStorage() {
      var persisted = navigator.storage && navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(null);
      var est = navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve(null);
      Promise.all([persisted, est]).then(function (r) {
        var p = r[0], e = r[1];
        storageLine.textContent = p === true ? 'Protected: Android will not clear your data when space is low' : (p === false ? 'Not protected yet' : 'Protection status unknown here');
        var used = e && typeof e.usage === 'number' ? 'Using ' + (e.usage / 1048576).toFixed(1) + ' MB. ' : '';
        storageHint.textContent = used + 'Backups (coming in a later part) are the real safety net.';
        protectBtn.hidden = p !== false;
      }).catch(function () { storageLine.textContent = 'Could not read storage status'; });
    }
    protectBtn.addEventListener('click', function () {
      if (!navigator.storage || !navigator.storage.persist) { RQ.toast('Not supported in this browser.'); return; }
      navigator.storage.persist().then(function (ok) {
        RQ.toast(ok ? 'Your data is now protected.' : 'Chrome did not grant it yet. Installing the app to the home screen usually helps.');
        refreshStorage();
      });
    });
    refreshStorage();
    root.append(section('STORAGE', h('div', { class: 'glass pad' }, storageLine, storageHint, protectBtn)));

    /* App version */
    root.append(section('APP', h('div', { class: 'glass pad' },
      h('div', { class: 'line' }, h('div', { class: 'strong', text: 'Version' }), h('div', { class: 'muted', text: self.APP_VERSION })),
      h('button', { class: 'btn', onclick: function () { RQ.checkUpdate(); } }, 'Check for updates'))));
  };
})();
