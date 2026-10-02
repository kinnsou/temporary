/* Pattern 10 — 成效指標（規格 §40）
 *   A 母句暗誦正確率  B 未見變形正確率（最重要）  C 反應時間  D 保持率（隔日／隔 7 日後還答得出）  E 錯誤重犯
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const U = P10.util, S = P10.srs;
  const St = (P10.stats = {});

  const ok = (a) => a.st === 'correct' || a.st === 'acceptable';
  const scored = (a) => a.st !== 'stt_uncertain' && ['RECALL', 'FAST_RECALL', 'TRANSFER', 'ERROR_REPAIR', 'CLOZE', 'FREE_PRODUCTION'].indexOf(a.type) >= 0;
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : null);

  St.recall = function (state) {
    const a = state.attempts.filter((x) => (x.type === 'RECALL' || x.type === 'FAST_RECALL') && x.st !== 'stt_uncertain');
    const n = a.length, k = a.filter(ok).length;
    return { n, ok: k, pct: pct(k, n) };
  };
  /* 未見變形：每一題「第一次出現」的作答 */
  St.transferUnseen = function (state) {
    const a = state.attempts.filter((x) => (x.type === 'TRANSFER' || x.type === 'ERROR_REPAIR') && x.first === 1 && x.st !== 'stt_uncertain');
    const n = a.length, k = a.filter(ok).length;
    return { n, ok: k, pct: pct(k, n) };
  };
  St.transferSeen = function (state) {
    const a = state.attempts.filter((x) => (x.type === 'TRANSFER' || x.type === 'ERROR_REPAIR') && x.first !== 1 && x.st !== 'stt_uncertain');
    const n = a.length, k = a.filter(ok).length;
    return { n, ok: k, pct: pct(k, n) };
  };
  /* 反應時間：答對的母句暗誦，前 10 次 vs 最近 10 次 */
  St.reaction = function (state) {
    const a = state.attempts.filter((x) => (x.type === 'RECALL' || x.type === 'FAST_RECALL') && ok(x) && x.rt != null && x.in !== 'voice' || ((x.type === 'RECALL' || x.type === 'FAST_RECALL') && ok(x) && x.rt != null && x.in === 'voice'));
    const rts = a.map((x) => x.rt);
    if (rts.length < 2) return { n: rts.length, first: null, last: null, series: rts };
    const k = Math.min(10, Math.floor(rts.length / 2));
    return { n: rts.length, first: Math.round(U.avg(rts.slice(0, k))), last: Math.round(U.avg(rts.slice(-k))), series: rts };
  };
  /* 保持率：到期複習中，間隔 1 天／7 天以上之後還答得出的比例 */
  St.retention = function (state) {
    const due = state.attempts.filter((x) => x.origin === 'due' && x.st !== 'stt_uncertain');
    const d1 = due.filter((x) => x.iv === 1), d7 = due.filter((x) => x.iv >= 7);
    return { d1: { n: d1.length, ok: d1.filter(ok).length, pct: pct(d1.filter(ok).length, d1.length) }, d7: { n: d7.length, ok: d7.filter(ok).length, pct: pct(d7.filter(ok).length, d7.length) }, all: { n: due.length, ok: due.filter(ok).length, pct: pct(due.filter(ok).length, due.length) } };
  };
  St.errors = function (state) {
    const list = Object.values(state.errors);
    const recur = list.filter((e) => e.fail_count > 1).length;
    return { total: list.length, resolved: list.filter((e) => e.resolved).length, open: list.filter((e) => !e.resolved).length, recurRate: pct(recur, list.length), list: list.sort((a, b) => b.fail_count - a.fail_count) };
  };
  St.todayCount = function (state, now) {
    const key = U.dayKey(now);
    return state.attempts.filter((a) => U.dayKey(a.t) === key && scored(a)).length;
  };
  /* 每個句型「最近進步」：近 7 天熟練度增加最多的 */
  St.mostImproved = function (state, content, now) {
    let best = null;
    content.patterns.forEach((pt) => {
      const p = state.patterns[pt.id];
      if (!p || p.history.length < 2) return;
      const last = p.history[p.history.length - 1];
      const ref = p.history.filter((h) => now - h.t >= 2 * U.DAY).pop() || p.history[0];
      const d = last.m - ref.m;
      if (d >= 3 && (!best || d > best.d)) best = { pid: pt.id, d };
    });
    return best;
  };
  St.weakest = function (state, content) {
    let best = null;
    content.patterns.forEach((pt) => {
      const p = state.patterns[pt.id];
      if (!p || !p.lesson_done) return;
      const m = S.effective(p) - Object.values(state.errors).filter((e) => !e.resolved && e.pid === pt.id).length * 6;
      if (!best || m < best.m) best = { pid: pt.id, m };
    });
    return best;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
