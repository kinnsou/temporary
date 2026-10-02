/* Pattern 10 — Session Engine（規格 §6、§9、§13、§28、§29）
 * 組出「今天要練什麼」、批改、記錄、安排回馬槍、結算。
 * 全部是對 state 的純邏輯（沒有 DOM），Node 可直接模擬整個月的使用。
 *
 * item = { uid, type, pid, origin, ex?, level?, limit?, last?, repair_for?, disguise? }
 *   type:   LEARN | LISTEN_REPEAT | CLOZE | RECALL | FAST_RECALL | TRANSFER | FREE_PRODUCTION | ERROR_REPAIR
 *   origin: lesson（新句型課）| due（到期複習）| repair（弱點修復）| transfer（變形）| free（自由生成）
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const U = P10.util, E = P10.engine, S = P10.srs;
  const Sess = (P10.session = {});

  /* 依程度調整：遮字從哪一級開始、瞬間提取的時限（毫秒） */
  const PROFILE = {
    beginner: { cloze: ['A', 'B', 'C'], fast: [6500, 4500] },
    basic: { cloze: ['B', 'C'], fast: [5000, 3000] },
    advanced: { cloze: ['C'], fast: [4000, 2500] }
  };
  Sess.PROFILE = PROFILE;
  const SCORED = new Set(['CLOZE', 'RECALL', 'FAST_RECALL', 'TRANSFER', 'ERROR_REPAIR', 'FREE_PRODUCTION']);
  const REPAIR_SKIP = E.NON_REPAIRABLE;
  /* 預估每一步要花幾秒（用來算「約 N 分鐘」） */
  const SEC_PER = { LEARN: 30, LISTEN_REPEAT: 15, CLOZE: 25, RECALL: 20, FAST_RECALL: 15, TRANSFER: 28, ERROR_REPAIR: 28, FREE_PRODUCTION: 50, PROBE: 25 };
  Sess.secondsOf = (items) => items.reduce((a, it) => a + (SEC_PER[it.type] || 25), 0);
  const minutesOf = (sec) => Math.max(1, Math.round(sec / 60));

  Sess.profile = (state) => PROFILE[state.settings.level] || PROFILE.basic;
  const motherEx = (pat) => ({ id: pat.id + '-M', en: pat.mother, acc: [] });
  Sess.motherEx = motherEx;

  Sess.ensureDaily = function (state, now) {
    const key = U.dayKey(now);
    if (!state.daily || state.daily.key !== key) state.daily = { key, sessions: 0, lessons: 0, items: 0 };
    return state.daily;
  };

  /* ------------------------------------------------------------------ 取題 */
  Sess.allowedLevel = function (p) {
    const ls = p.level_stats;
    let lv = 1;
    if (ls[1].n >= 3 && ls[1].ok / ls[1].n >= 0.66) lv = 2;
    if (lv === 2 && ls[2].n >= 3 && ls[2].ok / ls[2].n >= 0.66) lv = 3;
    return lv;
  };
  const seenN = (p, id) => (p.seen[id] ? p.seen[id].n : 0);

  Sess.pickTransfer = function (state, content, pid, o) {
    o = o || {};
    const rng = o.rng || Math.random;
    const bucket = content.byPattern[pid];
    if (!bucket) return null;
    const p = S.getProgress(state, pid);
    const exclude = o.exclude || new Set();
    const cands = bucket.train.filter((ex) => !exclude.has(ex.id));
    if (!cands.length) return null;
    const maxLevel = o.levelMax || Sess.allowedLevel(p);
    let pool = cands.filter((ex) => seenN(p, ex.id) === 0 && ex.level <= maxLevel);
    if (!pool.length && !o.unseenOnly) pool = cands.filter((ex) => seenN(p, ex.id) === 0);
    if (!pool.length && !o.unseenOnly) {
      const minN = Math.min.apply(null, cands.map((ex) => seenN(p, ex.id)));
      pool = cands.filter((ex) => seenN(p, ex.id) === minN);
      const oldest = Math.min.apply(null, pool.map((ex) => (p.seen[ex.id] ? p.seen[ex.id].last : 0)));
      pool = pool.filter((ex) => (p.seen[ex.id] ? p.seen[ex.id].last : 0) === oldest);
    }
    if (!pool.length) return null;
    if (o.preferFocus) { const f = pool.filter((ex) => ex.focus === o.preferFocus); if (f.length) pool = f; }
    const top = Math.max.apply(null, pool.map((ex) => ex.level));
    if (rng() < 0.6) { const t = pool.filter((ex) => ex.level === top); if (t.length) pool = t; }
    return U.pick(rng, pool);
  };

  /* ------------------------------------------------------------------ 新句型課（Stage 1–6） */
  let _uidCounter = 0;
  const nextUid = (sess) => (sess ? sess.id : 'x') + ':' + (sess ? ++sess.counter : ++_uidCounter);

  Sess.lessonItems = function (state, content, pid, rng, sess) {
    const p = S.getProgress(state, pid);
    const prof = Sess.profile(state);
    const items = [];
    const mk = (o) => Object.assign({ uid: nextUid(sess), pid, origin: 'lesson' }, o);
    if (p.stage < 1) items.push(mk({ type: 'LEARN' }));
    if (p.stage < 2) items.push(mk({ type: 'LISTEN_REPEAT' }));
    if (p.stage < 3) prof.cloze.forEach((lv, i) => items.push(mk({ type: 'CLOZE', level: lv, last: i === prof.cloze.length - 1 })));
    if (p.stage < 4) items.push(mk({ type: 'RECALL' }));
    if (p.stage < 5) { items.push(mk({ type: 'FAST_RECALL', limit: prof.fast[0] })); items.push(mk({ type: 'FAST_RECALL', limit: prof.fast[1], last: true })); }
    if (p.stage < 6) {
      const used = new Set();
      for (let i = 0; i < 2; i++) {
        const ex = Sess.pickTransfer(state, content, pid, { rng, levelMax: 1, exclude: used });
        if (!ex) break;
        used.add(ex.id);
        items.push(mk({ type: 'TRANSFER', ex: ex.id, last: i === 1 }));
      }
      if (items.length && items[items.length - 1].type === 'TRANSFER') items[items.length - 1].last = true;
      else if (!items.some((it) => it.last && it.type === 'TRANSFER')) { const lastFast = items[items.length - 1]; if (lastFast) lastFast.lessonLast = true; }
    }
    return items;
  };

  /* ------------------------------------------------------------------ 組出今天的練習 */
  function largestRemainder(total, weights) {
    const raw = weights.map((w) => w * total);
    const base = raw.map(Math.floor);
    let left = total - base.reduce((a, b) => a + b, 0);
    const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; k < order.length && left > 0; k++, left--) base[order[k][1]]++;
    return base;
  }

  function weakness(state, pid) {
    const p = S.getProgress(state, pid);
    const errs = Object.values(state.errors).filter((e) => !e.resolved && e.pid === pid).length;
    return 100 - S.effective(p) + errs * 8 + (p.n.transfer < 3 ? 6 : 0);
  }

  function interleave(items, rng) {
    const groups = {};
    items.forEach((it) => { (groups[it.pid] = groups[it.pid] || []).push(it); });
    const out = [];
    let last = null;
    while (out.length < items.length) {
      const keys = Object.keys(groups).filter((k) => groups[k].length);
      let cand = keys.filter((k) => k !== last);
      if (!cand.length) cand = keys;
      const maxLen = Math.max.apply(null, cand.map((k) => groups[k].length));
      cand = cand.filter((k) => groups[k].length === maxLen);
      const k = U.pick(rng, cand);
      out.push(groups[k].shift());
      last = k;
    }
    return out;
  }

  /* 專項練習：只練某一個句型（母句暗誦 + 修復 + 變形） */
  function focusQueue(state, content, now, opts, sess) {
    const pid = opts.onlyPid;
    const size = opts.size || state.settings.session_size || 8;
    const rng = U.rng(U.dayKey(now) + ':focus:' + pid + ':' + (state.daily.items || 0));
    const taken = new Set();
    const items = [];
    items.push({ uid: nextUid(sess), type: 'FAST_RECALL', pid, origin: 'practice', limit: Sess.profile(state).fast[1] });
    Object.values(state.errors).filter((e) => !e.resolved && e.pid === pid).sort((a, b) => b.fail_count - a.fail_count).slice(0, 2).forEach((e) => {
      const ex = Sess.pickTransfer(state, content, pid, { rng, exclude: taken, preferFocus: e.tag });
      if (ex) { taken.add(ex.id); items.push({ uid: nextUid(sess), type: 'ERROR_REPAIR', pid, ex: ex.id, origin: 'repair', repair_for: S.errKey(pid, e.tag), disguise: true }); }
    });
    for (let k = 0; items.length < size && k < size * 2; k++) {
      const ex = Sess.pickTransfer(state, content, pid, { rng, exclude: taken });
      if (!ex) break;
      taken.add(ex.id);
      items.push({ uid: nextUid(sess), type: 'TRANSFER', pid, ex: ex.id, origin: 'practice' });
    }
    return { kind: 'focus', lessonPid: null, lesson: [], practice: items, parts: { due: 0, repair: 0, transfer: items.length, free: 0, lesson: 0 } };
  }

  /* 回傳 {lessonPid, items(含課程步驟), parts} ；不改動進度 */
  Sess.buildQueue = function (state, content, now, opts, sess) {
    opts = opts || {};
    Sess.ensureDaily(state, now);
    S.refreshUnlocks(state, content.patterns);
    if (opts.onlyPid) return focusQueue(state, content, now, opts, sess);
    const size = opts.size || state.settings.session_size || 8;
    const rng = U.rng(U.dayKey(now) + ':' + (opts.salt != null ? opts.salt : state.daily.sessions) + ':' + (opts.seed || ''));
    const kind = opts.kind || (state.daily.sessions === 0 ? 'daily' : 'extra');

    // 1. 要不要上新句型課
    let lessonPid = null;
    const inProgress = content.patterns.find((pt) => { const p = S.getProgress(state, pt.id); return p.unlocked && !p.lesson_done && p.stage > 0; });
    if (opts.lessonPid) lessonPid = opts.lessonPid;
    else if (inProgress) lessonPid = inProgress.id;
    else if (!opts.noLesson && kind === 'daily' && state.daily.lessons < 1) {
      const nxt = content.patterns.find((pt) => { const p = S.getProgress(state, pt.id); return p.unlocked && !p.lesson_done; });
      if (nxt) lessonPid = nxt.id;
    }
    const lesson = lessonPid ? Sess.lessonItems(state, content, lessonPid, rng, sess) : [];

    // 2. 練習題配額：40% 到期複習 / 25% 弱點修復 / 25% 變形 / 10% 新內容（自由生成）
    const B = lessonPid ? Math.max(3, size - 3) : size;
    const learned = content.patterns.filter((pt) => { const p = S.getProgress(state, pt.id); return p.unlocked && p.lesson_done; });
    const taken = new Set(lesson.filter((it) => it.ex).map((it) => it.ex));

    // 到期複習：每個到期的 Pattern 一題，母句／變形輪流。
    // 同時到期很多個時，先處理「晚了相對間隔最多」的（1 天間隔晚 1 天，比 30 天間隔晚 1 天更危險）
    const lateness = (p) => (now - p.next_review_at) / (S.INTERVALS[Math.min(p.review_stage || 0, S.INTERVALS.length - 1)] * U.DAY);
    const due = learned.filter((pt) => S.isDue(S.getProgress(state, pt.id), now))
      .sort((a, b) => lateness(S.getProgress(state, b.id)) - lateness(S.getProgress(state, a.id)));
    const dueItems = [];
    due.forEach((pt) => {
      const p = S.getProgress(state, pt.id);
      const prof = Sess.profile(state);
      if (p.last_review_kind !== 'recall') {
        dueItems.push({ uid: nextUid(sess), type: 'FAST_RECALL', pid: pt.id, origin: 'due', limit: p.review_stage >= 2 ? prof.fast[1] : prof.fast[0] });
      } else {
        const ex = Sess.pickTransfer(state, content, pt.id, { rng, exclude: taken });
        if (ex) { taken.add(ex.id); dueItems.push({ uid: nextUid(sess), type: 'TRANSFER', pid: pt.id, ex: ex.id, origin: 'due' }); }
      }
    });

    // 弱點修復：還沒修好的錯誤
    const repairItems = [];
    const seenPid = new Set();
    Object.values(state.errors).filter((e) => !e.resolved && (e.due_at == null || e.due_at <= now) && content.byPattern[e.pid])
      .sort((a, b) => b.fail_count - a.fail_count || b.last_failed_at - a.last_failed_at)
      .forEach((e) => {
        if (seenPid.has(e.pid)) return;
        const ex = Sess.pickTransfer(state, content, e.pid, { rng, exclude: taken, preferFocus: e.tag });
        if (!ex) return;
        taken.add(ex.id); seenPid.add(e.pid);
        repairItems.push({ uid: nextUid(sess), type: 'ERROR_REPAIR', pid: e.pid, ex: ex.id, origin: 'repair', repair_for: S.errKey(e.pid, e.tag), disguise: true });
      });

    // 變形題：先練比較弱的 Pattern
    const ranked = learned.map((pt) => pt.id).sort((a, b) => weakness(state, b) - weakness(state, a));
    const transferItems = [];
    for (let round = 0; round < 3; round++) {
      ranked.forEach((pid) => {
        const ex = Sess.pickTransfer(state, content, pid, { rng, exclude: taken, unseenOnly: round < 2 });
        if (ex) { taken.add(ex.id); transferItems.push({ uid: nextUid(sess), type: 'TRANSFER', pid, ex: ex.id, origin: 'transfer' }); }
      });
    }

    // 新內容：自由生成（Stage 7）——入門課完成隔天起才會出現
    const freeItems = [];
    const freeElig = learned.filter((pt) => {
      const p = S.getProgress(state, pt.id);
      return p.transfer_unseen_ok.length >= 3 && U.daysBetween(p.lesson_done_at || now, now) >= 1 && (!p.last_free_at || U.daysBetween(p.last_free_at, now) >= 3);
    }).sort((a, b) => weakness(state, b.id) - weakness(state, a.id));
    if (freeElig.length) freeItems.push({ uid: nextUid(sess), type: 'FREE_PRODUCTION', pid: freeElig[0].id, origin: 'free' });

    // 配額是「目標」；缺額依優先級遞補（到期 → 修復 → 變形 → 新內容）。
    // 單一句型每次最多 3–4 題，避免整個 Session 都在刷同一個句型（規格 §28：要交錯）
    const quota = largestRemainder(B, [0.40, 0.25, 0.25, 0.10]);
    const perCap = Math.max(2, Math.min(4, Math.ceil(B * 0.6)));
    const maxDue = Math.ceil(B * 0.6);
    const pools = [dueItems, repairItems, transferItems, freeItems];
    const chosen = [[], [], [], []];
    const cnt = {};
    const used = new Set();
    let have = 0;
    const take = (i, n) => {
      for (const it of pools[i]) {
        if (n <= 0 || have >= B) break;
        if (used.has(it.uid) || (cnt[it.pid] || 0) >= perCap) continue;
        used.add(it.uid); cnt[it.pid] = (cnt[it.pid] || 0) + 1; chosen[i].push(it); have++; n--;
      }
    };
    pools.forEach((_, i) => take(i, quota[i]));
    for (let guard = 0; have < B && guard < 40; guard++) {
      const before = have;
      take(0, Math.max(0, Math.min(1, maxDue - chosen[0].length)));
      take(1, 1); take(2, 1); take(3, 1);
      if (have === before) break;
    }
    if (have < B && learned.length) {
      // 沒看過的變形題都用完了：允許重複看過的（最久沒看的優先）
      for (let k = 0; have < B && k < 40; k++) {
        const pid = learned[k % learned.length].id;
        if ((cnt[pid] || 0) >= perCap) continue;
        const ex = Sess.pickTransfer(state, content, pid, { rng, exclude: taken });
        if (ex) { taken.add(ex.id); cnt[pid] = (cnt[pid] || 0) + 1; chosen[2].push({ uid: nextUid(sess), type: 'TRANSFER', pid, ex: ex.id, origin: 'transfer' }); have++; }
      }
    }
    const practice = interleave(chosen[0].concat(chosen[1], chosen[2]), rng).concat(chosen[3]);

    return {
      kind, lessonPid, lesson, practice,
      parts: { due: chosen[0].length, repair: chosen[1].length, transfer: chosen[2].length, free: chosen[3].length, lesson: lesson.length }
    };
  };

  Sess.estimate = function (state, content, now, opts) {
    const q = Sess.buildQueue(state, content, now, Object.assign({}, opts || {}, { seed: 'preview' }));
    const all = q.lesson.concat(q.practice);
    return { n: all.length, minutes: minutesOf(Sess.secondsOf(all)), parts: q.parts, lessonPid: q.lessonPid, kind: q.kind };
  };

  Sess.start = function (state, content, now, opts) {
    opts = opts || {};
    const daily = Sess.ensureDaily(state, now);
    const sess = {
      id: 's' + now.toString(36), kind: null, started_at: now, queue: [], idx: 0, counter: 0, results: [], repairCount: {}, sttRetry: {}, retry: {},
      askedEx: [], mastery_start: {}, resolved_start: {}, lessonPid: null, lessonCompleted: null, newlyUnlocked: [], repaired: [], dayKey: daily.key
    };
    const q = Sess.buildQueue(state, content, now, opts, sess);
    sess.kind = q.kind;
    sess.lessonPid = q.lessonPid;
    sess.queue = q.lesson.concat(q.practice);
    content.patterns.forEach((pt) => { const p = S.getProgress(state, pt.id); sess.mastery_start[pt.id] = S.effective(p); });
    Object.keys(state.errors).forEach((k) => { sess.resolved_start[k] = state.errors[k].resolved; });
    state.session = sess;
    return sess;
  };

  Sess.current = (state) => (state.session && state.session.idx < state.session.queue.length ? state.session.queue[state.session.idx] : null);
  Sess.progressOf = (state) => (state.session ? { done: state.session.idx, total: state.session.queue.length } : null);
  Sess.abandon = function (state) { state.session = null; };
  /* 新句型課裡的暗記／暗誦答錯 → 當場重試（最多 2 次），而不是丟給回馬槍 */
  Sess.willRetry = function (state, item, result) {
    return !!(state.session && item.origin === 'lesson' && (item.type === 'CLOZE' || item.type === 'RECALL') && result.status !== 'stt_uncertain' && !S.isOk(result.status) && (state.session.retry[item.uid] || 0) < 2);
  };
  /* 自由造句可以跳過（不計分，也不會馬上再出現） */
  Sess.skipFree = function (state, item, now) {
    const p = S.getProgress(state, item.pid);
    p.last_free_at = now;
    state.session.results.push({ uid: item.uid, pid: item.pid, type: item.type, origin: item.origin, status: 'skipped', tags: [], ok: false });
    state.session.idx++;
  };

  /* ------------------------------------------------------------------ 能力檢測（Probe）
   * 每個句型 1 題「從來沒練過」的保留題，不給即時回饋，也不影響熟練度。
   * 用來回答最重要的問題：沒背過的新句子，現在答得對嗎？（規格 §40-B、§41） */
  Sess.startProbe = function (state, content, now) {
    const round = state.probes.length;
    const queue = [];
    const sess = { id: 'p' + now.toString(36), kind: 'probe', started_at: now, queue, idx: 0, counter: 0, results: [], repairCount: {}, sttRetry: {}, retry: {}, askedEx: [] };
    content.patterns.forEach((pt) => {
      const hold = content.byPattern[pt.id].holdout;
      if (!hold.length) return;
      const ex = hold[round % hold.length];
      queue.push({ uid: nextUid(sess), type: 'PROBE', pid: pt.id, ex: ex.id, origin: 'probe' });
    });
    state.session = sess;
    return sess;
  };
  function commitProbe(state, content, item, result, now) {
    const sess = state.session;
    sess.results.push({ uid: item.uid, pid: item.pid, ex: item.ex, status: result.status === 'stt_uncertain' ? 'incorrect' : result.status, answer: result.answer, target: result.target, rt: result.reaction_ms });
    sess.idx++;
    return { advance: true, retry: false, events: [] };
  }
  function finishProbe(state, content, now) {
    const sess = state.session;
    const ok = sess.results.filter((r) => S.isOk(r.status)).length;
    const lats = sess.results.filter((r) => S.isOk(r.status) && r.rt != null).map((r) => r.rt);
    const summary = { id: sess.id, kind: 'probe', t: now, n: sess.results.length, ok, avg_rt: lats.length ? Math.round(U.avg(lats)) : null, items: sess.results.slice() };
    state.probes.push(summary);
    state.session = null;
    return summary;
  }

  /* ------------------------------------------------------------------ 批改（不改動進度） */
  function exOf(state, content, item) {
    const pat = content.patternById[item.pid];
    if (item.type === 'CLOZE' || item.type === 'RECALL' || item.type === 'FAST_RECALL') return { ex: motherEx(pat), exId: pat.id + '-M' };
    const ex = content.byId[item.ex];
    return { ex, exId: ex ? ex.id : null };
  }

  Sess.clozeIndexes = function (pat, level) {
    if (level === 'C') return E.displayWords(pat.mother).map((_, i) => i);
    return (pat.cloze && pat.cloze[level]) || [];
  };

  Sess.grade = function (state, content, item, payload) {
    payload = payload || {};
    const pat = content.patternById[item.pid];
    const base = {
      uid: item.uid, type: item.type, pid: item.pid, origin: item.origin, hint: !!payload.hint, input_type: payload.inputType || 'text',
      reaction_ms: payload.reaction_ms == null ? null : Math.round(payload.reaction_ms), completion_ms: payload.completion_ms == null ? null : Math.round(payload.completion_ms),
      answer: payload.answer || '', target: null, ex_id: null
    };
    if (item.type === 'LEARN') return Object.assign(base, { status: 'correct', info: true, tags: [], notes: [] });
    if (item.type === 'LISTEN_REPEAT') {
      let status = 'correct';
      if (payload.answer) {
        const r = E.judge({ answer: payload.answer, ex: motherEx(pat), pattern: pat, inputType: 'voice', confidence: payload.confidence });
        status = S.isOk(r.status) ? 'correct' : r.status === 'stt_uncertain' ? 'stt_uncertain' : 'partial';
      }
      return Object.assign(base, { status, info: true, tags: [], notes: [], target: pat.mother });
    }
    if (item.type === 'FREE_PRODUCTION') {
      const known = (content.byPattern[pat.id] ? content.byPattern[pat.id].all.concat(content.byPattern[pat.id].holdout).map((e) => e.en) : []).concat([pat.mother]);
      const r = E.judgeFree({ answer: payload.answer, pattern: pat, known });
      return Object.assign(base, r, { target: null, free: true });
    }
    const { ex, exId } = exOf(state, content, item);
    if (!ex) return Object.assign(base, { status: 'incorrect', tags: [], notes: [], target: '' });
    const overrides = state.overrides[exId] || [];
    let answer = payload.answer;
    let blankOk = null;
    if (item.type === 'CLOZE' && item.level !== 'C' && !payload.assembled) {
      const idx = Sess.clozeIndexes(pat, item.level);
      answer = E.clozeAssemble(pat.mother, idx, payload.fills || []);
      blankOk = E.clozeCheck(pat.mother, idx, payload.fills || []);
    }
    const r = E.judge({ answer, ex, overrides, pattern: pat, inputType: payload.inputType || 'text', confidence: payload.confidence });
    return Object.assign(base, r, { target: ex.en, ex_id: exId, blankOk, answer: answer });
  };

  /* 使用者說「我這樣說也對」：加進這題的個人可接受清單，並重新批改 */
  Sess.addOverride = function (state, content, item, result) {
    const { exId } = exOf(state, content, item);
    if (!exId || !result.answer) return null;
    const list = (state.overrides[exId] = state.overrides[exId] || []);
    if (list.indexOf(result.answer) < 0) list.push(result.answer);
    const r2 = Sess.grade(state, content, item, { answer: result.answer, assembled: true, hint: result.hint, inputType: result.input_type, reaction_ms: result.reaction_ms, completion_ms: result.completion_ms });
    r2.override = true;
    return r2;
  };

  /* ------------------------------------------------------------------ 記錄與回馬槍 */
  function recordAttempt(state, sess, item, result, exId, first, now) {
    const a = {
      t: now, s: sess.id, pid: item.pid, ex: exId, type: item.type, origin: item.origin, in: result.input_type, ans: result.answer, tgt: result.target,
      st: result.status, tags: result.tags || [], rt: result.reaction_ms, ct: result.completion_ms, hint: result.hint ? 1 : 0, first: first ? 1 : 0, ov: result.override ? 1 : 0
    };
    if (result.iv != null) a.iv = result.iv;
    state.attempts.push(a);
    if (state.attempts.length > 2500) state.attempts.splice(0, state.attempts.length - 2500);
    state.stats.total_attempts = (state.stats.total_attempts || 0) + 1;
  }

  function markSeen(p, exId, now) {
    if (!exId) return;
    const s = p.seen[exId] || (p.seen[exId] = { n: 0, last: 0 });
    s.n++; s.last = now;
  }

  function insertRepair(state, content, sess, item, pid, tag, now) {
    const key = S.errKey(pid, tag);
    const entry = state.errors[key];
    if (sess.queue.slice(sess.idx + 1).some((it) => it.repair_for === key)) return null;      // 已經排好了
    if ((sess.repairCount[key] || 0) >= 2) { if (entry) entry.due_at = now + 10 * U.MIN; return null; }   // 這次先到這；10 分鐘後的下一次再測
    const rng = U.rng(sess.id + ':' + sess.counter + ':' + key);
    const ex = Sess.pickTransfer(state, content, pid, { rng, preferFocus: tag, exclude: new Set([item.ex, ...(sess.askedEx || [])]) });
    if (!ex) return null;
    const gap = U.randInt(rng, 2, 5);
    const pos = Math.min(sess.idx + 1 + gap, sess.queue.length);
    const it = { uid: nextUid(sess), type: 'ERROR_REPAIR', pid, ex: ex.id, origin: 'repair', repair_for: key, disguise: true };
    sess.queue.splice(pos, 0, it);
    sess.repairCount[key] = (sess.repairCount[key] || 0) + 1;
    return it;
  }

  /* 送出答案之後「確定」這一題：更新熟練度、錯誤記憶、排程，並決定要不要前進 */
  Sess.commit = function (state, content, item, result, now) {
    if (item.type === 'PROBE') return commitProbe(state, content, item, result, now);
    const sess = state.session;
    const p = S.getProgress(state, item.pid);
    const out = { advance: true, retry: false, events: [] };
    const { exId } = (item.type === 'FREE_PRODUCTION') ? { exId: item.pid + '-F' } : (item.type === 'LEARN' || item.type === 'LISTEN_REPEAT') ? { exId: item.pid + '-M' } : exOf(state, content, item);
    const first = !(p.seen[exId] && p.seen[exId].n > 0);
    result.first_exposure = first;
    const inLesson = item.origin === 'lesson';
    if (item.origin === 'due') result.iv = S.INTERVALS[Math.min(p.review_stage || 0, S.INTERVALS.length - 1)];

    if (result.status === 'stt_uncertain') {
      recordAttempt(state, sess, item, result, exId, first, now);
      sess.sttRetry[item.uid] = (sess.sttRetry[item.uid] || 0) + 1;
      return { advance: false, retry: true, events: ['stt'], stt: true };
    }

    recordAttempt(state, sess, item, result, exId, first, now);
    markSeen(p, exId, now);
    if (item.ex) sess.askedEx.push(item.ex);

    const ok = S.isOk(result.status);
    const hintMult = result.hint ? 0.7 : 1;
    const sc = S.statusScore(result.status);
    let retry = false;
    let noteRetries = () => { sess.retry[item.uid] = (sess.retry[item.uid] || 0) + 1; };

    switch (item.type) {
      case 'LEARN': S.updateSub(p, 'recognition', 60); p.stage = Math.max(p.stage, 1); break;
      case 'LISTEN_REPEAT': S.updateSub(p, 'recognition', 80); p.stage = Math.max(p.stage, 2); break;
      case 'CLOZE': {
        S.updateSub(p, 'recognition', sc * hintMult);
        if (!ok && inLesson && (sess.retry[item.uid] || 0) < 2) { retry = true; noteRetries(); }
        else if (item.last) p.stage = Math.max(p.stage, 3);
        break;
      }
      case 'RECALL': {
        S.updateSub(p, 'recall', sc * hintMult);
        if (ok) p.recall_ok++;
        if (!ok && inLesson && (sess.retry[item.uid] || 0) < 2) { retry = true; noteRetries(); }
        else p.stage = Math.max(p.stage, 4);
        break;
      }
      case 'FAST_RECALL': {
        const within = ok && result.reaction_ms != null && result.reaction_ms <= (item.limit || 5000);
        const lat = S.latencyScore(result.reaction_ms);
        S.updateSub(p, 'speed', ok ? lat * hintMult : result.status === 'partial' ? lat * 0.4 : 0);
        S.updateSub(p, 'recall', sc * hintMult, 0.6);
        if (ok) p.recall_ok++;
        if (within) p.fast_ok++;
        if (item.origin === 'due') { S.updateSub(p, 'retention', sc * hintMult); p.last_review_kind = 'recall'; }
        if (item.last) p.stage = Math.max(p.stage, 5);
        result.within = within;
        break;
      }
      case 'TRANSFER': case 'ERROR_REPAIR': {
        const w = first ? 1 : 0.5;
        S.updateSub(p, 'transfer', sc * hintMult, w);
        const ex = content.byId[item.ex];
        if (ex) {
          const ls = p.level_stats[ex.level] || (p.level_stats[ex.level] = { n: 0, ok: 0 });
          ls.n++; if (ok) ls.ok++;
        }
        if (ok && first && p.transfer_unseen_ok.indexOf(item.ex) < 0) p.transfer_unseen_ok.push(item.ex);
        if (item.origin === 'due') { S.updateSub(p, 'retention', sc * hintMult); p.last_review_kind = 'transfer'; }
        break;
      }
      case 'FREE_PRODUCTION': {
        S.updateSub(p, 'transfer', sc, 1.5);
        p.free_done++; p.last_free_at = now;
        break;
      }
    }
    if (ok && SCORED.has(item.type)) { p.total_ok++; }
    if (SCORED.has(item.type)) p.total_attempts++;

    // 到期複習：每個 Pattern 每次訓練只更新一次排程
    if (item.origin === 'due' && p.last_review_session !== sess.id) {
      p.last_review_session = sess.id;
      S.onReviewResult(p, ok, result.status === 'incorrect' ? 'serious' : 'minor', now);
      out.events.push('review:' + item.pid + ':' + (ok ? 'ok' : 'fail'));
    }

    // 課程最後一題：這個 Pattern 的入門課完成 → 排隔天複習
    if (!retry && inLesson && item.last && (item.type === 'TRANSFER' || (item.type === 'FAST_RECALL' && item.lessonLast)) && !p.lesson_done) {
      p.stage = 6; p.lesson_done = true; p.lesson_done_at = now; p.review_stage = 0; p.next_review_at = S.dueIn(now, 1);
      sess.lessonCompleted = item.pid;
      state.daily.lessons++;
      out.events.push('lesson-done:' + item.pid);
    }

    // 錯誤記憶 + 回馬槍
    if (SCORED.has(item.type) && !ok && !(inLesson && retry)) {
      const tags = result.variation ? [] : (result.tags || []).filter((t) => !REPAIR_SKIP.has(t));      // 只是說法不同：不當成文法錯誤
      tags.slice(0, 2).forEach((tag) => {
        S.recordFail(state, item.pid, tag, { now, expected: result.target, actual: result.answer });
        const it = insertRepair(state, content, sess, item, item.pid, tag, now);
        if (it) out.events.push('repair-queued:' + tag);
      });
    }
    if (item.repair_for) {
      const [pid, tag] = item.repair_for.split('|');
      const e = S.getErr(state, pid, tag);
      if (ok && e && !e.resolved) {
        const r = S.recordRepairSuccess(state, pid, tag, sess.id, now);
        sess.repaired.push({ pid, tag, resolved: r.becameResolved, count: e.success_sessions.length });
        out.events.push((r.becameResolved ? 'resolved:' : 'repair-ok:') + tag);
      } else if (!ok && e && !e.resolved && (result.tags || []).indexOf(tag) < 0) {
        const it = insertRepair(state, content, sess, item, pid, tag, now);     // 沒再犯同一個錯，但也沒答對 → 再排一次
        if (it) out.events.push('repair-queued:' + tag);
      }
    }

    S.refreshUnlocks(state, content.patterns).forEach((pid) => { if (sess.newlyUnlocked.indexOf(pid) < 0) sess.newlyUnlocked.push(pid); });

    sess.results.push({ uid: item.uid, pid: item.pid, type: item.type, origin: item.origin, status: result.status, tags: result.tags || [], ok });
    state.daily.items = (state.daily.items || 0) + 1;
    if (retry) { out.advance = false; out.retry = true; }
    else sess.idx++;
    return out;
  };

  /* ------------------------------------------------------------------ 結算（規格 §39） */
  Sess.finish = function (state, content, now) {
    const sess = state.session;
    if (!sess) return null;
    if (sess.kind === 'probe') return finishProbe(state, content, now);
    const touched = {};
    sess.results.forEach((r) => {
      const t = touched[r.pid] || (touched[r.pid] = { n: 0, ok: 0, scored: 0, fail: 0 });
      t.n++;
      if (SCORED.has(r.type)) { t.scored++; if (r.ok) t.ok++; else t.fail++; }
    });
    const mastered = [], stabilizing = [], needs = [];
    Object.keys(touched).forEach((pid) => {
      const p = S.getProgress(state, pid);
      const m = S.effective(p), before = sess.mastery_start[pid] || 0;
      const t = touched[pid];
      // 每天只留一筆熟練度紀錄
      const day = U.dayKey(now);
      const last = p.history[p.history.length - 1];
      if (last && last.d === day) last.m = m; else p.history.push({ d: day, t: now, m });
      if (p.history.length > 120) p.history.shift();
      t.delta = U.round1(m - before);
      if (t.scored && t.fail > t.ok) needs.push(pid);
      else if (m >= 75) mastered.push(pid);
      else if (t.delta > 0 || t.ok > 0) stabilizing.push(pid);
      else needs.push(pid);
    });
    const unresolved = S.unresolvedErrors(state);
    const repaired = sess.repaired.slice();
    const n = sess.results.length;
    const nScored = sess.results.filter((r) => SCORED.has(r.type)).length;
    const nOk = sess.results.filter((r) => SCORED.has(r.type) && r.ok).length;
    const lats = state.attempts.filter((a) => a.s === sess.id && a.rt != null && a.st && (a.st === 'correct' || a.st === 'acceptable')).map((a) => a.rt);

    // 明天大概要練多久
    const tomorrowStart = U.addDays(now, 1), tomorrowEnd = U.addDays(now, 2);
    let dueTomorrow = 0;
    content.patterns.forEach((pt) => { const p = S.getProgress(state, pt.id); if (p.unlocked && p.lesson_done && p.next_review_at != null && p.next_review_at < tomorrowEnd) dueTomorrow++; });
    const hasLesson = content.patterns.some((pt) => { const p = S.getProgress(state, pt.id); return p.unlocked && !p.lesson_done; });
    const tomorrowN = Math.min(state.settings.session_size || 8, Math.max(dueTomorrow + unresolved.length, 4));
    const tomorrowSec = tomorrowN * 27 + (hasLesson ? 190 : 0);

    const summary = {
      id: sess.id, kind: sess.kind, started_at: sess.started_at, finished_at: now, n, n_scored: nScored, n_ok: nOk,
      mastered, stabilizing, needs, repaired, lesson_pid: sess.lessonCompleted, newly_unlocked: sess.newlyUnlocked.slice(),
      touched, avg_latency_ms: lats.length ? Math.round(U.avg(lats)) : null,
      tomorrow: { n: tomorrowN + (hasLesson ? 8 : 0), minutes: minutesOf(tomorrowSec), lesson: hasLesson }
    };
    state.sessions.push(summary);
    if (state.sessions.length > 300) state.sessions.shift();
    state.daily.sessions++;
    state.session = null;
    return summary;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
