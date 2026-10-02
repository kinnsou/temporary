/* Pattern 10 — 教材管理（規格 §31）
 * 不用改程式就能：新增／修改句型、新增／停用變形題、用 AI 擴充題庫（人在迴路）、審核、看判題紀錄與錯誤標籤。
 * 所有修改只存「差異」在瀏覽器裡（p10.content.v1），不會動到程式附的原始教材。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const U = P10.util, E = P10.engine, S = P10.srs, Store = P10.store, UI = P10.ui, VOC = P10.vocab;
  const h = UI.h;
  const A = () => P10.app;
  const Admin = (P10.admin = {});

  /* ------------------------------------------------------------------ 資料操作 */
  const isSeedPattern = (id) => P10.seed.patterns.some((p) => p.id === id);
  const isSeedEx = (id) => P10.seed.exercises.some((e) => e.id === id);
  const commit = (ov) => { Store.saveOverlay(ov); A().refreshContent(); };

  function patchPattern(id, patch) {
    const ov = Store.loadOverlay();
    if (isSeedPattern(id)) ov.patterns[id] = Object.assign({}, ov.patterns[id] || {}, patch);
    else { const i = ov.newPatterns.findIndex((p) => p.id === id); if (i >= 0) ov.newPatterns[i] = Object.assign({}, ov.newPatterns[i], patch); }
    commit(ov);
  }
  function patchExercise(id, patch) {
    const ov = Store.loadOverlay();
    if (isSeedEx(id)) ov.exercises[id] = Object.assign({}, ov.exercises[id] || {}, patch);
    else { const i = ov.newExercises.findIndex((e) => e.id === id); if (i >= 0) ov.newExercises[i] = Object.assign({}, ov.newExercises[i], patch); }
    commit(ov);
  }
  function deleteExercise(id) {
    if (isSeedEx(id)) return;
    const ov = Store.loadOverlay();
    ov.newExercises = ov.newExercises.filter((e) => e.id !== id);
    commit(ov);
  }
  function addExercises(list) {
    const ov = Store.loadOverlay();
    list.forEach((e) => ov.newExercises.push(e));
    commit(ov);
  }
  function nextUserId(pid) {
    const used = new Set(A().content.exercises.map((e) => e.id));
    let n = 1;
    while (used.has(pid + '-U' + String(n).padStart(2, '0'))) n++;
    return pid + '-U' + String(n).padStart(2, '0');
  }

  /* ------------------------------------------------------------------ 共用元件 */
  const back = (href, label) => h('a', { class: 'link', href, style: { display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '-6px' } }, UI.icon('back'), label);
  const chip = (t, cls) => h('span', { class: 'chip ' + (cls || '') }, t);
  const title = (t, sub) => h('div', { style: { margin: '4px 4px 16px' } }, h('h1', { class: 'h-page' }, t), sub ? h('p', { class: 'muted small mt4' }, sub) : null);
  function field(label, input, hint) { return h('div', { class: 'field' }, h('label', null, label), input, hint ? h('p', { class: 'tiny' }, hint) : null); }
  function txt(value, onInput, attrs) {
    const i = h('input', Object.assign({ class: 'txt', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' }, attrs || {}));
    i.value = value == null ? '' : value;
    i.addEventListener('input', () => onInput(i.value));
    return i;
  }
  function area(value, onInput, rows, attrs) {
    const t = h('textarea', Object.assign({ class: 'txt', rows: rows || 3, spellcheck: 'false', autocapitalize: 'off' }, attrs || {}));
    t.value = value == null ? '' : value;
    t.addEventListener('input', () => onInput(t.value));
    return t;
  }
  const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);

  function detectorOf(pat) {
    const R = P10.rules || {};
    if (R.detect && R.detect[pat.id]) return R.detect[pat.id];
    if (pat.detector) { try { const re = new RegExp(pat.detector, 'i'); return (c) => re.test(c.str); } catch (e) { return null; } }
    return null;
  }

  /* 檢查一題變形題。回傳 {errors, warnings}。strict（AI 匯入用）：沒用到句型、字彙超出範圍都直接擋下（規格 §19、§33） */
  function checkExercise(d, pat, selfId, strict) {
    const errors = [], warnings = [];
    const zh = (d.zh || '').trim(), en = (d.en || '').trim();
    if (!zh) errors.push('中文提示不能是空的');
    if (!en) errors.push('英文標準答案不能是空的');
    if (!en) return { errors, warnings };
    const acc = d.acc || [];
    acc.forEach((p) => { if ((p.match(/\{/g) || []).length !== (p.match(/\}/g) || []).length) errors.push('「' + p + '」的大括號 { } 沒有成對'); });
    if (!errors.length) {
      const ex = { en, acc };
      const r = E.judge({ answer: en, ex, pattern: pat });
      if (r.status !== 'correct') errors.push('標準答案沒有被判成正確，請檢查拼字');
      let total = 0; acc.forEach((p) => { total += E.expand(p).length; });
      if (total > 400) warnings.push('「也可以」展開成 ' + total + ' 種說法，有點多');
      const det = detectorOf(pat);
      if (det) {
        const c = (t) => ({ tokens: E.tokenize(t), str: E.normalize(t) });
        if (!det(c(en))) (strict ? errors : warnings).push('這句沒有用到這個句型（' + pat.short + '）');
        const bad = []; acc.forEach((p) => E.expand(p).forEach((s) => { if (!det(c(s))) bad.push(s); }));
        if (bad.length) warnings.push('有 ' + bad.length + ' 種「也可以」的說法沒有用到這個句型，例如：' + bad[0]);
      }
    }
    const v = VOC.check(en);
    if (v.unknown.length) ((strict && (v.unknown.length > 1 || v.ratio < 0.9)) ? errors : warnings).push('超出入門字彙的字：' + v.unknown.join('、') + (v.unknown.length > 1 ? '（一題最多一個新字）' : ''));
    const norm = E.normalize(en);
    const dup = A().content.exercises.find((e) => e.pattern === pat.id && e.id !== selfId && E.normalize(e.en) === norm);
    if (dup) errors.push('和既有的題目重複（' + dup.id + '）');
    return { errors, warnings };
  }

  /* ------------------------------------------------------------------ 首頁 */
  function home() {
    const a = A(), content = a.content, state = a.state;
    const root = h('div');
    UI.add(root, back('#/settings', '設定'), title('教材管理', '教材和程式分開：改了不用動程式，也不會弄壞原始教材。'));
    const rows = content.allPatterns.slice().sort((x, y) => x.order - y.order).map((p) => {
      const ex = content.exercises.filter((e) => e.pattern === p.id);
      const active = ex.filter((e) => e.active !== false && e.status !== 'pending' && !e.holdout).length;
      const hold = ex.filter((e) => e.active !== false && e.holdout).length;
      const pend = ex.filter((e) => e.status === 'pending').length;
      return h('a', { class: 'row', href: '#/admin/p/' + p.id },
        h('span', { class: 'num' }, String(p.order).padStart(2, '0')),
        h('div', { class: 'grow' }, h('div', { class: 't' }, p.label), h('div', { class: 's' }, active + ' 題訓練' + (hold ? '　· ' + hold + ' 題檢測' : '') + (p.active === false ? '　· 已停用' : ''))),
        pend ? chip(pend + ' 待審核', 'amber') : null, UI.icon('chevron'));
    });
    UI.add(root, h('div', { class: 'list' }, rows),
      h('button', { class: 'btn secondary mt16', onclick: () => A().go('#/admin/new') }, UI.icon('plus'), '新增句型'));

    const ovCount = Object.values(state.overrides).reduce((n, l) => n + l.length, 0);
    UI.add(root, h('h2', { class: 'h-sec' }, '檢視'),
      h('div', { class: 'list' },
        h('a', { class: 'row', href: '#/admin/overrides' }, h('div', { class: 'grow' }, h('div', { class: 't', style: { fontFamily: 'var(--font-ui)', fontSize: '17px' } }, '我認定的「也可以」'), h('div', { class: 's' }, ovCount + ' 個說法')), UI.icon('chevron')),
        h('a', { class: 'row', href: '#/admin/log' }, h('div', { class: 'grow' }, h('div', { class: 't', style: { fontFamily: 'var(--font-ui)', fontSize: '17px' } }, '判題紀錄'), h('div', { class: 's' }, '最近的答案、判定與錯誤標籤')), UI.icon('chevron')),
        h('a', { class: 'row', href: '#/admin/errors' }, h('div', { class: 'grow' }, h('div', { class: 't', style: { fontFamily: 'var(--font-ui)', fontSize: '17px' } }, '錯誤標籤'), h('div', { class: 's' }, '系統記下來的錯誤類型')), UI.icon('chevron'))));

    const ov = Store.loadOverlay();
    const changed = Object.keys(ov.patterns).length + Object.keys(ov.exercises).length + ov.newPatterns.length + ov.newExercises.length;
    UI.add(root, h('h2', { class: 'h-sec' }, '教材備份'),
      h('div', { class: 'card' },
        h('p', { class: 'muted small' }, changed ? '你已經修改／新增了 ' + changed + ' 處。' : '目前使用的是原始教材（沒有修改）。'),
        h('div', { class: 'btn-row mt12' },
          h('button', { class: 'btn secondary', onclick: () => UI.download('pattern10-content-' + U.dayKey(U.now()) + '.json', JSON.stringify({ app: 'pattern10-content', overlay: Store.loadOverlay() })) }, UI.icon('download'), '匯出教材'),
          h('button', { class: 'btn secondary', onclick: importContent }, UI.icon('upload'), '匯入教材')),
        changed ? h('button', { class: 'btn danger mt12', onclick: () => UI.confirm('還原成原始教材？', '你對教材的修改和新增的題目會全部移除（學習進度不受影響）。', '還原', () => { commit(Store.emptyOverlay()); A().render(); UI.toast('已還原成原始教材'); }, 'danger') }, '還原成原始教材') : null));
    return root;
  }

  function importContent() {
    const inp = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' }, onchange: () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const d = JSON.parse(String(rd.result));
          if (!d || d.app !== 'pattern10-content' || !d.overlay) throw new Error('不是教材檔');
          commit(Object.assign(Store.emptyOverlay(), d.overlay)); A().render(); UI.toast('已匯入教材');
        } catch (e) { UI.toast('匯入失敗：' + e.message, 3500); }
      };
      rd.readAsText(f);
    } });
    g.document.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  }

  /* ------------------------------------------------------------------ 句型編輯 */
  function patternScreen(pid) {
    const a = A(), content = a.content;
    const pat = content.patternById[pid];
    if (!pat) { a.go('#/admin'); return h('div'); }
    const root = h('div');
    UI.add(root, back('#/admin', '教材管理'), title(pat.label, pat.id + ' · ' + pat.title + (isSeedPattern(pid) ? '' : '（自訂）')));

    // ----- 基本資料 -----
    const d = { mother: pat.mother, zh: pat.zh, template: pat.template, explain: pat.explain, title: pat.title, label: pat.label, short: pat.short, order: pat.order, active: pat.active !== false,
      cOk: (pat.contrast[0] || {}).ok || '', cNg: (pat.contrast[0] || {}).ng || '', cNote: (pat.contrast[0] || {}).note || '',
      prompts: ((pat.free && pat.free.prompts) || []).join('\n'), examples: ((pat.free && pat.free.examples) || []).join('\n'), A: (pat.cloze.A || []).slice(), B: (pat.cloze.B || []).slice(), detector: pat.detector || '' };
    const clozeBox = h('div');
    function drawCloze() {
      UI.clear(clozeBox);
      const words = E.displayWords(d.mother);
      ['A', 'B'].forEach((lv) => {
        clozeBox.append(h('div', { class: 'tiny', style: { margin: '10px 0 6px', fontWeight: 600 } }, lv === 'A' ? '填空 A（遮 1～2 個關鍵字）' : '填空 B（遮掉句型的骨架，約一半）'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } }, words.map((w, i) => {
            const on = d[lv].indexOf(i) >= 0;
            const b = h('button', { type: 'button', class: 'chip' + (on ? ' accent' : ''), style: { fontSize: '15px', minHeight: '34px' }, onclick: () => { const k = d[lv].indexOf(i); if (k >= 0) d[lv].splice(k, 1); else d[lv].push(i); d[lv].sort((x, y) => x - y); drawCloze(); } }, w);
            return b;
          })));
      });
    }
    drawCloze();
    const issues = h('div');
    const saveBtn = h('button', { class: 'btn mt16', onclick: save }, '儲存句型');
    function save() {
      const errs = [];
      if (!d.mother.trim()) errs.push('母句不能是空的');
      if (!d.zh.trim()) errs.push('中文翻譯不能是空的');
      if (!d.A.length || !d.B.length) errs.push('填空 A、B 至少要選一個字');
      if (errs.length) { UI.clear(issues); errs.forEach((e) => issues.append(h('div', { class: 'banner' }, e))); return; }
      patchPattern(pid, {
        mother: d.mother.trim(), zh: d.zh.trim(), template: d.template.trim(), explain: d.explain.trim(), title: d.title.trim(), label: d.label.trim(), short: d.short.trim(), order: +d.order || pat.order, active: d.active,
        contrast: d.cOk.trim() ? [{ ok: d.cOk.trim(), ng: d.cNg.trim(), note: d.cNote.trim() }] : [],
        free: { prompts: lines(d.prompts), examples: lines(d.examples) }, cloze: { A: d.A, B: d.B }, detector: d.detector.trim() || undefined
      });
      UI.clear(issues); UI.toast('已儲存');
      a.render();
    }
    UI.add(root, h('div', { class: 'card' },
      field('母句（英文）', txt(d.mother, (v) => { d.mother = v; drawCloze(); })),
      field('中文翻譯', txt(d.zh, (v) => { d.zh = v; })),
      field('句型模板', txt(d.template, (v) => { d.template = v; }), '例：I wish [非現實狀態].'),
      field('一個重點（解釋，50～120 字，白話）', area(d.explain, (v) => { d.explain = v; }, 4)),
      h('div', { class: 'field' }, h('label', null, '遮字設計（點一下字來選）'), clozeBox,
        h('button', { class: 'link', onclick: () => { const c = Store.autoCloze(d.mother); d.A = c.A; d.B = c.B; drawCloze(); } }, '自動產生')),
      field('主題名稱', txt(d.title, (v) => { d.title = v; })),
      field('清單上的短名稱', txt(d.label, (v) => { d.label = v; }), '例：I wish…'),
      field('完整短名稱（用在提示）', txt(d.short, (v) => { d.short = v; }), '例：I wish …'),
      field('順序', txt(d.order, (v) => { d.order = v; }, { type: 'number', inputmode: 'numeric' })),
      field('對比例句：對的', txt(d.cOk, (v) => { d.cOk = v; })),
      field('對比例句：錯的', txt(d.cNg, (v) => { d.cNg = v; })),
      field('對比說明', txt(d.cNote, (v) => { d.cNote = v; })),
      field('自由造句的題目（一行一個）', area(d.prompts, (v) => { d.prompts = v; }, 3)),
      field('自由造句的參考範例（一行一個）', area(d.examples, (v) => { d.examples = v; }, 3)),
      isSeedPattern(pid) ? null : field('偵測用規則（進階，選填）', txt(d.detector, (v) => { d.detector = v; }), '用來判斷學習者有沒有用到這個句型，是正規表示式。例：\\bwish\\b'),
      h('div', { class: 'switch-row' }, h('div', null, h('div', null, '啟用這個句型'), h('div', { class: 'tiny' }, '停用後不會出現在訓練裡（進度保留）')), UI.toggle(d.active, (v) => { d.active = v; })),
      issues, saveBtn));

    // ----- 變形題 -----
    const exs = content.exercises.filter((e) => e.pattern === pid).sort((x, y) => x.id.localeCompare(y.id));
    const filt = { v: 'all' };
    const listBox = h('div');
    function drawList() {
      UI.clear(listBox);
      const match = (e) => filt.v === 'all' || (filt.v === 'pending' && e.status === 'pending') || (filt.v === 'off' && e.active === false && e.status !== 'pending') || (filt.v === 'on' && e.active !== false && e.status !== 'pending') || (filt.v === 'hold' && e.holdout);
      const shown = exs.filter(match);
      listBox.append(h('div', { class: 'list' }, shown.length ? shown.map((e) => {
        const off = e.active === false && e.status !== 'pending';
        return h('div', { class: 'row', style: { alignItems: 'flex-start', opacity: off ? 0.55 : 1 } },
          h('a', { href: '#/admin/e/' + e.id, class: 'grow', style: { textDecoration: 'none', color: 'inherit' } },
            h('div', { class: 's' }, e.id + '　Lv.' + e.level + (e.holdout ? '　· 檢測用' : '') + (e.source === 'ai_generated' ? '　· AI' : e.source === 'user' ? '　· 自訂' : '')),
            h('div', { style: { fontSize: '16px', marginTop: '2px' } }, e.zh),
            h('div', { class: 'en', style: { fontSize: '16px', color: 'var(--ink-2)', marginTop: '2px' } }, e.en)),
          e.status === 'pending'
            ? h('div', { style: { display: 'grid', gap: '6px' } }, h('button', { class: 'btn sm', onclick: () => { patchExercise(e.id, { status: undefined, active: true }); a.render(); } }, '通過'), h('button', { class: 'btn sm danger', onclick: () => { deleteExercise(e.id); a.render(); } }, '刪除'))
            : h('button', { class: 'btn sm secondary', onclick: () => { patchExercise(e.id, { active: off }); a.render(); } }, off ? '啟用' : '停用'));
      }) : h('div', { class: 'row' }, h('span', { class: 'muted' }, '沒有符合的題目'))));
    }
    const pendN = exs.filter((e) => e.status === 'pending').length;
    UI.add(root, h('h2', { class: 'h-sec' }, '變形題（' + exs.length + '）'),
      UI.seg([['all', '全部'], ['on', '啟用'], ['pending', '待審核' + (pendN ? '（' + pendN + '）' : '')], ['off', '停用'], ['hold', '檢測']], 'all', (v) => { filt.v = v; drawList(); }),
      h('div', { class: 'mt12' }, listBox),
      h('div', { class: 'btn-row mt16' },
        h('button', { class: 'btn secondary', onclick: () => a.go('#/admin/e/new:' + pid) }, UI.icon('plus'), '新增一題'),
        h('button', { class: 'btn secondary', onclick: () => a.go('#/admin/p/' + pid + '/ai') }, UI.icon('sparkle'), '用 AI 產生')));
    drawList();
    return root;
  }

  /* ------------------------------------------------------------------ 新增句型 */
  function newPatternScreen() {
    const a = A(), content = a.content;
    /* 自訂句型用 U01、U02…編號、排在所有內建句型之後（內建教材會一章一章增加，不能和自訂的撞號） */
    const maxOrder = Math.max.apply(null, content.allPatterns.map((p) => p.order));
    const order = Math.max(1000, maxOrder + 1);
    let un = content.allPatterns.filter((p) => p.source === 'user').length + 1;
    while (content.patternById['U' + String(un).padStart(2, '0')]) un++;
    const id = 'U' + String(un).padStart(2, '0');
    const d = { mother: '', zh: '', template: '', explain: '', title: '', short: '' };
    const issues = h('div');
    const root = h('div');
    UI.add(root, back('#/admin', '教材管理'), title('新增句型', '新句型會排在最後，前一個句型練到「能暗誦」後解鎖。'),
      h('div', { class: 'card' },
        field('母句（英文）', txt(d.mother, (v) => { d.mother = v; }), '一句高品質、日常會用的完整句子。'),
        field('中文翻譯', txt(d.zh, (v) => { d.zh = v; })),
        field('句型模板', txt(d.template, (v) => { d.template = v; }), '例：I\'m good at [動名詞].'),
        field('主題名稱', txt(d.title, (v) => { d.title = v; }), '例：擅長'),
        field('短名稱', txt(d.short, (v) => { d.short = v; }), '例：I\'m good at …'),
        field('一個重點（解釋）', area(d.explain, (v) => { d.explain = v; }, 3)),
        issues,
        h('button', { class: 'btn mt16', onclick: () => {
          const errs = [];
          ['mother', 'zh', 'template', 'title', 'short'].forEach((k) => { if (!d[k].trim()) errs.push('「' + ({ mother: '母句', zh: '中文翻譯', template: '句型模板', title: '主題名稱', short: '短名稱' })[k] + '」不能是空的'); });
          if (errs.length) { UI.clear(issues); errs.forEach((e) => issues.append(h('div', { class: 'banner' }, e))); return; }
          const ov = Store.loadOverlay();
          ov.newPatterns.push({ id, order, title: d.title.trim(), label: d.short.trim().replace(/\s*…?\s*$/, '…'), short: d.short.trim(), mother: d.mother.trim(), zh: d.zh.trim(), template: d.template.trim(), explain: d.explain.trim(), active: true, source: 'user' });
          commit(ov); UI.toast('已新增 ' + id); a.go('#/admin/p/' + id);
        } }, '新增')));
    return root;
  }

  /* ------------------------------------------------------------------ 單題編輯 */
  function exerciseScreen(key) {
    const a = A(), content = a.content;
    const isNew = key.indexOf('new:') === 0;
    const pid = isNew ? key.slice(4) : (content.byId[key] || {}).pattern;
    const pat = content.patternById[pid];
    if (!pat) { a.go('#/admin'); return h('div'); }
    const ex = isNew ? null : content.byId[key];
    const d = ex ? { zh: ex.zh, en: ex.en, accText: (ex.acc || []).join('\n'), level: ex.level, focus: ex.focus || pat.focus || '', active: ex.active !== false, holdout: !!ex.holdout }
      : { zh: '', en: '', accText: '', level: 2, focus: pat.focus || '', active: true, holdout: false };
    const root = h('div');
    const msgs = h('div');
    const preview = h('div');
    function drawPreview() {
      UI.clear(preview);
      const acc = lines(d.accText);
      let list = [];
      try { acc.forEach((p) => E.expand(p).forEach((s) => list.push(s))); } catch (e) { list = []; }
      if (list.length) preview.append(h('div', { class: 'tiny' }, '展開後共 ' + list.length + ' 種「也可以」的說法，例如：'), h('div', { class: 'small en', style: { marginTop: '4px' } }, list.slice(0, 4).map((s) => h('div', null, '• ' + s))));
    }
    function validate() {
      const r = checkExercise({ zh: d.zh, en: d.en, acc: lines(d.accText) }, pat, ex ? ex.id : null);
      UI.clear(msgs);
      r.errors.forEach((e) => msgs.append(h('div', { class: 'banner', style: { background: 'var(--clay-soft)', color: 'var(--clay)' } }, e)));
      r.warnings.forEach((w) => msgs.append(h('div', { class: 'banner' }, w)));
      return r;
    }
    UI.add(root, back('#/admin/p/' + pid, pat.label), title(isNew ? '新增變形題' : '編輯變形題', ex ? ex.id : null),
      h('div', { class: 'card' },
        field('中文提示', txt(d.zh, (v) => { d.zh = v; })),
        field('英文標準答案', txt(d.en, (v) => { d.en = v; }, { lang: 'en' }), '要用到「' + pat.short + '」。'),
        field('也算對的說法（一行一個）', area(d.accText, (v) => { d.accText = v; drawPreview(); }, 4, { lang: 'en' }), '可以用 {a|b} 表示二選一，{ before|} 表示可有可無。縮寫（I\'m / I am）不用重複寫。'),
        preview,
        field('難度', UI.seg([[1, '1 換名詞'], [2, '2 換主詞'], [3, '3 加情境']], d.level, (v) => { d.level = v; })),
        field('重點錯誤類型', (function () {
          const sel = h('select', { class: 'txt', onchange: () => { d.focus = sel.value; } }, h('option', { value: '' }, '（不指定）'), Object.keys(E.TAGS).map((t) => h('option', { value: t, selected: d.focus === t }, t + '　' + E.TAGS[t])));
          return sel;
        })(), '答錯這類錯誤時，會優先挑同類型的題目來「回馬槍」。'),
        h('div', { class: 'switch-row' }, h('div', null, h('div', null, '留作能力檢測用'), h('div', { class: 'tiny' }, '平常訓練不會出現，只在「能力檢測」裡考')), UI.toggle(d.holdout, (v) => { d.holdout = v; })),
        h('div', { class: 'switch-row' }, h('div', null, h('div', null, '啟用')), UI.toggle(d.active, (v) => { d.active = v; })),
        msgs,
        h('div', { class: 'btn-row mt16' },
          h('button', { class: 'btn secondary', onclick: validate }, '檢查'),
          h('button', { class: 'btn', onclick: () => {
            const r = validate();
            if (r.errors.length) return;
            const body = { zh: d.zh.trim(), en: d.en.trim(), acc: lines(d.accText), level: d.level, focus: d.focus || null, active: d.active, holdout: d.holdout };
            if (isNew) addExercises([Object.assign({ id: nextUserId(pid), pattern: pid, source: 'user' }, body)]);
            else patchExercise(ex.id, body);
            UI.toast('已儲存'); a.go('#/admin/p/' + pid);
          } }, '儲存')),
        !isNew && !isSeedEx(ex.id) ? h('button', { class: 'btn danger mt12', onclick: () => UI.confirm('刪除這一題？', '自訂的題目刪除後無法復原。', '刪除', () => { deleteExercise(ex.id); a.go('#/admin/p/' + pid); }, 'danger') }, '刪除這一題') : null));
    drawPreview();
    return root;
  }

  /* ------------------------------------------------------------------ AI 產生變形（人在迴路） */
  const AI_FOCUS = Object.keys(E.TAGS).filter((t) => ['STT_UNCERTAIN', 'PATTERN_NOT_USED', 'MEANING_CHANGED', 'OTHER', 'WORD_EXTRA'].indexOf(t) < 0);

  Admin.buildPrompt = function (pat, content, n, level) {
    const ex = content.exercises.filter((e) => e.pattern === pat.id && e.status !== 'pending').slice(0, 16).map((e) => '  - ' + e.zh + ' → ' + e.en).join('\n');
    const lv = level === 'mix' ? '混合 Level 1～3（大約各三分之一）' : 'Level ' + level;
    return [
      '你是英文教材變形器。請為下面這個句型，產生 ' + n + ' 個「變形題」（中文提示 → 英文答案）。',
      '',
      '【句型】' + pat.template,
      '【母句】' + pat.mother + '（' + pat.zh + '）',
      '【重點】' + (pat.explain || ''),
      '',
      '規則：',
      '1. 只能使用指定的句型，不得引入新的主要文法。',
      '2. 每題只測一個主要變化。',
      '3. 中文必須自然、英文必須自然，而且只有一種最自然的英文讀法。',
      '4. 難度：' + lv + '。',
      '   Level 1：只替換名詞（例：I wish I had more money.）',
      '   Level 2：替換主詞／動詞（例：I wish she lived closer.）',
      '   Level 3：加入時間或情境（例：I wish I had more time to spend with my family.）',
      '5. 字彙控制：每句 90% 以上的字要出自下面的「允許字彙」，一題最多一個新字。',
      '6. 不要和下面既有的題目重複：',
      ex,
      '7. 為每題列出 2～4 個「也可以接受的英文說法」（acceptable_answers）。只列「文法正確、意思相同、而且同樣用到這個句型」的說法；縮寫（I\'m / I am）不用重複列。',
      '8. focus 只能是這些之一：' + AI_FOCUS.join('、') + '（選答錯時最可能犯的那一類）。',
      '',
      '輸出格式：只輸出一個 JSON 陣列，前後不要有任何其他文字：',
      '[',
      '  { "prompt_zh": "真希望我有更多錢。", "target_en": "I wish I had more money.", "acceptable_answers": ["I wish I had extra money."], "level": 1, "focus": "WISH_REALITY" }',
      ']',
      '',
      '允許字彙（原形；-s / -ed / -ing 變化可以用）：',
      VOC.WORDS.trim().replace(/\s+/g, ' ')
    ].join('\n');
  };

  Admin.parseAI = function (text) {
    let t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    const i = t.indexOf('['), j = t.lastIndexOf(']');
    if (i < 0 || j < i) throw new Error('找不到 JSON 陣列（要以 [ 開頭、] 結尾）。');
    let arr;
    try { arr = JSON.parse(t.slice(i, j + 1)); } catch (e) { throw new Error('JSON 格式有誤：' + e.message); }
    if (!Array.isArray(arr)) throw new Error('內容不是陣列。');
    return arr.map((x) => ({
      zh: String(x.prompt_zh || x.zh || '').trim(), en: String(x.target_en || x.en || '').trim(),
      acc: (x.acceptable_answers || x.acc || []).map((s) => String(s).trim()).filter(Boolean), level: [1, 2, 3].indexOf(+x.level) >= 0 ? +x.level : 2,
      focus: AI_FOCUS.indexOf(x.focus) >= 0 ? x.focus : null
    }));
  };

  function aiScreen(pid) {
    const a = A(), content = a.content;
    const pat = content.patternById[pid];
    if (!pat) { a.go('#/admin'); return h('div'); }
    const root = h('div');
    const st = { n: 10, level: 'mix' };
    const promptBox = h('textarea', { class: 'txt', rows: 7, readonly: true, style: { fontSize: '13px', fontFamily: 'monospace' } });
    const redraw = () => { promptBox.value = Admin.buildPrompt(pat, a.content, st.n, st.level); };
    redraw();
    const pasteBox = area('', () => {}, 6, { placeholder: '把 AI 回傳的 JSON 貼在這裡…' });
    const result = h('div');
    let parsed = [];
    function check() {
      UI.clear(result); parsed = [];
      let items;
      try { items = Admin.parseAI(pasteBox.value); } catch (e) { result.append(h('div', { class: 'banner', style: { background: 'var(--clay-soft)', color: 'var(--clay)' } }, e.message)); return; }
      if (!items.length) { result.append(h('div', { class: 'banner' }, '陣列是空的。')); return; }
      const seen = new Set();
      items.forEach((it) => {
        const r = checkExercise(it, pat, null, true);
        const key = E.normalize(it.en);
        if (seen.has(key)) r.errors.push('這批裡面重複了');
        seen.add(key);
        if (it.acc.length < 1) r.warnings.push('沒有列出「也可以」的說法（之後使用者答了不同說法可能被判錯）');
        parsed.push({ it, r, on: r.errors.length === 0 });
      });
      drawResult();
    }
    function drawResult() {
      UI.clear(result);
      const okN = parsed.filter((x) => x.on).length;
      result.append(h('p', { class: 'muted small mt12' }, '共 ' + parsed.length + ' 題，' + parsed.filter((x) => !x.r.errors.length).length + ' 題可以匯入。勾選的會放進「待審核」。'),
        h('div', { class: 'list mt8' }, parsed.map((x) => {
          const bad = x.r.errors.length > 0;
          const cb = h('input', { type: 'checkbox', checked: x.on, disabled: bad, style: { width: '22px', height: '22px', flex: 'none' }, onchange: () => { x.on = cb.checked; drawResult(); } });
          return h('label', { class: 'row', style: { alignItems: 'flex-start', opacity: bad ? 0.6 : 1 } }, cb,
            h('div', { class: 'grow' },
              h('div', { class: 's' }, 'Lv.' + x.it.level),
              h('div', { style: { fontSize: '16px' } }, x.it.zh), h('div', { class: 'en', style: { fontSize: '16px', color: 'var(--ink-2)' } }, x.it.en),
              x.it.acc.length ? h('div', { class: 'tiny' }, '也可以：' + x.it.acc.join('　／　')) : null,
              x.r.errors.map((e) => h('div', { class: 'tiny', style: { color: 'var(--clay)', fontWeight: 600 } }, '✗ ' + e)),
              x.r.warnings.map((w) => h('div', { class: 'tiny', style: { color: 'var(--amber)' } }, '△ ' + w))));
        })),
        h('button', { class: 'btn mt16', disabled: okN === 0 ? true : null, onclick: () => {
          const list = parsed.filter((x) => x.on).map((x) => ({ id: null, pattern: pid, level: x.it.level, zh: x.it.zh, en: x.it.en, acc: x.it.acc, focus: x.it.focus || pat.focus || null, source: 'ai_generated', status: 'pending', active: false, holdout: false }));
          const ids = new Set(a.content.exercises.map((e) => e.id));
          let n = 1;
          list.forEach((e) => { while (ids.has(pid + '-U' + String(n).padStart(2, '0'))) n++; e.id = pid + '-U' + String(n).padStart(2, '0'); ids.add(e.id); });
          addExercises(list);
          UI.toast('已匯入 ' + list.length + ' 題，請到句型頁「待審核」確認');
          a.go('#/admin/p/' + pid);
        } }, '匯入 ' + okN + ' 題（先放待審核）'));
    }
    UI.add(root, back('#/admin/p/' + pid, pat.label), title('用 AI 產生變形題', '不用金鑰：複製提示詞，貼到任何 AI（ChatGPT、Claude…），再把回傳的 JSON 貼回來。'),
      h('div', { class: 'card' },
        h('div', { class: 'tiny', style: { fontWeight: 600 } }, '① 設定'),
        field('要幾題', UI.seg([[5, '5'], [10, '10'], [20, '20']], st.n, (v) => { st.n = v; redraw(); })),
        field('難度', UI.seg([['mix', '混合'], [1, 'Lv.1'], [2, 'Lv.2'], [3, 'Lv.3']], st.level, (v) => { st.level = v; redraw(); })),
        h('div', { class: 'tiny mt16', style: { fontWeight: 600 } }, '② 複製提示詞'),
        h('div', { class: 'mt8' }, promptBox),
        h('button', { class: 'btn secondary mt8', onclick: async () => { const ok = await UI.copyText(promptBox.value); UI.toast(ok ? '已複製，貼到 AI 對話框' : '複製失敗，請手動全選複製'); } }, UI.icon('copy'), '複製提示詞')),
      h('div', { class: 'card' },
        h('div', { class: 'tiny', style: { fontWeight: 600 } }, '③ 貼回 AI 的回答'),
        h('div', { class: 'mt8' }, pasteBox),
        h('button', { class: 'btn mt8', onclick: check }, '檢查'), result));
    return root;
  }

  /* ------------------------------------------------------------------ 我認定的「也可以」 */
  function overridesScreen() {
    const a = A(), state = a.state, content = a.content;
    const root = h('div');
    UI.add(root, back('#/admin', '教材管理'), title('我認定的「也可以」', '你在訓練中按過「我覺得我的答案也可以」的說法。可以把它正式收進題庫，或刪掉。'));
    const entries = [];
    Object.keys(state.overrides).forEach((exId) => state.overrides[exId].forEach((ans) => entries.push({ exId, ans })));
    if (!entries.length) { UI.add(root, h('div', { class: 'card soft flat' }, h('p', { class: 'muted' }, '目前沒有。'))); return root; }
    UI.add(root, h('div', { class: 'list' }, entries.map((en) => {
      const ex = content.byId[en.exId];
      const pat = content.patternById[en.exId.replace(/-M$/, '')] || (ex && content.patternById[ex.pattern]);
      return h('div', { class: 'row', style: { alignItems: 'flex-start' } },
        h('div', { class: 'grow' }, h('div', { class: 's' }, en.exId + (ex ? '　' + ex.zh : '　（母句）')), h('div', { class: 'en', style: { fontSize: '17px', marginTop: '2px' } }, en.ans)),
        h('div', { style: { display: 'grid', gap: '6px' } },
          ex ? h('button', { class: 'btn sm secondary', onclick: () => { patchExercise(ex.id, { acc: (ex.acc || []).concat([en.ans]) }); state.overrides[en.exId] = state.overrides[en.exId].filter((x) => x !== en.ans); if (!state.overrides[en.exId].length) delete state.overrides[en.exId]; a.save(); a.render(); UI.toast('已收進題庫'); } }, '收進題庫') : null,
          h('button', { class: 'btn sm danger', onclick: () => { state.overrides[en.exId] = state.overrides[en.exId].filter((x) => x !== en.ans); if (!state.overrides[en.exId].length) delete state.overrides[en.exId]; a.save(); a.render(); } }, '刪除')));
    })));
    return root;
  }

  /* ------------------------------------------------------------------ 判題紀錄（取代規格中的「AI Judge 結果」） */
  function logScreen() {
    const a = A(), state = a.state, content = a.content;
    const root = h('div');
    UI.add(root, back('#/admin', '教材管理'), title('判題紀錄', '最近 100 筆。狀態：correct 完全正確、acceptable 可接受、partial 接近、incorrect 錯誤。'));
    const f = { only: false };
    const box = h('div');
    function draw() {
      UI.clear(box);
      let list = state.attempts.filter((x) => ['LEARN', 'LISTEN_REPEAT'].indexOf(x.type) < 0).slice().reverse();
      if (f.only) list = list.filter((x) => x.st !== 'correct' && x.st !== 'acceptable');
      list = list.slice(0, 100);
      box.append(h('div', { class: 'list' }, list.length ? list.map((x) => {
        const ok = x.st === 'correct' || x.st === 'acceptable';
        return h('div', { class: 'row', style: { alignItems: 'flex-start' } },
          chip(x.st, ok ? 'good' : x.st === 'partial' ? 'amber' : ''),
          h('div', { class: 'grow' },
            h('div', { class: 's' }, U.fmtDateTime(x.t) + '　' + x.pid + '　' + x.type + (x.origin ? '/' + x.origin : '') + (x.in === 'voice' ? '　🎤' : '')),
            h('div', { class: 'en', style: { fontSize: '16px', marginTop: '2px' } }, x.ans || '（沒有作答）'),
            !ok && x.tgt ? h('div', { class: 'tiny' }, '正解：' + x.tgt) : null,
            (x.tags || []).length ? h('div', { class: 'tiny' }, x.tags.map((t) => UI.tagZh(t)).join('、')) : null,
            h('div', { class: 'tiny' }, (x.rt != null ? '開口 ' + (x.rt / 1000).toFixed(1) + ' 秒' : '') + (x.hint ? '　用了提示' : '') + (x.first ? '　第一次見到' : ''))));
      }) : h('div', { class: 'row' }, h('span', { class: 'muted' }, '沒有紀錄'))));
    }
    UI.add(root, h('div', { class: 'switch-row', style: { paddingTop: 0 } }, h('div', null, '只看答錯的'), UI.toggle(false, (v) => { f.only = v; draw(); })), box);
    draw();
    return root;
  }

  /* ------------------------------------------------------------------ 錯誤標籤 */
  function errorsScreen() {
    const a = A(), state = a.state, content = a.content;
    const root = h('div');
    UI.add(root, back('#/admin', '教材管理'), title('錯誤標籤', '系統記的是「哪個句型的哪一類錯誤」，不是第幾題答錯。'));
    const list = Object.values(state.errors).sort((x, y) => (y.last_failed_at || 0) - (x.last_failed_at || 0));
    UI.add(root, h('div', { class: 'list' }, list.length ? list.map((e) => h('div', { class: 'row', style: { alignItems: 'flex-start' } },
      e.resolved ? chip('已修復', 'good') : chip(e.success_sessions.length + '/2', 'amber'),
      h('div', { class: 'grow' },
        h('div', { style: { fontWeight: 600 } }, e.tag + '　' + UI.tagZh(e.tag)),
        h('div', { class: 's' }, (content.patternById[e.pid] ? content.patternById[e.pid].short : e.pid) + '　· 犯 ' + e.fail_count + ' 次　· 最近 ' + U.fmtDateTime(e.last_failed_at)),
        e.last_actual ? h('div', { class: 'tiny', style: { marginTop: '2px' } }, '你寫：' + e.last_actual) : null,
        e.last_expected ? h('div', { class: 'tiny' }, '正解：' + e.last_expected) : null))) : h('div', { class: 'row' }, h('span', { class: 'muted' }, '目前沒有記下的錯誤'))));
    return root;
  }

  Admin.render = function (seg) {
    const [x, y, z] = seg || [];
    if (!x) return home();
    if (x === 'p' && y && z === 'ai') return aiScreen(y);
    if (x === 'p' && y) return patternScreen(y);
    if (x === 'e' && y) return exerciseScreen(decodeURIComponent(y));
    if (x === 'new') return newPatternScreen();
    if (x === 'overrides') return overridesScreen();
    if (x === 'log') return logScreen();
    if (x === 'errors') return errorsScreen();
    return home();
  };
  Admin.checkExercise = checkExercise;

  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
