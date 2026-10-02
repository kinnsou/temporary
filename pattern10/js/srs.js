/* Pattern 10 — 熟練度模型、簡化間隔複習、錯誤記憶（規格 §8–§12、§29–§30）
 * 全部是純函式，直接修改傳進來的 state（由 session.js 呼叫）。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const U = P10.util, E = P10.engine;
  const S = (P10.srs = {});

  /* 間隔（天）：第一次答對 +1、再對 +3、+7、+14、+30 */
  S.INTERVALS = [1, 3, 7, 14, 30];
  /* 熟練度比重（規格 §10）：Transfer 最高 */
  S.WEIGHTS = { recognition: 0.10, recall: 0.25, speed: 0.20, transfer: 0.30, retention: 0.15 };
  S.LABELS = [
    { min: 0, label: '未學習' }, { min: 20, label: '看得懂' }, { min: 40, label: '記得' },
    { min: 60, label: '能暗誦' }, { min: 75, label: '能活用' }, { min: 90, label: '自動化' }
  ];
  S.SUBS = ['recognition', 'recall', 'speed', 'transfer', 'retention'];
  S.SUB_LABEL = { recognition: '理解', recall: '暗誦', speed: '速度', transfer: '變形', retention: '保持' };

  S.newProgress = function (pid) {
    return {
      pid, unlocked: false, stage: 0, lesson_done: false, lesson_done_at: null,
      recognition: 0, recall: 0, speed: 0, transfer: 0, retention: 0,
      n: { recognition: 0, recall: 0, speed: 0, transfer: 0, retention: 0 },
      mastery: 0,
      review_stage: 0, next_review_at: null, last_review_at: null, last_review_session: null, last_review_kind: null,
      recall_ok: 0, fast_ok: 0, transfer_unseen_ok: [], max_success_interval: 0, retention30: false,
      seen: {}, level_stats: { 1: { n: 0, ok: 0 }, 2: { n: 0, ok: 0 }, 3: { n: 0, ok: 0 } },
      free_done: 0, last_free_at: null, history: [], total_attempts: 0, total_ok: 0
    };
  };
  S.getProgress = (state, pid) => state.patterns[pid] || (state.patterns[pid] = S.newProgress(pid));

  S.statusScore = function (status) {
    return status === 'correct' ? 100 : status === 'acceptable' ? 90 : status === 'partial' ? 50 : status === 'incorrect' ? 0 : null;
  };
  S.isOk = (status) => status === 'correct' || status === 'acceptable';

  /* 反應時間（開始作答前的時間）→ 0~100 */
  S.latencyScore = function (ms) {
    if (ms == null) return 55;
    if (ms <= 1500) return 100;
    if (ms <= 2500) return 90;
    if (ms <= 3500) return 75;
    if (ms <= 5000) return 55;
    if (ms <= 8000) return 35;
    return 20;
  };

  /* 自適應指數平均：前幾次樣本影響大，之後趨穩 */
  S.updateSub = function (p, key, x, w) {
    w = w == null ? 1 : w;
    const n = p.n[key] || 0;
    const a = Math.min(1, Math.max(0.35, 1 / (n + 1)) * w);
    p[key] = U.clamp(p[key] + a * (x - p[key]), 0, 100);
    p.n[key] = n + 1;
    p.mastery = S.computeMastery(p);
  };
  S.computeMastery = function (p) {
    let m = 0;
    S.SUBS.forEach((k) => { m += (p[k] || 0) * S.WEIGHTS[k]; });
    return U.round1(m);
  };

  /* 畢業條件（規格 §30）：能活用 */
  S.graduated = (p) => p.recall_ok >= 1 && p.fast_ok >= 1 && p.transfer_unseen_ok.length >= 5 && p.max_success_interval >= 7;
  /* 自動化：Mastery ≥ 90 且 30 日 Retention 通過 */
  S.automated = (p) => S.graduated(p) && p.mastery >= 90 && p.retention30;
  /* 顯示用的熟練度：沒達到畢業條件就不能超過上一級 */
  S.effective = function (p) {
    let m = p.mastery;
    if (!S.graduated(p)) m = Math.min(m, 74);
    else if (!S.automated(p)) m = Math.min(m, 89);
    return m;
  };
  S.label = function (p) {
    if (!p || !p.unlocked) return '未開始';
    const m = S.effective(p);
    let out = S.LABELS[0].label;
    S.LABELS.forEach((l) => { if (m >= l.min) out = l.label; });
    return out;
  };
  /* 0~1，用於進度條 */
  S.bar = (p) => (p ? S.effective(p) / 100 : 0);

  /* 下一個複習時間：「第 n 天」的凌晨 04:00 */
  S.dueIn = (now, days) => U.addDays(now, days);

  /* 一次到期複習的結果 → 更新排程。
   *  答對          → 前進一個間隔（1→3→7→14→30 天）
   *  輕微失誤(partial，例如拼錯一個字) → 不前進也不倒退，同一個間隔再來一次
   *  嚴重錯誤(incorrect) → 往回退 1～2 個間隔（規格 §12） */
  S.onReviewResult = function (p, ok, severity, now) {
    const r = p.review_stage || 0;
    const interval = S.INTERVALS[Math.min(r, S.INTERVALS.length - 1)];
    if (ok) {
      p.max_success_interval = Math.max(p.max_success_interval || 0, interval);
      if (interval >= 30) p.retention30 = true;
      p.review_stage = Math.min(r + 1, S.INTERVALS.length);
      p.next_review_at = S.dueIn(now, S.INTERVALS[Math.min(p.review_stage, S.INTERVALS.length - 1)]);
    } else if (severity === 'minor') {
      p.review_stage = r;
      p.next_review_at = S.dueIn(now, interval);
    } else {
      const back = r >= 3 ? 2 : 1;
      p.review_stage = Math.max(0, r - back);
      p.next_review_at = S.dueIn(now, S.INTERVALS[p.review_stage]);
    }
    p.last_review_at = now;
  };

  S.isDue = (p, now) => !!(p && p.unlocked && p.lesson_done && p.next_review_at != null && p.next_review_at <= now);

  /* ------------------------------------------------------------------ 錯誤記憶（規格 §8–§9） */
  S.errKey = (pid, tag) => pid + '|' + tag;
  S.getErr = (state, pid, tag) => state.errors[S.errKey(pid, tag)];

  S.recordFail = function (state, pid, tag, info) {
    const k = S.errKey(pid, tag);
    const e = state.errors[k] || (state.errors[k] = {
      pid, tag, fail_count: 0, success_after_fail: 0, success_sessions: [], last_failed_at: null, last_success_at: null,
      resolved: false, resolved_at: null, due_at: null, first_failed_at: info.now, last_expected: null, last_actual: null
    });
    e.fail_count++;
    e.success_after_fail = 0;
    e.success_sessions = [];
    e.resolved = false;
    e.resolved_at = null;
    e.last_failed_at = info.now;
    e.due_at = null;
    e.last_expected = info.expected || null;
    e.last_actual = info.actual || null;
    return e;
  };

  /* 修復題答對一次。回傳 {entry, becameResolved} */
  S.recordRepairSuccess = function (state, pid, tag, sessionId, now) {
    const e = S.getErr(state, pid, tag);
    if (!e || e.resolved) return { entry: e || null, becameResolved: false };
    e.success_after_fail++;
    e.last_success_at = now;
    if (e.success_sessions.indexOf(sessionId) < 0) e.success_sessions.push(sessionId);
    e.due_at = null;
    let becameResolved = false;
    if (e.success_sessions.length >= 2) { e.resolved = true; e.resolved_at = now; becameResolved = true; }
    return { entry: e, becameResolved };
  };

  S.unresolvedErrors = function (state) {
    return Object.values(state.errors).filter((e) => !e.resolved);
  };

  /* ------------------------------------------------------------------ 解鎖（規格 §29） */
  /* 前一個 Pattern「暗誦 ≥ 60」就開下一個；同時「學習中」(已開但還沒到能暗誦) 最多 3 個 */
  S.refreshUnlocks = function (state, patterns) {
    const sorted = patterns.filter((p) => p.active !== false).sort((a, b) => a.order - b.order);
    const newly = [];
    sorted.forEach((pat, i) => {
      const p = S.getProgress(state, pat.id);
      if (i === 0 && !p.unlocked) { p.unlocked = true; newly.push(pat.id); }
    });
    for (let i = 1; i < sorted.length; i++) {
      const p = S.getProgress(state, sorted[i].id);
      if (p.unlocked) continue;
      const prev = S.getProgress(state, sorted[i - 1].id);
      const learning = sorted.filter((x) => { const q = S.getProgress(state, x.id); return q.unlocked && q.mastery < 60; }).length;
      if (prev.unlocked && prev.recall >= 60 && learning < 3) { p.unlocked = true; newly.push(sorted[i].id); }
    }
    return newly;
  };

  /* 想先學後面的句型：使用者自己決定提早解鎖（不受「前一個要先練到能暗誦」限制）。
   * 人在場的選擇，不加程式閘；只提醒「同時學太多會互相干擾」。回傳 true＝這次真的解鎖了 */
  S.manualUnlock = function (state, pid) {
    const p = S.getProgress(state, pid);
    if (p.unlocked) return false;
    p.unlocked = true;
    p.manual_unlock = true;
    return true;
  };

  S.learningCount = (state, patterns) => patterns.filter((x) => { const q = state.patterns[x.id]; return q && q.unlocked && q.mastery < 60; }).length;

  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
