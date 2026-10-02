/* Pattern 10 — 共用小工具（無 DOM 依賴，Node 測試也能載入） */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const U = (P10.util = {});
  /* 執行環境旗標。試玩版（網頁預覽）的 HTML 會先設 window.P10_TRIAL = true；桌面版沒有這個旗標，行為完全不變 */
  P10.env = { trial: !!g.P10_TRIAL };

  const DAY = 86400000;
  U.DAY = DAY;
  U.MIN = 60000;

  /* 可被測試覆寫的時鐘 */
  let _now = null;
  U.now = () => (_now ? _now() : Date.now());
  U.setNow = (fn) => { _now = fn; };

  /* FNV-1a 32bit */
  U.hash = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };

  /* mulberry32：可重現的亂數 */
  U.rng = function (seed) {
    let a = (typeof seed === 'string' ? U.hash(seed) : seed) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  U.shuffle = function (r, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  U.randInt = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  U.clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  U.uid = (p) => (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* 「邏輯日」以凌晨 04:00 換日（和 Anki 一樣：熬夜到 2 點仍算前一天） */
  const CUT = 4;
  function logicalYMD(ts) {
    const d = new Date(ts - CUT * 3600000);
    return [d.getFullYear(), d.getMonth(), d.getDate()];
  }
  U.dayKey = (ts) => {
    const [y, m, d] = logicalYMD(ts);
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  };
  U.dayStart = (ts) => {
    const [y, m, d] = logicalYMD(ts);
    return new Date(y, m, d, CUT, 0, 0, 0).getTime();
  };
  /* 從今天（邏輯日）算起第 n 天的 04:00 */
  U.addDays = (ts, n) => {
    const [y, m, d] = logicalYMD(ts);
    return new Date(y, m, d + n, CUT, 0, 0, 0).getTime();
  };
  U.daysBetween = (a, b) => Math.round((U.dayStart(b) - U.dayStart(a)) / DAY);

  U.fmtDate = (ts) => {
    const d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate();
  };
  U.fmtDateTime = (ts) => {
    const d = new Date(ts);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  U.relDay = function (ts, now) {
    now = now == null ? U.now() : now;
    const n = U.daysBetween(now, ts);
    if (n <= 0) return '今天';
    if (n === 1) return '明天';
    if (n < 7) return n + ' 天後';
    if (n < 30) return Math.round(n / 7) + ' 週後';
    return Math.round(n / 30) + ' 個月後';
  };
  U.greeting = function (ts) {
    const h = new Date(ts == null ? U.now() : ts).getHours();
    if (h >= 5 && h < 12) return 'Good morning.';
    if (h >= 12 && h < 18) return 'Good afternoon.';
    return 'Good evening.';
  };

  U.deepClone = (o) => JSON.parse(JSON.stringify(o));
  U.avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  U.round1 = (x) => Math.round(x * 10) / 10;

  U.escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
