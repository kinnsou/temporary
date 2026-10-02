/* Pattern 10 — 訓練畫面（Session Runner）
 * 一次只顯示一題。流程：出題 → 作答（打字或說話）→ 回饋卡 →「繼續」才正式記入進度。
 * 這樣「我這樣說也對」才能在記入前改判。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const U = P10.util, E = P10.engine, S = P10.srs, Sess = P10.session, Sp = P10.speech, UI = P10.ui;
  const h = UI.h;
  const Runner = (P10.runner = {});
  const doc = g.document;
  const App = () => P10.app;

  let R = null;            // 目前這一題的畫面狀態
  let body, foot, topBar, countEl, barEl;
  let timers = [];

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ------------------------------------------------------------------ 取資料 */
  const patOf = (item) => App().content.patternById[item.pid];
  const MOTHER_TYPES = new Set(['LEARN', 'LISTEN_REPEAT', 'CLOZE', 'RECALL', 'FAST_RECALL']);
  function targetOf(item) {
    if (MOTHER_TYPES.has(item.type)) return patOf(item).mother;
    const ex = App().content.byId[item.ex];
    return ex ? ex.en : '';
  }
  function promptOf(item) {
    if (MOTHER_TYPES.has(item.type)) return patOf(item).zh;
    const ex = App().content.byId[item.ex];
    return ex ? ex.zh : '';
  }
  function freePrompt(item) {
    const pat = patOf(item), p = S.getProgress(App().state, item.pid);
    const list = (pat.free && pat.free.prompts) || [];
    return list.length ? list[(p.free_done || 0) % list.length] : '用這個句型造一個你自己的句子。';
  }
  const settings = () => App().state.settings;

  function speak(text, slow) {
    if (!Sp.ttsSupported) { UI.toast('這個瀏覽器不支援朗讀'); return Promise.resolve(false); }
    return Sp.speak(text, { rate: slow ? settings().rate_slow : settings().rate_normal, voiceURI: settings().voice_uri });
  }

  /* 語音輸入是否可用／偏好 */
  function voiceUsable() { return Sp.sttSupported; }
  function wantVoice() { const m = settings().input_mode; return voiceUsable() && (m === 'voice' || m === 'both'); }
  function voiceFirst() { return voiceUsable() && settings().input_mode === 'voice'; }

  /* ------------------------------------------------------------------ 外框 */
  Runner.mount = function () {
    const state = App().state;
    if (!state.session) { App().go('#/today'); return doc.createElement('div'); }
    clearTimers();
    body = h('div', { class: 'runner-body' });
    foot = h('div', { class: 'runner-foot' });
    barEl = h('i', { style: { width: '0%' } });
    countEl = h('div', { class: 'count' });
    topBar = h('div', { class: 'runner-top' },
      h('button', { class: 'icon-btn', 'aria-label': '離開訓練', onclick: onClose }, UI.icon('x')),
      h('div', { class: 'prog' }, h('div', { class: 'bar thin' }, barEl)),
      countEl);
    const root = h('div', { class: 'runner' }, topBar, body, foot);
    later(renderItem, 0);
    doc.addEventListener('visibilitychange', onHidden);
    return root;
  };
  Runner.unmount = function () {
    clearTimers();
    stopListening(true);
    Sp.stopSpeaking();
    doc.removeEventListener('keydown', onKeyContinue);
    doc.removeEventListener('visibilitychange', onHidden);
    R = null;
  };

  function onHidden() {
    // 切到別的程式時，把「已看到回饋但還沒按繼續」的這題先記下來，避免遺失
    if (doc.visibilityState === 'hidden' && R && R.phase === 'feedback' && !R.committed && R.result && R.item.type !== 'PROBE') {
      commitOnly();
      App().save();
    }
  }

  function updateTop() {
    const st = App().state.session;
    const total = st.queue.length, done = st.idx;
    barEl.style.width = Math.round((done / Math.max(total, 1)) * 100) + '%';
    countEl.textContent = Math.min(done + 1, total) + ' / ' + total;
  }

  function onClose() {
    const st = App().state.session;
    const done = st.results.length;
    const isProbe = st.kind === 'probe';
    UI.sheet({
      title: isProbe ? '要離開檢測嗎？' : '要先休息嗎？',
      body: isProbe ? '檢測還沒做完，離開就不會留下這次的結果。' : '你的進度已經存好了，下次回來可以接著練。',
      actions: [
        { label: '繼續練習', kind: '' },
        isProbe ? { label: '離開（不記錄）', kind: 'secondary', onClick: () => { Sess.abandon(App().state); App().save(); App().go('#/progress'); } }
          : { label: '先離開（稍後繼續）', kind: 'secondary', onClick: () => { flushPending(); App().go('#/today'); } },
        !isProbe && done > 0 ? { label: '結束訓練，看結算', kind: 'secondary', onClick: () => { flushPending(); finishNow(); } } : null
      ].filter(Boolean)
    });
  }
  function flushPending() { if (R && R.phase === 'feedback' && !R.committed && R.result && R.item.type !== 'PROBE') { commitOnly(); } App().save(); }

  /* ------------------------------------------------------------------ 一題 */
  function renderItem() {
    clearTimers();
    stopListening(true);
    doc.removeEventListener('keydown', onKeyContinue);
    const state = App().state;
    const item = Sess.current(state);
    if (!item) { finishNow(); return; }
    R = { item, phase: 'ask', tShow: null, tFirst: null, hint: false, listening: false, ctl: null, result: null, committed: false, fills: [], blanks: [], ta: null, forceText: false, sttTries: 0 };
    UI.clear(body); UI.clear(foot);
    updateTop();
    body.style.animation = 'none'; void body.offsetWidth; body.style.animation = '';
    switch (item.type) {
      case 'LEARN': return renderLearn(item);
      case 'LISTEN_REPEAT': return renderListen(item);
      case 'CLOZE': return item.level === 'C' ? renderRecallLike(item) : renderCloze(item);
      default: return renderRecallLike(item);
    }
  }

  function chip(text, cls) { return h('span', { class: 'chip label-chip ' + (cls || '') }, text); }

  /* ---------- LEARN：理解 ---------- */
  function renderLearn(item) {
    const pat = patOf(item);
    const sayBtns = h('div', { class: 'row-flex mt12' },
      h('button', { class: 'icon-btn accent', 'aria-label': '播放', onclick: () => speak(pat.mother, false) }, UI.icon('volume')),
      h('button', { class: 'btn secondary sm', onclick: () => speak(pat.mother, true) }, '慢速 ' + settings().rate_slow + '×'));
    UI.add(body, 
      chip('第 ' + pat.order + ' 個句型 · ' + pat.title, 'accent'),
      h('div', { class: 'card' },
        h('div', { class: 'sentence' }, pat.mother),
        h('div', { class: 'zh-line' }, pat.zh),
        h('div', { class: 'template' }, pat.template),
        sayBtns),
      h('div', { class: 'card flat soft' },
        h('div', { class: 'tiny', style: { marginBottom: '6px', fontWeight: 600 } }, '一個重點'),
        h('p', { class: 'explain' }, pat.explain),
        (pat.contrast || []).length ? h('div', { class: 'contrast' }, pat.contrast.map((c) => [
          h('div', { class: 'ok' }, h('i', null, '✓'), c.ok),
          h('div', { class: 'ng' }, h('i', null, '✗'), c.ng)
        ])) : null,
        pat.contrast && pat.contrast[0] && pat.contrast[0].note ? h('p', { class: 'tiny mt8' }, pat.contrast[0].note) : null));
    foot.append(h('button', { class: 'btn', onclick: () => { Sp.stopSpeaking(); advanceInfo({ done: true }); } }, '我懂了'));
    later(() => { if (Sp.ttsSupported) speak(pat.mother, false); }, 350);
  }

  /* ---------- LISTEN_REPEAT：跟讀 ---------- */
  function renderListen(item) {
    const pat = patOf(item);
    const status = h('div', { class: 'mic-note' });
    const transcript = h('div', { class: 'transcript' });
    R.status = status; R.transcriptEl = transcript;
    const micBtn = h('button', { class: 'icon-btn rec', 'aria-label': '用說的跟讀', onclick: () => toggleListen(item, 'listen') }, UI.icon('mic'));
    R.micBtn = micBtn;
    UI.add(body, 
      chip('跟讀 · 聽一遍，再大聲唸一遍', 'accent'),
      h('div', { class: 'card' },
        h('div', { class: 'sentence' }, pat.mother),
        h('div', { class: 'zh-line' }, pat.zh),
        h('div', { class: 'listen-box mt16' },
          h('button', { class: 'icon-btn accent', 'aria-label': '播放', onclick: () => speak(pat.mother, false) }, UI.icon('volume')),
          h('button', { class: 'btn secondary sm', onclick: () => speak(pat.mother, true) }, '慢速 ' + settings().rate_slow + '×'),
          h('button', { class: 'btn quiet sm', onclick: () => speak(pat.mother, false) }, UI.icon('replay'), '重播'))),
      wantVoice() ? h('div', { class: 'card flat soft' }, h('div', { class: 'row-flex' }, micBtn, h('div', { class: 'grow' }, transcript, status))) : null);
    if (wantVoice()) {
      status.textContent = '按麥克風，把整句唸出來。';
      foot.append(h('button', { class: 'btn secondary', onclick: () => advanceInfo({ done: true }) }, '先跳過，直接繼續'));
    } else {
      foot.append(h('button', { class: 'btn', onclick: () => { Sp.stopSpeaking(); advanceInfo({ done: true }); } }, '我跟著唸了'));
    }
    later(() => speak(pat.mother, false), 300);
  }

  function advanceInfo(payload) {
    const item = R.item;
    const result = Sess.grade(App().state, App().content, item, payload);
    R.result = result;
    proceedWith(result);
  }

  /* ---------- CLOZE A / B：填空 ---------- */
  function renderCloze(item) {
    const pat = patOf(item);
    const words = E.displayWords(pat.mother);
    const idx = Sess.clozeIndexes(pat, item.level);
    const hintBtn = h('button', { class: 'link', onclick: () => useHint(item) }, UI.icon('bulb'), ' 顯示提示');
    R.hintBtn = hintBtn;
    const line = h('div', { class: 'cloze-line' });
    let k = 0;
    R.blanks = [];
    words.forEach((w, i) => {
      if (idx.indexOf(i) < 0) { line.append(h('span', { class: 'w' }, w)); return; }
      const core = E.blankAnswer(w), tail = w.slice(core.length);
      const my = k++;
      const inp = h('input', { class: 'blank', type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': '第 ' + (my + 1) + ' 格',
        style: { width: Math.max(2.4, core.length * 0.62 + 1) + 'em' },
        oninput: () => { if (R.tFirst == null) R.tFirst = performance.now(); updateClozeBtn(); },
        onkeydown: (e) => {
          if (e.key === ' ' || (e.key === 'Enter' && my < R.blanks.length - 1)) { e.preventDefault(); const nx = R.blanks[my + 1]; if (nx) nx.focus(); }
          else if (e.key === 'Enter') { e.preventDefault(); submitCloze(item); }
          else if (e.key === 'Backspace' && !inp.value && my > 0) { e.preventDefault(); R.blanks[my - 1].focus(); }
        } });
      inp.dataset.answer = core;
      R.blanks.push(inp);
      line.append(inp);
      if (tail) line.append(h('span', { class: 'w' }, tail));
    });
    const btn = h('button', { class: 'btn', disabled: true, onclick: () => submitCloze(item) }, '檢查');
    R.submitBtn = btn;
    UI.add(body, 
      chip('暗記 · 填空（' + item.level + '）', 'accent'),
      h('div', { class: 'cue' }, pat.zh),
      h('div', { class: 'card' }, line),
      h('div', { class: 'row-flex between' }, hintBtn, h('span', { class: 'tiny' }, '空格之間按空白鍵可以跳到下一格')),
      h('div', { id: 'fb-slot' }));
    foot.append(btn);
    R.tShow = performance.now();
    later(() => R.blanks[0] && R.blanks[0].focus(), 60);
  }
  function updateClozeBtn() { if (R.submitBtn) R.submitBtn.disabled = !R.blanks.every((b) => b.value.trim()); }
  function submitCloze(item) {
    if (R.phase !== 'ask' || !R.blanks.every((b) => b.value.trim())) return;
    submit(item, { fills: R.blanks.map((b) => b.value.trim()), inputType: 'text' });
  }

  /* ---------- 中文 → 英文（暗誦／瞬間提取／變形／自由造句／檢測） ---------- */
  function labelFor(item) {
    switch (item.type) {
      case 'CLOZE': return ['暗記 · 全部遮住，憑記憶寫出整句', 'accent'];
      case 'RECALL': return ['暗誦 · 看中文，寫出英文', 'accent'];
      case 'FAST_RECALL': return item.origin === 'lesson' ? ['瞬間提取 · ' + (item.limit / 1000) + ' 秒內開始作答', 'amber'] : ['複習', ''];
      case 'TRANSFER': return item.origin === 'lesson' ? ['變形 · 沒背過的新句子，用剛學的句型說說看', 'accent'] : item.origin === 'due' ? ['複習', ''] : ['變形', ''];
      case 'ERROR_REPAIR': return ['變形', ''];
      case 'PROBE': return ['能力檢測 · 沒背過的新句子', 'amber'];
      case 'FREE_PRODUCTION': return ['自由造句', 'accent'];
    }
    return ['', ''];
  }

  function renderRecallLike(item) {
    const isFree = item.type === 'FREE_PRODUCTION';
    const pat = patOf(item);
    const [lab, cls] = labelFor(item);
    const prompt = isFree ? freePrompt(item) : promptOf(item);
    const isFast = item.type === 'FAST_RECALL' && item.limit;
    const inputZone = h('div', { class: 'stack input-zone' });
    const ta = h('textarea', { class: 'answer', rows: 2, placeholder: isFree ? 'Write your own sentence…' : 'Type in English…', 'aria-label': '英文答案', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', lang: 'en',
      oninput: () => { if (R.tFirst == null && ta.value.length) R.tFirst = performance.now(); autoGrow(ta); R.submitBtn.disabled = !ta.value.trim(); },
      onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (ta.value.trim()) submitText(item); } } });
    R.ta = ta;
    R.submitBtn = h('button', { class: 'btn', disabled: true, onclick: () => submitText(item) }, '送出');
    R.skelSlot = h('div', { class: 'skeleton' });
    const extraLinks = h('div', { class: 'row-flex between' });
    if (!isFree && item.type !== 'PROBE') {
      R.hintBtn = h('button', { class: 'link', onclick: () => useHint(item) }, UI.icon('bulb'), ' 提示');
      UI.add(extraLinks, R.hintBtn);
    } else UI.add(extraLinks, h('span'));
    const idk = item.type === 'PROBE' || isFree
      ? (isFree ? h('button', { class: 'link muted', onclick: () => skipFree(item) }, '跳過這題') : h('button', { class: 'link muted', onclick: () => submit(item, { answer: '', inputType: 'text' }) }, '我不知道'))
      : h('button', { class: 'link muted', onclick: () => submit(item, { answer: '', inputType: 'text' }) }, '我不知道');
    UI.add(extraLinks, idk);

    // 語音
    let micZone = null;
    if (wantVoice()) {
      R.status = h('div', { class: 'mic-note' });
      R.transcriptEl = h('div', { class: 'transcript' });
      R.micBtn = h('button', { class: 'icon-btn rec', 'aria-label': '用說的回答', onclick: () => toggleListen(item, 'answer') }, UI.icon('mic'));
      micZone = h('div', { class: 'card flat soft' }, h('div', { class: 'row-flex' }, R.micBtn, h('div', { class: 'grow' }, R.transcriptEl, R.status)),
        voiceFirst() ? h('div', { class: 'mt8' }, h('button', { class: 'link muted', onclick: () => { R.forceText = true; stopListening(true); ta.parentElement.style.display = ''; R.submitBtn.style.display = ''; ta.focus(); } }, '改用打字')) : null);
      R.status.textContent = '按麥克風，用英文說出來。';
    } else if (settings().input_mode !== 'text' && !Sp.sttSupported) {
      micZone = h('div', { class: 'tiny' }, '這個瀏覽器不支援語音辨識，已改用打字。（Chrome / Edge 可以用說的）');
    }
    const taWrap = h('div', null, ta);
    if (voiceFirst() && micZone) { taWrap.style.display = 'none'; R.submitBtn.style.display = 'none'; }
    UI.add(inputZone, micZone, taWrap);

    // 瞬間提取：倒數條
    let timer = null;
    if (isFast) {
      const fill = h('i');
      timer = h('div', { class: 'timer-wrap' }, h('div', { class: 'timer' }, fill),
        h('div', { class: 'timer-note' }, h('span', { id: 'timer-label' }, (item.limit / 1000) + ' 秒內開始作答'), h('span', null, '重點是「開始」，不是講完')));
      R.timerBox = timer.firstChild;
      fill.style.transition = 'transform ' + item.limit + 'ms linear';
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.transform = 'scaleX(0)'; }));
      later(() => { if (R && R.phase === 'ask' && R.tFirst == null) { R.timerBox.classList.add('late'); const l = timer.querySelector('#timer-label'); if (l) l.textContent = '慢了一點，沒關係，把整句寫完'; } }, item.limit);
    }

    const blankSkel = item.type === 'CLOZE' ? h('div', { class: 'skeleton' }, E.blankSkeleton(pat.mother)) : null;
    UI.add(body, 
      lab ? chip(lab, cls) : null,
      h('div', { class: 'prompt' + (prompt.length < 22 ? ' lg' : '') }, prompt),
      isFree ? h('div', null, h('button', { class: 'link', onclick: (e) => { e.currentTarget.replaceWith(h('div', { class: 'card flat soft small' }, h('div', { class: 'tiny', style: { marginBottom: '4px' } }, '範例（別照抄，換成你自己的內容）'), (pat.free.examples || []).map((x) => h('div', { class: 'en', style: { fontSize: '18px', padding: '2px 0' } }, x)))); } }, '看範例')) : null,
      timer, blankSkel, R.skelSlot, inputZone, extraLinks, h('div', { id: 'fb-slot' }));
    foot.append(R.submitBtn);
    R.tShow = performance.now();
    if (!voiceFirst()) later(() => ta.focus(), 60);
    else if (!isFree) later(() => toggleListen(item, 'answer'), 120);
  }
  function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 220) + 'px'; }

  function useHint(item) {
    if (R.hint || R.phase !== 'ask') return;
    R.hint = true;
    if (R.hintBtn) { R.hintBtn.disabled = true; R.hintBtn.textContent = '已使用提示（熟練度會少算一點）'; R.hintBtn.classList.add('muted'); }
    if (item.type === 'CLOZE' && item.level !== 'C') {
      R.blanks.forEach((b) => { b.placeholder = (b.dataset.answer || '')[0] + '…'; });
    } else {
      R.skelSlot.textContent = E.hintSkeleton(targetOf(item), true);
    }
  }

  function skipFree(item) {
    Sess.skipFree(App().state, item, U.now());
    App().save();
    renderItem();
  }

  /* ------------------------------------------------------------------ 語音 */
  function toggleListen(item, mode) {
    if (R.listening) { stopListening(false); return; }
    startListening(item, mode);
  }
  function setMic(on) {
    R.listening = on;
    if (R.micBtn) R.micBtn.classList.toggle('on', on);
  }
  function startListening(item, mode) {
    if (!Sp.sttSupported) { UI.toast(Sp.errorText('not-supported')); return; }
    if (R.phase !== 'ask') return;
    setMic(true);
    if (R.transcriptEl) R.transcriptEl.textContent = '';
    if (R.status) R.status.textContent = '請說…';
    R.ctl = Sp.listen({
      onSpeechStart: (t) => { if (R.tFirst == null) R.tFirst = t; },
      onInterim: (txt) => { if (R.transcriptEl) R.transcriptEl.textContent = txt; },
      onFinal: (alts) => handleVoiceFinal(item, mode, alts),
      onError: (code) => {
        setMic(false);
        const msg = Sp.errorText(code);
        if (R && R.status) R.status.textContent = msg || '';
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') { if (R) R.forceText = true; if (R && R.ta) { R.ta.parentElement.style.display = ''; if (R.submitBtn) R.submitBtn.style.display = ''; } }
      },
      onEnd: () => { if (R) setMic(false); }
    });
  }
  function stopListening(abort) {
    if (R && R.ctl) { try { abort ? R.ctl.abort() : R.ctl.stop(); } catch (e) { /* ignore */ } R.ctl = null; }
    if (R) setMic(false);
  }
  function handleVoiceFinal(item, mode, alts) {
    if (!R || R.phase !== 'ask') return;
    setMic(false);
    if (!alts.length) return;
    if (mode === 'listen') {
      // 跟讀：不批改對錯，只看大致像不像
      const r = Sess.grade(App().state, App().content, item, { answer: alts[0].text, inputType: 'voice', confidence: alts[0].confidence });
      if (R.transcriptEl) R.transcriptEl.textContent = '「' + alts[0].text + '」';
      if (R.status) R.status.textContent = r.status === 'correct' ? '很好！聽起來就是這句。' : '大致有聽到。可以再試一次，或直接繼續。';
      return;
    }
    // 在辨識出的幾個候選裡，挑「最接近目標」的那個（候選都是語音辨識本身的猜測）
    const rank = { correct: 0, acceptable: 1, partial: 2, stt_uncertain: 3, incorrect: 4 };
    let best = null;
    alts.forEach((a) => {
      const r = Sess.grade(App().state, App().content, item, { answer: a.text, inputType: 'voice', confidence: a.confidence, fills: null });
      const key = [rank[r.status] == null ? 5 : rank[r.status], r.dist || 0];
      if (!best || key[0] < best.key[0] || (key[0] === best.key[0] && key[1] < best.key[1])) best = { a, r, key };
    });
    if (R.transcriptEl) R.transcriptEl.textContent = '「' + best.a.text + '」';
    if (R.ta) { R.ta.value = best.a.text; autoGrow(R.ta); }
    submit(item, { answer: best.a.text, inputType: 'voice', confidence: best.a.confidence });
  }

  /* ------------------------------------------------------------------ 送出 → 批改 → 回饋 */
  function submitText(item) {
    if (R.phase !== 'ask' || !R.ta) return;
    const text = R.ta.value;
    if (!text.trim()) return;
    submit(item, { answer: text, inputType: 'text' });
  }

  function submit(item, payload) {
    if (R.phase !== 'ask') return;
    stopListening(true);
    const now = performance.now();
    payload.hint = R.hint;
    payload.reaction_ms = R.tFirst != null && R.tShow != null ? Math.max(0, R.tFirst - R.tShow) : null;
    payload.completion_ms = R.tShow != null ? now - R.tShow : null;
    const result = Sess.grade(App().state, App().content, item, payload);
    R.result = result; R.payload = payload;
    if (item.type === 'PROBE') {          // 檢測：不給即時回饋
      proceedWith(result);
      return;
    }
    R.phase = 'feedback';
    renderFeedback(item, result);
  }

  function enSentence(words, marks, cls) { return h('div', { class: 'en-line' }, UI.markWords(words, marks, cls)); }

  function renderFeedback(item, result) {
    const state = App().state;
    const retry = Sess.willRetry(state, item, result);
    const slot = body.querySelector('#fb-slot') || body;
    UI.clear(slot);
    if (R.ta) R.ta.readOnly = true;
    R.blanks.forEach((b, i) => { b.readOnly = true; if (result.blankOk) b.classList.add(result.blankOk[i] ? 'ok' : 'no'); });
    if (R.submitBtn) R.submitBtn.style.display = 'none';
    body.querySelectorAll('.link').forEach((l) => { l.style.display = 'none'; });
    body.querySelectorAll('.input-zone, .timer-wrap').forEach((z) => { z.style.display = 'none'; });
    UI.clear(foot);

    const target = result.target || targetOf(item);
    const ok = S.isOk(result.status);
    let card;
    if (item.type === 'FREE_PRODUCTION') card = freeFeedback(item, result);
    else if (result.status === 'stt_uncertain') card = sttFeedback(item, result);
    else if (result.status === 'correct') {
      card = h('div', { class: 'fb ok' },
        h('div', { class: 'head' }, h('span', { class: 'big-check' }, UI.icon('check')), '答對了'),
        h('div', { class: 'ans', style: { borderTop: 0, paddingTop: 0, marginTop: '10px' } }, h('div', { class: 'en-line' }, target)),
        h('div', { class: 'meta' },
          settings().show_latency && result.reaction_ms != null && item.type !== 'CLOZE' ? h('span', null, '反應：' + UI.fmtSec(result.reaction_ms) + (item.limit ? '（限 ' + item.limit / 1000 + ' 秒）' : '')) : null,
          result.hint ? h('span', null, '有用提示') : null),
        h('div', { class: 'fb-actions' }, h('button', { class: 'icon-btn accent', 'aria-label': '播放', onclick: () => speak(target, false) }, UI.icon('volume'))));
    } else if (result.status === 'acceptable') {
      card = h('div', { class: 'fb ok' },
        h('div', { class: 'head' }, h('span', { class: 'big-check' }, UI.icon('check')), '也可以！'),
        h('div', { class: 'you' }, '你的說法：', enSentence(result.answer.split(/\s+/), [], 'mk')),
        h('div', { class: 'ans' }, h('div', { class: 'lab' }, '更常見的說法'), h('div', { class: 'en-line' }, target)),
        h('div', { class: 'meta' }, settings().show_latency && result.reaction_ms != null ? h('span', null, '反應：' + UI.fmtSec(result.reaction_ms)) : null),
        h('div', { class: 'fb-actions' }, h('button', { class: 'icon-btn accent', 'aria-label': '播放', onclick: () => speak(target, false) }, UI.icon('volume'))));
    } else if (item.type === 'CLOZE' && item.level !== 'C' && result.blankOk) {
      card = clozeFeedback(item, result, target);
    } else {
      const near = result.status === 'partial';
      const showTargetMarks = result.closest === target;
      const notes = (result.notes || []).filter((n) => n.text).slice(0, 2);
      const empty = !result.answer || !result.answer.trim();
      const canOverride = !empty && item.type !== 'LISTEN_REPEAT';
      const variation = !!result.variation && !empty;
      card = h('div', { class: 'fb ' + (near ? 'near' : 'miss') },
        h('div', { class: 'head' }, empty ? '沒關係，先看一次答案。' : variation ? '和收錄的說法不同。' : near ? '差一點。' : '再看一次。'),
        !empty ? h('div', { class: 'you' }, '你說：', enSentence(result.userWords && result.userWords.length ? result.userWords : result.answer.split(/\s+/), result.marks ? result.marks.user : [], 'mk')) : null,
        notes.map((n) => h('div', { class: 'why' }, n.text)),
        variation ? h('div', { class: 'why' }, '這可能只是另一種說法。系統不懂中文，只會比對事先收錄的答案，沒收錄的說法會先當作「差一點」。') : null,
        h('div', { class: 'ans' }, h('div', { class: 'lab' }, variation ? '收錄的句子' : '正確句子'),
          enSentence(showTargetMarks && result.targetWords ? result.targetWords : E.displayWords(target), showTargetMarks && result.marks ? result.marks.target : [], 'mk-t')),
        h('div', { class: 'fb-actions' },
          h('button', { class: 'btn secondary sm', onclick: () => speak(target, false) }, UI.icon('volume'), '再聽一次'),
          canOverride && variation ? h('button', { class: 'btn secondary sm', onclick: () => askOverride(item) }, '我這樣寫也對') : null,
          canOverride && !variation ? h('button', { class: 'link muted', onclick: () => askOverride(item) }, '我覺得我的答案也可以') : null));
    }
    slot.append(card);
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if ((result.status === 'correct' || result.status === 'acceptable') && settings().auto_speak !== false) later(() => speak(target, false), 250);

    const label = result.status === 'stt_uncertain' ? '再說一次' : retry ? '再試一次' : '繼續';
    const nextBtn = h('button', { class: 'btn', onclick: () => proceed() }, label);
    foot.append(nextBtn);
    if (result.status === 'stt_uncertain') foot.append(h('button', { class: 'btn secondary mt8', onclick: () => { R.forceText = true; proceedTypeInstead(item); } }, '改用打字'));
    later(() => doc.addEventListener('keydown', onKeyContinue), 120);
  }

  /* 填空答錯：指出「第幾格」錯了；如果有文法規則可說明（例如 wish 後面要用過去式）就優先說那個 */
  function clozeFeedback(item, result, target) {
    const pat = patOf(item);
    const idx = Sess.clozeIndexes(pat, item.level);
    const fills = (R.payload && R.payload.fills) || [];
    const words = E.displayWords(pat.mother);
    const wrongK = result.blankOk.map((ok, k) => (ok ? -1 : k)).filter((k) => k >= 0);
    const ruleNote = (result.notes || []).find((n) => n.rule && n.tag !== 'PATTERN_NOT_USED' && n.text);
    const lines = [];
    if (ruleNote) lines.push(h('div', { class: 'why' }, ruleNote.text));
    wrongK.slice(0, 3).forEach((k) => lines.push(h('div', { class: 'why' }, '第 ' + (k + 1) + ' 格：你填「' + (fills[k] || '') + '」，這裡是「' + E.blankAnswer(words[idx[k]]) + '」')));
    return h('div', { class: 'fb near' },
      h('div', { class: 'head' }, '差一點。'),
      lines,
      h('div', { class: 'ans' }, h('div', { class: 'lab' }, '正確句子'), enSentence(words, wrongK.map((k) => idx[k]), 'mk-t')),
      h('div', { class: 'fb-actions' },
        h('button', { class: 'btn secondary sm', onclick: () => speak(target, false) }, UI.icon('volume'), '再聽一次')));
  }

  function sttFeedback(item, result) {
    return h('div', { class: 'fb info' },
      h('div', { class: 'head', style: { color: 'var(--ink)' } }, UI.icon('mic'), '我沒有聽得很清楚'),
      result.answer ? h('div', { class: 'you' }, '我聽到：', h('div', { class: 'en-line' }, '「' + result.answer + '」')) : null,
      h('div', { class: 'why' }, '這一題不會被扣分。可以再說一次，或改用打字。'));
  }

  function freeFeedback(item, result) {
    const pat = patOf(item);
    const ok = result.status === 'correct';
    const notes = (result.notes || []).filter((n) => n.text).slice(0, 2);
    const words = result.userWords && result.userWords.length ? result.userWords : (result.answer || '').split(/\s+/);
    let head, lines = [];
    if (ok) { head = h('div', { class: 'head' }, h('span', { class: 'big-check' }, UI.icon('check')), '用到了這個句型'); lines.push(h('div', { class: 'why' }, '沒有發現明顯的錯誤。語意通不通順，請你自己再讀一次——這句話有說出你真正想說的嗎？')); }
    else if (result.status === 'partial' && !notes.length && result.novel === false) { head = h('div', { class: 'head' }, '這是背過的句子'); lines.push(h('div', { class: 'why' }, '換成你自己的內容再說一次，才算真正會用。')); }
    else { head = h('div', { class: 'head' }, result.status === 'partial' ? '很接近了。' : '再試試看。'); notes.forEach((n) => lines.push(h('div', { class: 'why' }, n.text))); }
    return h('div', { class: 'fb ' + (ok ? 'ok' : result.status === 'partial' ? 'near' : 'miss') },
      head,
      h('div', { class: 'you' }, '你的句子：', enSentence(words, result.marks ? result.marks.user : [], 'mk')),
      lines,
      !ok && (pat.free.examples || []).length ? h('div', { class: 'ans' }, h('div', { class: 'lab' }, '參考範例'), h('div', { class: 'en-line' }, pat.free.examples[0])) : null);
  }

  function proceedTypeInstead(item) {
    // 語音沒聽清楚 → 改成打字：回到作答狀態，保留同一題
    R.phase = 'ask'; R.result = null; R.sttTries++;
    const slot = body.querySelector('#fb-slot'); if (slot) UI.clear(slot);
    UI.clear(foot);
    doc.removeEventListener('keydown', onKeyContinue);
    if (R.ta) { R.ta.readOnly = false; R.ta.parentElement.style.display = ''; R.ta.focus(); }
    if (R.submitBtn) { R.submitBtn.style.display = ''; R.submitBtn.disabled = !(R.ta && R.ta.value.trim()); foot.append(R.submitBtn); }
    body.querySelectorAll('.link').forEach((l) => { l.style.display = ''; });
    body.querySelectorAll('.input-zone').forEach((z) => { z.style.display = ''; });
  }

  function askOverride(item) {
    const result = R.result;
    const strong = (result.notes || []).some((n) => n.rule);
    UI.sheet({
      title: '把這個說法加進「也可以」？',
      body: h('div', null,
        h('p', { class: 'en', style: { fontSize: '20px', margin: '8px 0' } }, '「' + result.answer + '」'),
        h('p', { class: 'muted small' }, (strong ? '系統看到這裡可能有文法問題（' + (result.notes[0].text || '') + '）。' : '這個說法系統沒收錄，所以先當作「差一點」。') + '如果你確定它是自然、意思也對的英文，加進去之後，這題這樣答就算對。')),
      actions: [
        { label: '加進去，算我對', onClick: () => {
          const r2 = Sess.addOverride(App().state, App().content, item, result);
          if (r2) { R.result = r2; App().save(); renderFeedback(item, r2); UI.toast('已加入，之後同題這樣答也算對'); }
        } },
        { label: '不用了', kind: 'secondary' }
      ]
    });
  }

  /* ------------------------------------------------------------------ 前進 */
  function onKeyContinue(e) {
    if (e.key === 'Enter' && !e.shiftKey && !doc.querySelector('.overlay')) { e.preventDefault(); proceed(); }
  }

  function commitOnly() {
    if (!R || R.committed || !R.result) return null;
    R.committed = true;
    const out = Sess.commit(App().state, App().content, R.item, R.result, U.now());
    return out;
  }

  function proceed() {
    if (!R || R.phase !== 'feedback') return;
    doc.removeEventListener('keydown', onKeyContinue);
    if (R.result && R.result.status === 'stt_uncertain') {
      // 語音沒聽清楚：記一筆（不計分），然後讓使用者再說一次
      commitOnly();
      App().save();
      const item = R.item;
      const tries = R.sttTries + 1;
      const keepTyped = R.forceText;
      R.committed = false; R.phase = 'ask'; R.result = null; R.sttTries = tries; R.tFirst = null; R.tShow = performance.now();
      const slot = body.querySelector('#fb-slot'); if (slot) UI.clear(slot);
      UI.clear(foot);
      if (R.submitBtn) { R.submitBtn.style.display = ''; R.submitBtn.disabled = true; foot.append(R.submitBtn); }
      if (R.ta) { R.ta.readOnly = false; R.ta.value = ''; }
      if (R.transcriptEl) R.transcriptEl.textContent = '';
      if (R.status) R.status.textContent = '請再說一次…';
      body.querySelectorAll('.link').forEach((l) => { l.style.display = ''; });
      body.querySelectorAll('.input-zone').forEach((z) => { z.style.display = ''; });
      if (tries >= 2 && R.ta) { R.ta.parentElement.style.display = ''; }
      if (R.micBtn && !keepTyped) later(() => startListening(item, 'answer'), 200);
      return;
    }
    proceedWith(R.result);
  }

  function proceedWith(result) {
    if (!R) return;
    const item = R.item;
    if (!R.committed) { R.result = result; }
    const out = R.committed ? { advance: true, retry: false, events: [] } : Sess.commit(App().state, App().content, item, result, U.now());
    R.committed = true;
    App().save();
    if (out.events && out.events.some((e) => e.indexOf('lesson-done') === 0)) App().flags.lessonJustDone = item.pid;
    if (out.events && out.events.some((e) => e.indexOf('resolved:') === 0)) App().flags.resolved = (App().flags.resolved || []).concat(out.events.filter((e) => e.indexOf('resolved:') === 0));
    renderItem();
  }

  function finishNow() {
    clearTimers(); stopListening(true);
    const summary = Sess.finish(App().state, App().content, U.now());
    App().save();
    App().lastSummary = summary;
    App().go(summary && summary.kind === 'probe' ? '#/probe-result' : '#/summary');
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
