/* chapters.js - chapter storage (seeding, add, hide, delete) and the Chapters screen. */
(function () {
  var RQ = window.RQ;
  var h = RQ.h, icon = RQ.icon;
  var PREFIX = { Physics: 'phy', Chemistry: 'che', Maths: 'mat' };
  var CUSTOM_GROUP = 'My chapters';

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }

  function builtinRecords() {
    var out = [];
    RQ.SUBJECTS.forEach(function (subject) {
      var order = 0;
      RQ.BUILTIN[subject].forEach(function (g, gi) {
        g.items.forEach(function (name) {
          out.push({ id: PREFIX[subject] + '-' + slug(name), subject: subject, group: g.group, groupOrder: gi, order: order++, name: name, isCustom: false, hidden: false });
        });
      });
    });
    return out;
  }

  /* Adds any built-in chapter that is missing. Never touches chapters that already exist. */
  function seed() {
    return RQ.db.getAll('chapters').then(function (existing) {
      var have = {};
      existing.forEach(function (c) { have[c.id] = true; });
      var missing = builtinRecords().filter(function (c) { return !have[c.id]; });
      return missing.length ? RQ.db.putMany('chapters', missing).then(function () { return missing.length; }) : 0;
    });
  }

  function all() { return RQ.db.getAll('chapters'); }

  function sortList(list) {
    return list.slice().sort(function (a, b) {
      if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
      if (a.order !== b.order) return a.order - b.order;
      return a.name.localeCompare(b.name);
    });
  }

  /* For later parts (Log Notes, filters): chapters of one subject, hidden ones left out by default. */
  function listFor(subject, includeHidden) {
    return all().then(function (rows) {
      return sortList(rows.filter(function (c) { return c.subject === subject && (includeHidden || !c.hidden); }));
    });
  }

  function addCustom(subject, name, group) {
    name = String(name || '').trim().replace(/\s+/g, ' ');
    if (!name) return Promise.reject(new Error('Type a chapter name first.'));
    return all().then(function (rows) {
      var dupe = rows.some(function (c) { return c.subject === subject && c.name.toLowerCase() === name.toLowerCase(); });
      if (dupe) throw new Error('That chapter is already in the list.');
      var inSubject = rows.filter(function (c) { return c.subject === subject; });
      var groupRow = inSubject.filter(function (c) { return c.group === group; })[0];
      var rec = {
        id: PREFIX[subject] + '-c-' + Date.now().toString(36), subject: subject, group: group || CUSTOM_GROUP,
        groupOrder: groupRow ? groupRow.groupOrder : 999,
        order: 1000 + inSubject.length, name: name, isCustom: true, hidden: false
      };
      return RQ.db.put('chapters', rec).then(function () { return rec; });
    });
  }

  function setHidden(id, hidden) {
    return RQ.db.get('chapters', id).then(function (c) {
      if (!c) throw new Error('Chapter not found.');
      c.hidden = !!hidden;
      return RQ.db.put('chapters', c);
    });
  }

  /* A chapter that already has notes or questions cannot be deleted; hide it instead. */
  function removeCustom(id) {
    return Promise.all([RQ.db.countByIndex('notes', 'chapterId', id), RQ.db.countByIndex('questions', 'chapterId', id)]).then(function (n) {
      if (n[0] + n[1] > 0) throw new Error('This chapter has notes or questions. Hide it instead.');
      return RQ.db.delete('chapters', id);
    });
  }

  RQ.chapters = { seed: seed, all: all, listFor: listFor, addCustom: addCustom, setHidden: setHidden, removeCustom: removeCustom, CUSTOM_GROUP: CUSTOM_GROUP };

  /* ---------- Chapters screen ---------- */
  RQ.state = RQ.state || { subject: 'Physics', showHidden: false, query: '' };

  RQ.screens.chapters = function (root) {
    var st = RQ.state;
    var listBox = h('div', { class: 'list' });
    var summary = h('div', { class: 'hint center-text' });
    var seg = h('div', { class: 'seg' });
    var chip = h('button', { class: 'chip' });
    var rows = [];

    function drawSeg() {
      seg.replaceChildren();
      RQ.SUBJECTS.forEach(function (s) {
        seg.append(h('button', { class: 'seg-btn' + (st.subject === s ? ' on' : ''), onclick: function () { st.subject = s; drawSeg(); drawList(); fillGroups(); } }, s));
      });
    }
    function drawChip() {
      chip.className = 'chip' + (st.showHidden ? ' on' : '');
      chip.textContent = st.showHidden ? 'Showing hidden' : 'Show hidden';
    }
    chip.addEventListener('click', function () { st.showHidden = !st.showHidden; drawChip(); drawList(); });

    function drawList() {
      var subjectRows = rows.filter(function (c) { return c.subject === st.subject; });
      var hiddenCount = subjectRows.filter(function (c) { return c.hidden; }).length;
      var q = st.query.trim().toLowerCase();
      var shown = sortList(subjectRows.filter(function (c) {
        return (st.showHidden || !c.hidden) && (!q || c.name.toLowerCase().indexOf(q) !== -1 || c.group.toLowerCase().indexOf(q) !== -1);
      }));
      summary.textContent = subjectRows.length + ' chapters' + (hiddenCount ? ' - ' + hiddenCount + ' hidden' : '');
      listBox.replaceChildren();
      if (!shown.length) { listBox.append(h('div', { class: 'glass pad muted center-text', text: q ? 'No chapter matches your search.' : 'Nothing to show.' })); return; }
      var lastGroup = null, card = null;
      shown.forEach(function (c) {
        if (c.group !== lastGroup) {
          lastGroup = c.group;
          listBox.append(h('div', { class: 'label', text: c.group.toUpperCase() }));
          card = h('div', { class: 'glass rows' });
          listBox.append(card);
        }
        card.append(row(c));
      });
    }

    function reload() { return all().then(function (r) { rows = r; drawList(); }); }

    function row(c) {
      var armed = false, delBtn = null;
      var eye = h('button', { class: 'icon-btn', 'aria-label': (c.hidden ? 'Show ' : 'Hide ') + c.name, onclick: function () {
        setHidden(c.id, !c.hidden).then(reload).catch(function (e) { RQ.toast(e.message); });
      } }, icon(c.hidden ? 'eyeoff' : 'eye'));
      if (c.isCustom) {
        delBtn = h('button', { class: 'icon-btn danger', 'aria-label': 'Delete ' + c.name });
        delBtn.append(icon('trash'));
        delBtn.addEventListener('click', function () {
          if (!armed) {
            armed = true; delBtn.replaceChildren(document.createTextNode('Delete?')); delBtn.classList.add('armed');
            setTimeout(function () { if (armed) { armed = false; delBtn.classList.remove('armed'); delBtn.replaceChildren(icon('trash')); } }, 3000);
            return;
          }
          removeCustom(c.id).then(reload).catch(function (e) { RQ.toast(e.message); armed = false; delBtn.classList.remove('armed'); delBtn.replaceChildren(icon('trash')); });
        });
      }
      return h('div', { class: 'row' + (c.hidden ? ' dim' : '') },
        h('div', { class: 'row-main' }, h('span', { class: 'row-name', text: c.name }), c.isCustom ? h('span', { class: 'badge', text: 'Custom' }) : null),
        eye, delBtn);
    }

    /* Search */
    var search = h('input', { class: 'input', type: 'search', placeholder: 'Search chapters', 'aria-label': 'Search chapters', value: st.query });
    search.addEventListener('input', function () { st.query = search.value; drawList(); });

    /* Add form */
    var nameIn = h('input', { class: 'input', type: 'text', placeholder: 'New chapter name', 'aria-label': 'New chapter name', maxlength: '80' });
    var groupSel = h('select', { class: 'input', 'aria-label': 'Group' });
    function fillGroups() {
      var groups = RQ.BUILTIN[st.subject].map(function (g) { return g.group; });
      groups.push(CUSTOM_GROUP);
      groupSel.replaceChildren();
      groups.forEach(function (g) { groupSel.append(h('option', { value: g, text: g })); });
      groupSel.value = CUSTOM_GROUP;
    }
    var form = h('div', { class: 'glass pad', hidden: true },
      h('div', { class: 'strong', text: 'Add your own chapter' }),
      h('div', { class: 'hint', text: 'It is added to the subject selected above.' }),
      nameIn, groupSel,
      h('button', { class: 'btn', onclick: function () {
        addCustom(st.subject, nameIn.value, groupSel.value).then(function () {
          nameIn.value = ''; RQ.toast('Chapter added.'); return reload();
        }).catch(function (e) { RQ.toast(e.message); });
      } }, 'Add chapter'));
    var addBtn = h('button', { class: 'btn', onclick: function () { form.hidden = !form.hidden; if (!form.hidden) nameIn.focus(); } }, icon('plus', 18), ' Add your own chapter');

    root.append(RQ.header('Chapters'), seg, h('div', { class: 'line gap' }, summary, chip), search, addBtn, form, listBox);
    drawSeg(); drawChip(); fillGroups();
    reload().catch(function (e) { listBox.append(h('div', { class: 'glass pad', text: 'Could not load chapters: ' + e.message })); });
  };
})();
