/* Pattern 10 — 畫面小工具：建立 DOM、圖示、提示、對話框 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const E = P10.engine, S = P10.srs;
  const UI = (P10.ui = {});
  const doc = g.document;
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* h('div', {class:'x', onclick: fn}, child, child…) */
  UI.h = function (tag, attrs) {
    const el = doc.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'value') el.value = v;
        else if (k === 'checked' || k === 'disabled' || k === 'selected') { if (v) el[k] = true; }
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  };
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach((x) => append(el, x)); return; }
    el.append(c.nodeType ? c : doc.createTextNode(String(c)));
  }
  const h = UI.h;
  UI.add = function (el) { for (let i = 1; i < arguments.length; i++) append(el, arguments[i]); return el; };
  UI.frag = (...kids) => { const f = doc.createDocumentFragment(); kids.forEach((k) => append(f, k)); return f; };
  UI.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* ---------- 圖示（線條風格，自繪） ---------- */
  const ICONS = {
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    volume: '<path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    check: '<path d="M5 12.5 10 17.5 19 7"/>',
    replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="m15 6-6 6 6 6"/>',
    home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    skip: '<path d="m5 4 10 8-10 8zM19 5v14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    download: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    sparkle: '<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>'
  };
  UI.icon = function (name, cls) {
    const s = doc.createElementNS(SVGNS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';
    return s;
  };

  /* ---------- 顯示用名稱 ---------- */
  UI.tagZh = (tag) => E.TAGS[tag] || tag;
  UI.labelClass = (label) => ({ '未開始': 'l0', '未學習': 'l0', '看得懂': 'l1', '記得': 'l1', '能暗誦': 'l2', '能活用': 'l4', '自動化': 'l5' })[label] || 'l0';
  UI.fmtSec = (ms) => (ms == null ? '—' : (ms / 1000).toFixed(1) + ' 秒');

  /* 把一句話的每個字顯示出來，指定的字加上標記 */
  UI.markWords = function (words, idxs, cls) {
    const set = new Set(idxs || []);
    const out = [];
    (words || []).forEach((w, i) => {
      if (i) out.push(' ');
      out.push(set.has(i) ? h('mark', { class: cls || 'mk' }, w) : w);
    });
    return out;
  };

  /* ---------- 提示 / 對話框 ---------- */
  let toastTimer = null;
  UI.toast = function (msg, ms) {
    const old = doc.querySelector('.toast'); if (old) old.remove();
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    doc.body.append(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), ms || 2400);
  };

  /* sheet({title, body, actions:[{label, kind, onClick, keepOpen}], dismissable}) */
  UI.sheet = function (o) {
    const prev = doc.activeElement;
    const overlay = h('div', { class: 'overlay', role: 'dialog', 'aria-modal': 'true' });
    const close = () => { overlay.remove(); if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* ignore */ } } };
    const sheet = h('div', { class: 'sheet' },
      o.title ? h('h3', null, o.title) : null,
      o.body ? (typeof o.body === 'string' ? h('p', { class: 'muted' }, o.body) : o.body) : null,
      h('div', { style: { marginTop: '18px' } },
        (o.actions || []).map((a) => h('button', {
          class: 'btn ' + (a.kind || ''), onclick: () => { if (!a.keepOpen) close(); if (a.onClick) a.onClick(); }
        }, a.label))));
    overlay.append(sheet);
    if (o.dismissable !== false) overlay.addEventListener('click', (e) => { if (e.target === overlay) { close(); if (o.onDismiss) o.onDismiss(); } });
    doc.body.append(overlay);
    const first = sheet.querySelector('.btn'); if (first) first.focus();
    return { close, el: sheet };
  };
  UI.confirm = function (title, body, okLabel, onOk, kind) {
    return UI.sheet({ title, body, actions: [{ label: okLabel || '好', kind: kind || '', onClick: onOk }, { label: '取消', kind: 'secondary' }] });
  };

  /* 簡單的 select 元件 */
  UI.seg = function (options, value, onChange) {
    const wrap = h('div', { class: 'seg', role: 'group' });
    options.forEach(([val, label]) => {
      const b = h('button', { type: 'button', 'aria-pressed': String(val === value), onclick: () => {
        wrap.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
        b.setAttribute('aria-pressed', 'true');
        onChange(val);
      } }, label);
      wrap.append(b);
    });
    return wrap;
  };
  UI.toggle = function (checked, onChange) {
    const inp = h('input', { type: 'checkbox', checked: !!checked, onchange: () => onChange(inp.checked) });
    return h('label', { class: 'toggle' }, inp, h('i'));
  };

  UI.download = function (filename, text, mime) {
    if (P10.env && P10.env.trial) {          // 試玩版：頁面不能自己下載檔案，改成複製到剪貼簿
      UI.copyText(text).then((ok) => UI.toast(ok ? '試玩版不能下載檔案，內容已複製到剪貼簿' : '試玩版不能下載檔案，也無法複製', 3500));
      return;
    }
    const blob = new Blob([text], { type: mime || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: filename });
    doc.body.append(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
  };
  UI.copyText = async function (text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; doc.body.append(ta); ta.select();
      let ok = false; try { ok = doc.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove(); return ok;
    }
  };

  /* 熟練度條（含狀態文字）；p = progress */
  UI.masteryBar = function (p) {
    const label = S.label(p);
    const pct = Math.round(S.bar(p) * 100);
    return h('div', { class: 'pbar' }, h('div', { class: 'bar' }, h('i', { style: { width: pct + '%' } })), h('span', { class: 'lab ' + UI.labelClass(label) }, label));
  };

  P10.ui = UI;
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
