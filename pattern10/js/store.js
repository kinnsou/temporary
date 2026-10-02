/* Pattern 10 — 資料存取（localStorage）＋教材合併
 *  p10.state.v1    使用者的進度、作答紀錄、錯誤記憶、設定（只存在這台裝置的瀏覽器）
 *  p10.content.v1  使用者對教材的修改（只存「差異」，原始教材隨程式更新）
 * 沒有任何資料會離開這台裝置。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const U = P10.util, E = P10.engine;
  const Store = (P10.store = {});
  const KEY_STATE = 'p10.state.v1', KEY_CONTENT = 'p10.content.v1';

  /* ---- 儲存後端：localStorage（不可用時退回記憶體，並提醒使用者） ---- */
  let backend = null;
  function memoryBackend() {
    const m = {};
    return { kind: 'memory', get: (k) => (k in m ? m[k] : null), set: (k, v) => { m[k] = String(v); }, del: (k) => { delete m[k]; } };
  }
  function getBackend() {
    if (backend) return backend;
    try {
      const ls = g.localStorage;
      ls.setItem('__p10t', '1'); ls.removeItem('__p10t');
      backend = { kind: 'local', get: (k) => ls.getItem(k), set: (k, v) => ls.setItem(k, v), del: (k) => ls.removeItem(k) };
    } catch (e) { backend = memoryBackend(); }
    return backend;
  }
  Store.useMemory = () => { backend = memoryBackend(); };
  Store.backendKind = () => getBackend().kind;

  const DEFAULT_SETTINGS = {
    input_mode: 'text',          // text | voice | both
    session_size: 8,
    level: 'basic',              // beginner | basic | advanced（首次測驗決定）
    rate_normal: 1.0, rate_slow: 0.8,
    voice_uri: null,
    theme: 'auto',               // auto | light | dark
    show_latency: true,
    auto_speak: true             // 答對後自動朗讀正確句子
  };

  Store.newState = function (now) {
    return {
      v: 1, created_at: now == null ? U.now() : now, onboarded: false, onboarding_score: null,
      settings: Object.assign({}, DEFAULT_SETTINGS),
      patterns: {}, attempts: [], errors: {}, overrides: {}, sessions: [], session: null, probes: [],
      stats: { total_attempts: 0 }, daily: null
    };
  };

  Store.migrate = function (s) {
    const base = Store.newState(s && s.created_at);
    const out = Object.assign(base, s || {});
    out.settings = Object.assign({}, DEFAULT_SETTINGS, (s && s.settings) || {});
    ['patterns', 'errors', 'overrides', 'stats'].forEach((k) => { if (!out[k] || typeof out[k] !== 'object') out[k] = base[k]; });
    ['attempts', 'sessions', 'probes'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    return out;
  };

  /* ---- 讀寫 ---- */
  Store.load = function () {
    const b = getBackend();
    let warning = b.kind === 'memory' ? '這個瀏覽器不允許儲存資料，關掉頁面後進度會消失。請改用一般（非無痕）視窗。' : null;
    const raw = b.get(KEY_STATE);
    if (!raw) return { state: Store.newState(), warning, fresh: true };
    try {
      return { state: Store.migrate(JSON.parse(raw)), warning, fresh: false };
    } catch (e) {
      try { b.set(KEY_STATE + '.corrupt', raw); } catch (e2) { /* ignore */ }
      return { state: Store.newState(), warning: '讀取舊進度時發生錯誤，已保留一份損毀的備份並重新開始。', fresh: true };
    }
  };
  /* ---- 第二份保險：IndexedDB 鏡像 ----
   * 同一個網域（例如 github.io）底下的其他網頁，可能呼叫 localStorage.clear()，把所有進度一起清掉。
   * IndexedDB 不受 localStorage.clear() 影響，所以每次存檔時也在背景存一份；
   * 開啟時如果發現 localStorage 被清空、但鏡像還在，就自動還原。 */
  const IDB_NAME = 'pattern10', IDB_STORE = 'kv';
  const hasIDB = () => { try { return typeof g.indexedDB !== 'undefined' && !!g.indexedDB; } catch (e) { return false; } };
  function idbOpen() {
    return new Promise((resolve, reject) => {
      const r = g.indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(IDB_STORE); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  function idbRun(mode, fn) {
    return idbOpen().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, mode);
      const out = fn(tx.objectStore(IDB_STORE));
      tx.oncomplete = () => { db.close(); resolve(out && out.result !== undefined ? out.result : undefined); };
      tx.onerror = () => { db.close(); reject(tx.error); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    }));
  }
  const idbSet = (k, v) => idbRun('readwrite', (s) => s.put(v, k));
  const idbDel = (k) => idbRun('readwrite', (s) => s.delete(k));
  const idbGet = (k) => idbRun('readonly', (s) => s.get(k));

  let mirrorTimer = null, pending = {};
  Store.scheduleMirror = function (key, text) {
    if (getBackend().kind !== 'local' || !hasIDB()) return;
    pending[key] = text;
    clearTimeout(mirrorTimer);
    mirrorTimer = setTimeout(Store.flushMirror, 400);
  };
  Store.flushMirror = function () {
    clearTimeout(mirrorTimer);
    const p = pending; pending = {};
    Object.keys(p).forEach((k) => { idbSet(k, p[k]).catch(() => { /* 鏡像失敗不影響使用 */ }); });
  };
  Store.clearMirror = function (key) {
    delete pending[key];
    if (hasIDB()) idbDel(key).catch(() => { /* ignore */ });
  };
  /* localStorage 沒有進度、但鏡像有 → 還原並回傳 state；否則回傳 null */
  Store.restoreFromMirror = function () {
    if (getBackend().kind !== 'local' || !hasIDB() || getBackend().get(KEY_STATE)) return Promise.resolve(null);
    return idbGet(KEY_STATE).then((raw) => {
      if (!raw) return null;
      const state = Store.migrate(JSON.parse(raw));
      getBackend().set(KEY_STATE, JSON.stringify(state));
      return idbGet(KEY_CONTENT).then((ov) => { if (ov && !getBackend().get(KEY_CONTENT)) getBackend().set(KEY_CONTENT, ov); return state; });
    }).catch(() => null);
  };

  Store.save = function (state) {
    let text;
    try { text = JSON.stringify(state); } catch (e) { Store.lastError = e; return false; }
    Store.scheduleMirror(KEY_STATE, text);
    try { getBackend().set(KEY_STATE, text); return true; }
    catch (e) { Store.lastError = e; return false; }
  };
  Store.reset = function () { const b = getBackend(); b.del(KEY_STATE); Store.clearMirror(KEY_STATE); };

  Store.loadOverlay = function () {
    try { const raw = getBackend().get(KEY_CONTENT); return raw ? JSON.parse(raw) : emptyOverlay(); } catch (e) { return emptyOverlay(); }
  };
  function emptyOverlay() { return { patterns: {}, exercises: {}, newPatterns: [], newExercises: [] }; }
  Store.emptyOverlay = emptyOverlay;
  Store.saveOverlay = function (ov) {
    try { const text = JSON.stringify(ov); Store.scheduleMirror(KEY_CONTENT, text); getBackend().set(KEY_CONTENT, text); return true; } catch (e) { return false; }
  };

  /* ---- 教材合併：種子 + 使用者修改 ---- */
  Store.autoCloze = function (sentence) {
    const words = E.displayWords(sentence);
    const STOP = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'my', 'your', 'his', 'her', 'our', 'their', 'me', 'him', 'us', 'them']);
    const idxs = words.map((_, i) => i).filter((i) => !STOP.has(E.normalize(words[i].replace(/[.,!?;:]+$/, ''))));
    if (!idxs.length) return { A: [0], B: [0] };
    const A = [idxs[Math.floor(idxs.length / 2)]];
    const B = idxs.filter((_, k) => k % 2 === 0);
    return { A, B: B.length ? B : A };
  };

  Store.buildContent = function (seed, overlay) {
    overlay = overlay || emptyOverlay();
    const pOver = overlay.patterns || {}, eOver = overlay.exercises || {};
    const patterns = seed.patterns.map((p) => Object.assign({}, p, pOver[p.id] || {}));
    (overlay.newPatterns || []).forEach((p) => patterns.push(Object.assign({ active: true, source: 'user' }, p)));
    const exercises = seed.exercises.map((e) => Object.assign({}, e, eOver[e.id] || {}));
    (overlay.newExercises || []).forEach((e) => exercises.push(Object.assign({ active: true, source: 'user', acc: [], holdout: false }, e)));

    patterns.forEach((p) => {
      if (!p.cloze) p.cloze = Store.autoCloze(p.mother);
      if (!p.free) p.free = { prompts: ['用「' + (p.short || p.template || p.mother) + '」造一個你自己的句子。'], examples: [] };
      if (!p.label) p.label = p.short || p.template;
      if (!p.short) p.short = p.label;
      if (!p.explain) p.explain = '';
      if (!p.contrast) p.contrast = [];
    });
    const active = patterns.filter((p) => p.active !== false).sort((a, b) => a.order - b.order);
    const byPattern = {}, byId = {};
    active.forEach((p) => { byPattern[p.id] = { pattern: p, all: [], train: [], holdout: [], pending: [] }; });
    exercises.forEach((e) => {
      byId[e.id] = e;
      const b = byPattern[e.pattern];
      if (!b) return;
      if (e.status === 'pending') { b.pending.push(e); return; }      // AI 產生、還沒審核
      if (e.active === false) return;
      b.all.push(e);
      (e.holdout ? b.holdout : b.train).push(e);
    });
    const patternById = {};
    patterns.forEach((p) => { patternById[p.id] = p; });
    return { patterns: active, allPatterns: patterns, exercises, byId, byPattern, patternById };
  };
  Store.seedContent = () => Store.buildContent(P10.seed, Store.loadOverlay());

  /* ---- 備份 / 還原 ---- */
  Store.exportAll = function (state) {
    return JSON.stringify({ app: 'pattern10', schema: 1, exported_at: U.now(), state, overlay: Store.loadOverlay() });
  };
  Store.importAll = function (text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { return { ok: false, error: '這不是有效的備份檔（JSON 格式錯誤）。' }; }
    if (!data || data.app !== 'pattern10' || !data.state || typeof data.state !== 'object') return { ok: false, error: '這不是 Pattern 10 的備份檔。' };
    const state = Store.migrate(data.state);
    Store.save(state);
    if (data.overlay) Store.saveOverlay(data.overlay);
    return { ok: true, state };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
