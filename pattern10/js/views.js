/* Pattern 10 — 主要畫面：今天 / 學習 / Patterns / 進度 / 設定 / 首次使用 / 結算 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const U = P10.util, E = P10.engine, S = P10.srs, Sess = P10.session, Sp = P10.speech, UI = P10.ui, Store = P10.store, St = P10.stats;
  const h = UI.h;
  const Views = (P10.views = {});
  const A = () => P10.app;
  const doc = g.document;

  const WEEK = '日一二三四五六';
  const dateText = (ts) => { const d = new Date(ts); return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日　週' + WEEK[d.getDay()]; };
  const labelOf = (pid) => { const p = A().content.patternById[pid]; return p ? p.label : pid; };
  const progOf = (pid) => S.getProgress(A().state, pid);
  const chip = (t, cls) => h('span', { class: 'chip ' + (cls || '') }, t);
  const pageTitle = (t, sub) => h('div', { style: { margin: '4px 4px 18px' } }, h('h1', { class: 'h-page' }, t), sub ? h('p', { class: 'muted mt4' }, sub) : null);

  /* 把句型依「章」分組：內建句型各屬於一章；自己加的句型放最後一組 */
  function chapterGroups(content) {
    const groups = [];
    (P10.chapters || []).forEach((c) => {
      const ps = content.patterns.filter((p) => p.chapter === c.id);
      if (ps.length) groups.push({ id: c.id, title: '第 ' + c.id + ' 章　' + c.title, blurb: c.blurb, patterns: ps });
    });
    const rest = content.patterns.filter((p) => !p.chapter);
    if (rest.length) groups.push({ id: 0, title: '我自己加的句型', blurb: '', patterns: rest });
    return groups;
  }
  const numOf = (p) => String(p.id).replace(/^P/, '');
  const chapHead = (gr) => {
    const learnedN = gr.patterns.filter((p) => progOf(p.id).lesson_done).length;
    return [h('div', { class: 'chap-head' }, h('h2', { class: 'h-sec' }, gr.title), h('span', { class: 'tiny' }, learnedN + ' / ' + gr.patterns.length + ' 學過')),
      gr.blurb ? h('p', { class: 'tiny chap-blurb' }, gr.blurb) : null];
  };

  function startSession(opts) {
    const a = A();
    Sess.start(a.state, a.content, U.now(), opts || {});
    a.save();
    a.go('#/session');
  }
  Views.startSession = startSession;

  /* 匯出備份，並記下時間（用來決定要不要提醒你備份） */
  Views.exportBackup = function () {
    const a = A();
    UI.download('pattern10-backup-' + U.dayKey(U.now()) + '.json', Store.exportAll(a.state));
    a.state.last_backup_at = U.now();
    a.save();
  };
  function backupReminder() {
    const a = A(), s = a.state, now = U.now();
    if (P10.env.trial || s.attempts.length < 40) return null;
    if (now - (s.last_backup_at || s.created_at) < 14 * U.DAY) return null;
    if (s.backup_snooze_until && now < s.backup_snooze_until) return null;
    return h('div', { class: 'banner', id: 'backup-reminder' },
      h('b', null, '進度只存在這台裝置。'), '你已經練了一陣子，要不要先備份一份？',
      h('div', { class: 'btn-row mt8' },
        h('button', { class: 'btn sm', onclick: () => { Views.exportBackup(); a.render(); } }, '匯出備份'),
        h('button', { class: 'btn sm secondary', onclick: () => { s.backup_snooze_until = U.now() + 7 * U.DAY; a.save(); a.render(); } }, '之後再說')));
  }
  /* iPhone／iPad 的 Safari 會在 7 天沒開之後清掉網頁資料，除非加入主畫面 */
  function iosTip() {
    const n = g.navigator || {};
    const ios = /iP(hone|ad|od)/.test(n.userAgent || '') || (n.platform === 'MacIntel' && n.maxTouchPoints > 1);
    const standalone = n.standalone === true || (g.matchMedia && g.matchMedia('(display-mode: standalone)').matches);
    return ios && !standalone ? 'iPhone／iPad：Safari 可能在 7 天沒開之後清掉網頁資料。請按分享鈕 →「加入主畫面」，之後用主畫面的圖示開，進度才會留住。' : null;
  }

  function fileBanner() {
    if (P10.env.trial) return h('div', { class: 'banner' }, h('b', null, '這是試玩版（私人連結）。'), '語音辨識、下載備份、離線與安裝在這裡都不能用，進度只存在這個瀏覽器。正式使用請用電腦桌面的「Pattern10 暗誦英文」捷徑。');
    if (!Sp.isFile) return null;
    return h('div', { class: 'banner' }, h('b', null, '目前是直接開啟檔案。'), '語音辨識和「安裝到手機」在這種方式下不能用，進度也會和「開始練習.bat」開的版本分開存。建議之後都用「開始練習.bat」。');
  }

  /* ================================================================== 今天 */
  Views.today = function () {
    const a = A(), state = a.state, content = a.content, now = U.now();
    Sess.ensureDaily(state, now);
    S.refreshUnlocks(state, content.patterns);
    const root = h('div', { class: 'stack' });
    UI.add(root, h('div', { style: { margin: '2px 4px 4px' } }, h('div', { class: 'eyebrow' }, dateText(now)), h('h1', { class: 'h-greet mt4' }, U.greeting(now))));
    if (a.warning) UI.add(root, h('div', { class: 'banner' }, a.warning));
    const fb = fileBanner(); if (fb) UI.add(root, fb);
    const br = backupReminder(); if (br) UI.add(root, br);

    const sess = state.session;
    if (sess) {
      const isProbe = sess.kind === 'probe';
      UI.add(root, h('div', { class: 'card today-hero' },
        h('div', { class: 'eyebrow' }, isProbe ? '進行中的能力檢測' : '還沒練完'),
        h('div', { class: 'today-n' }, h('b', null, Math.max(sess.queue.length - sess.idx, 0)), h('span', null, '題剩下')),
        h('p', { class: 'muted mt8' }, '上次練到一半，進度都存著。'),
        h('div', { class: 'btn-row mt16' },
          h('button', { class: 'btn', onclick: () => a.go('#/session') }, '繼續'),
          h('button', { class: 'btn secondary', onclick: () => UI.confirm('放棄這次訓練？', isProbe ? '檢測結果不會被記錄。' : '已經作答的題目會保留，沒練完的部分就不做了。', '放棄', () => { if (!isProbe && sess.results.length) { Sess.finish(state, content, now); } else Sess.abandon(state); a.save(); a.go('#/today'); }, 'danger') }, '放棄'))));
    } else {
      const est = Sess.estimate(state, content, now);
      const doneToday = state.daily.sessions > 0;
      const chips = [];
      if (est.lessonPid) chips.push(chip('新句型：' + labelOf(est.lessonPid), 'accent'));
      if (est.parts.due) chips.push(chip('到期複習 ' + est.parts.due));
      if (est.parts.repair) chips.push(chip('弱點修復 ' + est.parts.repair, 'amber'));
      if (est.parts.transfer) chips.push(chip('變形 ' + est.parts.transfer));
      if (est.parts.free) chips.push(chip('自由造句 ' + est.parts.free));
      if (doneToday) {
        const last = state.sessions[state.sessions.length - 1];
        UI.add(root, h('div', { class: 'card today-hero' },
          h('div', { class: 'row-flex' }, chip('✓ 今天的訓練完成了', 'good')),
          h('p', { class: 'mt12', style: { fontSize: '19px' } }, last && last.tomorrow ? '明天約 ' + last.tomorrow.minutes + ' 分鐘。' : '明天見。'),
          h('p', { class: 'muted small mt4' }, '每天固定練一點，比一次練很久有效。想多練也可以：'),
          h('button', { class: 'btn secondary mt16', onclick: () => startSession({ kind: 'extra' }) }, '再練一輪（約 ' + est.minutes + ' 分鐘）')));
      } else {
        UI.add(root, h('div', { class: 'card today-hero' },
          h('div', { class: 'eyebrow' }, '今天'),
          h('div', { class: 'today-n' }, h('b', null, est.n), h('span', null, '題')),
          h('p', { class: 'muted mt4' }, '約 ' + est.minutes + ' 分鐘'),
          chips.length ? h('div', { class: 'parts' }, chips) : null,
          h('button', { class: 'btn mt16', onclick: () => startSession({}) }, '開始今日訓練')));
      }
    }

    // 目前進度
    const learned = content.patterns.filter((p) => progOf(p.id).lesson_done).length;
    const weak = St.weakest(state, content), imp = St.mostImproved(state, content, now);
    const dots = h('div', { style: { display: 'flex', gap: '5px', margin: '10px 0 4px' } }, content.patterns.map((p) => {
      const pr = progOf(p.id); const lv = S.effective(pr);
      const col = !pr.unlocked ? 'var(--line)' : !pr.lesson_done ? 'var(--line-2)' : lv >= 75 ? 'var(--good)' : lv >= 60 ? 'var(--accent)' : 'var(--amber)';
      return h('i', { title: p.label, style: { flex: 1, height: '7px', borderRadius: '4px', background: col } });
    }));
    UI.add(root, h('h2', { class: 'h-sec' }, '目前進度'),
      h('div', { class: 'card' },
        h('div', { class: 'kv' }, h('span', { class: 'k' }, '已學會入門的句型'), h('span', { class: 'v' }, learned + ' / ' + content.patterns.length)),
        dots,
        weak && learned >= 2 ? h('div', { class: 'kv' }, h('span', { class: 'k' }, '最弱'), h('span', { class: 'v en' }, labelOf(weak.pid))) : null,
        imp ? h('div', { class: 'kv' }, h('span', { class: 'k' }, '最近進步'), h('span', { class: 'v en' }, labelOf(imp.pid))) : null,
        !weak && !imp ? h('p', { class: 'muted small mt8' }, '練幾天之後，這裡會告訴你哪個句型最弱、哪個進步最多。') : null));
    return root;
  };

  /* ================================================================== 學習 */
  function stageDots(p) {
    const n = p.lesson_done ? 6 : p.stage;
    const items = [];
    for (let i = 1; i <= 7; i++) items.push(h('i', { class: (i <= n || (i === 7 && p.free_done > 0)) ? 'on' : '' }));
    return h('div', { class: 'stages', title: '七個階段：理解→跟讀→暗記→暗誦→瞬間提取→變形→自由造句' }, items);
  }

  Views.learn = function () {
    const a = A(), state = a.state, content = a.content, now = U.now();
    S.refreshUnlocks(state, content.patterns);
    const root = h('div');
    UI.add(root, pageTitle('學習', '一次只學一個句型。學會它，再讓它長出變化。'));
    const pats = content.patterns;
    const inProgress = pats.find((p) => { const q = progOf(p.id); return q.unlocked && !q.lesson_done && q.stage > 0; });
    const nextNew = pats.find((p) => { const q = progOf(p.id); return q.unlocked && !q.lesson_done; });
    const cur = inProgress || nextNew;
    if (cur) {
      const q = progOf(cur.id);
      UI.add(root, h('div', { class: 'card' },
        chip(inProgress ? '進行到一半' : '下一個句型', 'accent'),
        h('div', { class: 'sentence md mt12' }, cur.mother),
        h('div', { class: 'zh-line' }, cur.zh),
        stageDots(q),
        h('p', { class: 'tiny mt8' }, '約 5 分鐘：理解 → 跟讀 → 暗記 → 暗誦 → 瞬間提取 → 變形'),
        h('button', { class: 'btn mt16', onclick: () => startSession({ lessonPid: cur.id }) }, inProgress ? '繼續學這個句型' : '開始學這個句型'),
        !inProgress ? h('p', { class: 'tiny mt8' }, '每天的「今日訓練」會自動排一個新句型；想多學也可以現在開始。') : null));
    } else if (pats.every((p) => progOf(p.id).lesson_done)) {
      UI.add(root, h('div', { class: 'card' }, chip('✓ ' + pats.length + ' 個句型都學過了', 'good'), h('p', { class: 'mt12' }, '接下來就是每天的複習和變形，讓它們變成反射。')));
    } else {
      const lockedFirst = pats.find((p) => !progOf(p.id).unlocked);
      UI.add(root, h('div', { class: 'card' }, chip('先把手上的句型練穩', 'amber'), h('p', { class: 'mt12' }, '同時學太多會互相干擾。把「學習中」的句型練到能暗誦，下一個' + (lockedFirst ? '（' + lockedFirst.label + '）' : '') + '就會自動解鎖。')));
    }

    const learned = pats.filter((p) => progOf(p.id).lesson_done);
    if (learned.length) {
      UI.add(root, h('h2', { class: 'h-sec' }, '學過的句型'),
        h('div', { class: 'list' }, learned.map((p) => {
          const q = progOf(p.id);
          return h('a', { class: 'row', href: '#/patterns/' + p.id },
            h('div', { class: 'grow' }, h('div', { class: 't' }, p.label), UI.masteryBar(q), h('div', { class: 's' }, nextReviewText(q, now))),
            UI.icon('chevron'));
        })));
    }
    const locked = pats.filter((p) => !progOf(p.id).unlocked);
    if (locked.length) {
      const show = locked.slice(0, 3);
      UI.add(root, h('h2', { class: 'h-sec' }, '尚未解鎖'),
        h('div', { class: 'list' }, show.map((p) => h('a', { class: 'row locked', href: '#/patterns/' + p.id }, h('span', { class: 'num' }, numOf(p)), h('div', { class: 'grow' }, h('div', { class: 't' }, p.label), h('div', { class: 's' }, '前一個句型練到「能暗誦」就會解鎖')), UI.icon('lock')))),
        h('p', { class: 'tiny mt8', style: { margin: '8px 4px 0' } }, (locked.length > show.length ? '後面還有 ' + (locked.length - show.length) + ' 個句型，依序解鎖。' : '') + '想先學哪一個，到「Patterns」點進去，可以提早解鎖。'));
    }
    return root;
  };

  function nextReviewText(p, now) {
    if (!p.lesson_done) return p.unlocked ? '還沒開始學' : '尚未解鎖';
    if (p.next_review_at == null) return '';
    if (p.next_review_at <= now) return '今天要複習';
    return '下次複習：' + U.relDay(p.next_review_at, now);
  }

  /* ================================================================== Patterns */
  Views.patterns = function () {
    const a = A(), content = a.content;
    const root = h('div');
    const groups = chapterGroups(content);
    UI.add(root, pageTitle('Patterns', content.patterns.length + ' 個句型' + (groups.length > 1 ? '，分成 ' + groups.length + ' 組' : '') + '。點進去看母句、解釋和你的狀況。'));
    groups.forEach((gr) => {
      UI.add(root, chapHead(gr));
      UI.add(root, h('div', { class: 'list' }, gr.patterns.map((p) => {
        const q = progOf(p.id);
        const body = h('div', { class: 'grow' },
          h('div', { class: 't' }, p.label),
          q.unlocked ? UI.masteryBar(q) : h('div', { class: 's' }, '尚未解鎖'));
        return h('a', { class: 'row' + (q.unlocked ? '' : ' locked'), href: '#/patterns/' + p.id }, h('span', { class: 'num' }, numOf(p)), body, q.unlocked ? UI.icon('chevron') : UI.icon('lock'));
      })));
    });
    return root;
  };

  Views.patternDetail = function (pid) {
    const a = A(), state = a.state, content = a.content, now = U.now();
    const pat = content.patternById[pid];
    if (!pat) { a.go('#/patterns'); return h('div'); }
    const q = progOf(pid);
    const bucket = content.byPattern[pid];
    const errs = Object.values(state.errors).filter((e) => e.pid === pid);
    const unseenOk = q.transfer_unseen_ok.length;
    const root = h('div', { class: 'stack' });
    UI.add(root, h('a', { class: 'link', href: '#/patterns', style: { display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: '-6px' } }, UI.icon('back'), 'Patterns'));
    UI.add(root, h('div', { class: 'card' },
      chip(pat.id + ' · ' + pat.title, 'accent'),
      h('div', { class: 'sentence mt12' }, pat.mother),
      h('div', { class: 'zh-line' }, pat.zh),
      h('div', { class: 'template' }, pat.template),
      h('div', { class: 'row-flex mt16' },
        h('button', { class: 'icon-btn accent', 'aria-label': '播放', onclick: () => Sp.speak(pat.mother, { rate: state.settings.rate_normal, voiceURI: state.settings.voice_uri }) }, UI.icon('volume')),
        h('button', { class: 'btn secondary sm', onclick: () => Sp.speak(pat.mother, { rate: state.settings.rate_slow, voiceURI: state.settings.voice_uri }) }, '慢速'))));
    UI.add(root, h('div', { class: 'card soft flat' },
      h('div', { class: 'tiny', style: { fontWeight: 600, marginBottom: '6px' } }, '解釋'),
      h('p', { class: 'explain' }, pat.explain),
      (pat.contrast || []).length ? h('div', { class: 'contrast' }, pat.contrast.map((c) => [h('div', { class: 'ok' }, h('i', null, '✓'), c.ok), h('div', { class: 'ng' }, h('i', null, '✗'), c.ng)])) : null));

    if (q.unlocked) {
      const label = S.label(q);
      UI.add(root, h('div', { class: 'card' },
        h('div', { class: 'row-flex between' }, h('div', { class: 'tiny', style: { fontWeight: 600 } }, '你的狀況'), h('span', { class: 'lab ' + UI.labelClass(label), style: { fontWeight: 700 } }, label)),
        UI.masteryBar(q),
        h('div', { class: 'subbars' }, S.SUBS.map((k) => [h('span', null, S.SUB_LABEL[k]), h('div', { class: 'bar' }, h('i', { style: { width: Math.round(q[k]) + '%' } })), h('span', { class: 'num' }, Math.round(q[k]))])),
        h('div', { class: 'mt16' },
          h('div', { class: 'kv' }, h('span', { class: 'k' }, '下次複習'), h('span', { class: 'v' }, nextReviewText(q, now))),
          h('div', { class: 'kv' }, h('span', { class: 'k' }, '已完成的變形'), h('span', { class: 'v' }, unseenOk + ' / ' + bucket.train.length + ' 題（沒看過就答對）')),
          h('div', { class: 'kv' }, h('span', { class: 'k' }, '畢業條件'), h('span', { class: 'v small', style: { fontWeight: 500 } }, graduateText(q))))));
      if (errs.length) {
        UI.add(root, h('div', { class: 'card' }, h('div', { class: 'tiny', style: { fontWeight: 600, marginBottom: '6px' } }, '最近的錯誤'),
          errs.sort((x, y) => (y.last_failed_at || 0) - (x.last_failed_at || 0)).slice(0, 5).map((e) => h('div', { class: 'kv' },
            h('span', { class: 'k' }, UI.tagZh(e.tag)),
            h('span', { class: 'v small' }, e.resolved ? chip('已修復', 'good') : chip('修復 ' + e.success_sessions.length + ' / 2', 'amber'))))));
      }
      UI.add(root, q.lesson_done
        ? h('button', { class: 'btn', onclick: () => startSession({ onlyPid: pid, size: 8 }) }, '只練這個句型（8 題）')
        : h('button', { class: 'btn', onclick: () => startSession({ lessonPid: pid }) }, q.stage > 0 ? '繼續學這個句型' : '開始學這個句型'));
    } else {
      UI.add(root, h('div', { class: 'card soft flat' },
        h('div', { class: 'row-flex' }, UI.icon('lock'), h('p', { class: 'muted' }, '把前一個句型練到「能暗誦」，這個就會解鎖。')),
        h('p', { class: 'tiny mt8' }, '想先學這個？可以提早解鎖。同時學太多句型會互相干擾，手上的建議先練穩。'),
        h('button', { class: 'btn secondary mt12', id: 'manual-unlock', onclick: () => { S.manualUnlock(state, pid); a.save(); UI.toast('已解鎖，可以開始學了'); a.render(); } }, '我想先學這個')));
    }
    return root;
  };

  function graduateText(q) {
    const parts = [
      [q.recall_ok >= 1, '母句暗誦'], [q.fast_ok >= 1, '瞬間提取'], [q.transfer_unseen_ok.length >= 5, '5 個新變形（' + Math.min(5, q.transfer_unseen_ok.length) + '/5）'],
      [q.max_success_interval >= 1, '隔日'], [q.max_success_interval >= 7, '隔 7 日']
    ];
    return parts.map(([ok, t]) => (ok ? '✓ ' : '· ') + t).join('　');
  }

  /* ================================================================== 進度 */
  function sparkline(series, w, hh) {
    if (!series || series.length < 2) return null;
    const pts = series.slice(-30);
    const max = Math.max.apply(null, pts), min = Math.min.apply(null, pts);
    const sx = (i) => (i / (pts.length - 1)) * (w - 8) + 4;
    const sy = (v) => hh - 6 - ((v - min) / Math.max(max - min, 1)) * (hh - 12);
    const d = pts.map((v, i) => (i ? 'L' : 'M') + sx(i).toFixed(1) + ' ' + sy(v).toFixed(1)).join(' ');
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + hh); svg.setAttribute('class', 'spark'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = '<path d="' + d + '" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
    return svg;
  }

  Views.progress = function () {
    const a = A(), state = a.state, content = a.content, now = U.now();
    const root = h('div', { class: 'stack' });
    UI.add(root, pageTitle('進度', '重點不是做了幾題，而是哪些句型已經變成反射。'));
    const tr = St.transferUnseen(state), rc = St.recall(state), rx = St.reaction(state), rt = St.retention(state), er = St.errors(state);
    const noData = state.attempts.length < 3;
    if (noData) UI.add(root, h('div', { class: 'card soft flat' }, h('p', { class: 'muted' }, '還沒有資料。完成第一次訓練之後，這裡會出現你的數字。')));

    const kpi = (cls, n, unit, label, hint) => h('div', { class: 'kpi ' + (cls || '') }, h('div', { class: 'kn' }, n == null ? '—' : n, n != null && unit ? h('small', null, unit) : null), h('div', { class: 'kl' }, label), hint ? h('div', { class: 'kh' }, hint) : null);
    UI.add(root, h('div', { class: 'kpi-grid' },
      kpi('wide', tr.pct, '%', '沒看過的新變形，一次就答對', tr.n ? '答對 ' + tr.ok + ' / ' + tr.n + ' 題。這是最重要的數字：如果只有母句背得很熟，這個 App 就只是背誦器。' : '練過變形題之後才會有數字。'),
      kpi('', rc.pct, '%', '母句暗誦正確率', rc.n ? rc.ok + ' / ' + rc.n + ' 次' : null),
      kpi('', rx.last != null ? (rx.last / 1000).toFixed(1) : null, '秒', '開始作答的反應時間', rx.first != null ? '一開始 ' + (rx.first / 1000).toFixed(1) + ' 秒 → 最近 ' + (rx.last / 1000).toFixed(1) + ' 秒' : '練幾次母句後才看得出趨勢'),
      kpi('', rt.d1.pct, '%', '隔天還答得出', rt.d1.n ? rt.d1.ok + ' / ' + rt.d1.n + ' 次' : '第一次到期複習後出現'),
      kpi('', rt.d7.pct, '%', '隔 7 天以上還答得出', rt.d7.n ? rt.d7.ok + ' / ' + rt.d7.n + ' 次' : '約一週後出現')));
    const sp = sparkline(rx.series, 300, 48);
    if (sp) UI.add(root, h('div', { class: 'card flat' }, h('div', { class: 'tiny', style: { fontWeight: 600 } }, '反應時間（答對的母句，由舊到新）'), sp, h('div', { class: 'tiny' }, '線往下走 = 越來越快開口')));

    // 句型熟練度
    UI.add(root, h('h2', { class: 'h-sec' }, '每個句型的熟練度'));
    chapterGroups(content).forEach((gr) => {
      if (chapterGroups(content).length > 1) UI.add(root, h('p', { class: 'tiny chap-sub' }, gr.title));
      UI.add(root, h('div', { class: 'list' }, gr.patterns.map((p) => {
        const q = progOf(p.id);
        return h('a', { class: 'row' + (q.unlocked ? '' : ' locked'), href: '#/patterns/' + p.id },
          h('div', { class: 'grow' }, h('div', { class: 't' }, p.label), q.unlocked ? UI.masteryBar(q) : h('div', { class: 's' }, '尚未解鎖')), UI.icon('chevron'));
      })));
    });

    // 錯誤
    UI.add(root, h('h2', { class: 'h-sec' }, '錯誤記憶'),
      h('div', { class: 'card' }, er.total === 0
        ? h('p', { class: 'muted' }, '目前沒有記下的錯誤。')
        : [h('div', { class: 'kv' }, h('span', { class: 'k' }, '修復中 / 已修復'), h('span', { class: 'v' }, er.open + ' / ' + er.resolved)),
          er.recurRate != null ? h('div', { class: 'kv' }, h('span', { class: 'k' }, '重複犯的比例'), h('span', { class: 'v' }, er.recurRate + '%')) : null,
          er.list.slice(0, 6).map((e) => h('div', { class: 'kv' },
            h('span', { class: 'k' }, h('span', { class: 'en' }, labelOf(e.pid)), '　', UI.tagZh(e.tag)),
            h('span', { class: 'v small' }, e.resolved ? chip('已修復', 'good') : chip('犯過 ' + e.fail_count + ' 次', 'amber'))))]));

    // 能力檢測
    const probes = state.probes;
    UI.add(root, h('h2', { class: 'h-sec' }, '能力檢測'),
      h('div', { class: 'card' },
        h('p', null, '最多 ' + Sess.PROBE_MAX + ' 題，全部是你沒練過的新句子，不給即時答案。用來看看：練過的句型，能不能用在沒背過的句子上。'),
        probes.length ? h('div', { class: 'mt12' }, probes.slice(-5).reverse().map((p, i) => h('div', { class: 'kv' },
          h('span', { class: 'k' }, '第 ' + (probes.length - i) + ' 次　' + U.fmtDate(p.t)), h('span', { class: 'v' }, p.ok + ' / ' + p.n + (p.avg_rt ? '　· ' + (p.avg_rt / 1000).toFixed(1) + ' 秒' : ''))))) : null,
        h('p', { class: 'tiny mt8' }, probes.length ? '建議每 1～2 週做一次，看分數有沒有往上。' : '建議在開始訓練前先做一次，當作起點。'),
        h('button', { class: 'btn secondary mt16', disabled: state.session ? true : null, onclick: () => { Sess.startProbe(state, content, U.now()); a.save(); a.go('#/session'); } }, probes.length ? '再做一次檢測' : '先測一次起點')));
    return root;
  };

  Views.probeResult = function () {
    const a = A(), content = a.content;
    const s = a.lastSummary && a.lastSummary.kind === 'probe' ? a.lastSummary : a.state.probes[a.state.probes.length - 1];
    if (!s) { a.go('#/progress'); return h('div'); }
    const prev = a.state.probes.length > 1 ? a.state.probes[a.state.probes.length - 2] : null;
    const root = h('div', { class: 'stack' });
    UI.add(root, h('div', { class: 'eyebrow', style: { margin: '4px 4px 0' } }, '能力檢測結果'),
      h('div', { class: 'card' }, h('div', { class: 'sum-n' }, s.ok + ' / ' + s.n), h('p', { class: 'muted mt8' }, '沒練過的新句子，答對的題數。'),
        prev ? h('p', { class: 'mt8' }, '上一次是 ' + prev.ok + ' / ' + prev.n + '。' + (s.ok > prev.ok ? '進步了。' : s.ok === prev.ok ? '持平。' : '這次少一點，沒關係，多半是題目剛好不同。')) : h('p', { class: 'tiny mt8' }, '這是你的起點。之後再測，就能看出進步。')));
    UI.add(root, h('h2', { class: 'h-sec' }, '每題'), h('div', { class: 'list' }, s.items.map((it) => {
      const ok = S.isOk(it.status);
      return h('div', { class: 'row', style: { alignItems: 'flex-start' } },
        h('span', { class: 'chip ' + (ok ? 'good' : 'amber') }, ok ? '✓' : '·'),
        h('div', { class: 'grow' }, h('div', { class: 's' }, labelOf(it.pid)), h('div', { class: 'en', style: { fontSize: '17px', marginTop: '2px' } }, it.target), !ok ? h('div', { class: 's' }, '你寫：' + (it.answer || '（沒有作答）')) : null));
    })));
    UI.add(root, h('button', { class: 'btn', onclick: () => a.go('#/progress') }, '回進度'));
    return root;
  };

  /* ================================================================== 結算 */
  Views.summary = function () {
    const a = A(), content = a.content, state = a.state;
    const s = a.lastSummary && a.lastSummary.kind !== 'probe' ? a.lastSummary : state.sessions[state.sessions.length - 1];
    if (!s) { a.go('#/today'); return h('div'); }
    const root = h('div', { class: 'stack' });
    UI.add(root, h('div', { class: 'eyebrow', style: { margin: '4px 4px 0' } }, '結算'),
      h('div', { class: 'card' },
        h('div', { class: 'sum-n' }, s.n),
        h('p', { class: 'muted mt4' }, '題完成' + (s.n_scored ? '　· 答對 ' + s.n_ok + ' / ' + s.n_scored : '')),
        s.avg_latency_ms != null ? h('p', { class: 'tiny mt8' }, '平均開口時間 ' + (s.avg_latency_ms / 1000).toFixed(1) + ' 秒') : null));
    if (s.lesson_pid) UI.add(root, h('div', { class: 'card soft flat' }, h('div', { class: 'row-flex' }, chip('新句型入門完成', 'good')), h('p', { class: 'mt8 en', style: { fontSize: '20px', fontWeight: 600 } }, labelOf(s.lesson_pid)), h('p', { class: 'tiny mt4' }, '明天會再考你一次——能不能隔一天還記得，才是重點。')));
    (s.newly_unlocked || []).filter((pid) => pid !== 'P01').forEach((pid) => UI.add(root, h('div', { class: 'card soft flat' }, chip('解鎖新句型', 'accent'), h('p', { class: 'mt8 en', style: { fontSize: '20px', fontWeight: 600 } }, labelOf(pid)))));

    const group = (cls, head, pids) => pids.length ? h('div', { class: 'sum-group' }, h('div', { class: 'gh ' + cls }, head),
      pids.map((pid) => { const q = progOf(pid); return h('div', { class: 'sum-item' }, h('span', null, labelOf(pid)), h('small', null, S.label(q))); })) : null;
    UI.add(root, group('good', '✓ 已掌握', s.mastered), group('up', '↑ 正在變穩', s.stabilizing), group('need', '• 需要再練', s.needs));
    const fixed = (s.repaired || []);
    if (fixed.length) {
      UI.add(root, h('div', { class: 'sum-group' }, h('div', { class: 'gh good' }, '今天你修復了'),
        fixed.map((r) => h('div', { class: 'sum-item' }, h('span', { style: { fontFamily: 'var(--font-ui)', fontSize: '17px' } }, UI.tagZh(r.tag), h('span', { class: 'tiny' }, '　' + labelOf(r.pid))), h('small', null, r.resolved ? '完全修好了' : '修好一次（' + r.count + ' / 2）')))));
    }
    UI.add(root, h('p', { class: 'muted center mt16' }, '明天約 ' + s.tomorrow.minutes + ' 分鐘'),
      h('div', { class: 'btn-row mt8' }, h('button', { class: 'btn', onclick: () => a.go('#/today') }, '回首頁')));
    return root;
  };

  /* ================================================================== 設定 */
  Views.settings = function () {
    const a = A(), state = a.state, st = state.settings;
    const save = () => a.save();
    const root = h('div');
    UI.add(root, pageTitle('設定'));

    const sttNote = !Sp.sttSupported ? Sp.sttOffText + (P10.env.trial ? '。' : '（Chrome / Edge 可以）。') : (Sp.isFile ? '直接開檔案時，語音辨識可能被瀏覽器擋住；用「開始練習.bat」開啟比較穩。' : '');
    UI.add(root, h('div', { class: 'card' },
      h('div', { class: 'field', style: { marginTop: 0 } }, h('span', { class: 'lab' }, '回答方式'),
        UI.seg([['text', '打字'], ['voice', '語音'], ['both', '兩者皆可']], st.input_mode, (v) => { st.input_mode = v; save(); }),
        sttNote ? h('p', { class: 'tiny' }, sttNote) : h('p', { class: 'tiny' }, '語音：瀏覽器會把聲音交給語音服務辨識，本程式不保存錄音，只留下辨識出的文字。')),
      h('div', { class: 'field' }, h('span', { class: 'lab' }, '每次訓練題數'),
        UI.seg([[6, '6'], [8, '8'], [12, '12'], [16, '16']], st.session_size, (v) => { st.session_size = v; save(); })),
      h('div', { class: 'field' }, h('span', { class: 'lab' }, '我的程度（影響新句型課的難度）'),
        UI.seg([['beginner', '剛開始'], ['basic', '有基礎'], ['advanced', '不錯']], st.level, (v) => { st.level = v; save(); }),
        h('p', { class: 'tiny' }, '「不錯」會跳過比較簡單的填空，倒數時間也比較短。'))));

    // 朗讀
    const voices = Sp.voices();
    const sel = h('select', { class: 'txt', onchange: () => { st.voice_uri = sel.value || null; save(); } },
      h('option', { value: '' }, '自動選擇'),
      voices.map((v) => h('option', { value: v.voiceURI, selected: st.voice_uri === v.voiceURI }, v.name + '（' + v.lang + '）')));
    UI.add(root, h('h2', { class: 'h-sec' }, '朗讀'),
      h('div', { class: 'card' },
        !Sp.ttsSupported ? h('p', { class: 'muted' }, '這個瀏覽器不支援朗讀。') : [
          h('div', { class: 'field', style: { marginTop: 0 } }, h('span', { class: 'lab' }, '聲音'), sel),
          h('div', { class: 'field' }, h('span', { class: 'lab' }, '一般速度'), UI.seg([[0.85, '0.85×'], [1.0, '1.0×'], [1.1, '1.1×']], st.rate_normal, (v) => { st.rate_normal = v; save(); })),
          h('div', { class: 'field' }, h('span', { class: 'lab' }, '慢速'), UI.seg([[0.6, '0.6×'], [0.7, '0.7×'], [0.8, '0.8×']], st.rate_slow, (v) => { st.rate_slow = v; save(); })),
          h('button', { class: 'btn secondary mt16', onclick: () => Sp.speak('I wish I had more time.', { rate: st.rate_normal, voiceURI: st.voice_uri }) }, UI.icon('volume'), '試聽'),
          h('div', { class: 'switch-row' }, h('div', null, h('div', null, '答對後自動朗讀'), h('div', { class: 'tiny' }, '把正確的句子再聽一遍')), UI.toggle(st.auto_speak !== false, (v) => { st.auto_speak = v; save(); }))]));

    UI.add(root, h('h2', { class: 'h-sec' }, '外觀'),
      h('div', { class: 'card' },
        P10.env.trial ? null : h('div', { class: 'field', style: { marginTop: 0 } }, h('span', { class: 'lab' }, '主題'), UI.seg([['auto', '跟隨系統'], ['light', '淺色'], ['dark', '深色']], st.theme, (v) => { st.theme = v; save(); a.applyTheme(); })),
        h('div', { class: 'switch-row' }, h('div', null, h('div', null, '顯示反應時間'), h('div', { class: 'tiny' }, '答對時顯示「反應：2.4 秒」')), UI.toggle(st.show_latency !== false, (v) => { st.show_latency = v; save(); }))));

    UI.add(root, h('h2', { class: 'h-sec' }, '判題怎麼運作'),
      h('div', { class: 'card flat soft' },
        h('p', { class: 'explain' }, '對錯是程式自己比對的，沒有 AI，也不連網。'),
        h('p', { class: 'explain mt8' }, '它不懂中文。做法是把你的英文，和每一題事先收錄的「標準答案＋也算對的說法」比對，再用規則看錯在哪。'),
        h('p', { class: 'explain mt8' }, '所以合理、但沒收錄的說法會先被判成「差一點」。遇到這種情況，按「我覺得我的答案也可以」就能補進去；也可以到「教材管理」整理。')));

    UI.add(root, h('h2', { class: 'h-sec' }, '教材'),
      h('div', { class: 'list' }, h('a', { class: 'row', href: '#/admin' }, h('div', { class: 'grow' }, h('div', { class: 't', style: { fontFamily: 'var(--font-ui)', fontSize: '17px' } }, '教材管理'), h('div', { class: 's' }, '編輯句型、新增／停用變形題、用 AI 擴充題庫')), UI.icon('chevron'))));

    UI.add(root, h('h2', { class: 'h-sec' }, '資料'),
      h('div', { class: 'card' },
        h('p', { class: 'muted small' }, '所有進度只存在這個瀏覽器裡，沒有上傳到任何地方。換電腦或手機時，用備份帶過去。'),
        h('p', { class: 'tiny mt8' }, state.last_backup_at ? '上次備份：' + U.fmtDate(state.last_backup_at) : '還沒備份過。'),
        iosTip() ? h('p', { class: 'small mt8', style: { color: 'var(--amber)' } }, iosTip()) : null,
        h('div', { class: 'btn-row mt16' },
          h('button', { class: 'btn secondary', onclick: () => Views.exportBackup() }, UI.icon('download'), P10.env.trial ? '複製備份' : '匯出備份'),
          h('button', { class: 'btn secondary', onclick: () => importBackup() }, UI.icon('upload'), '匯入備份')),
        h('button', { class: 'btn danger mt12', onclick: () => UI.confirm('清除所有進度？', '會刪掉你的進度、作答紀錄和錯誤記憶，無法復原。建議先匯出備份。教材修改不受影響。', '清除', () => { Store.reset(); a.reload(); }, 'danger') }, '清除所有進度')));

    UI.add(root, h('p', { class: 'tiny center mt24' }, 'Pattern 10 · v0.2 · 方法來自「暗記暗誦」的學習思想；教材為自行編寫。'));
    return root;
  };

  function importBackup() {
    const a = A();
    const inp = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' }, onchange: () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const r = Store.importAll(String(rd.result));
        if (!r.ok) { UI.toast(r.error, 3500); return; }
        UI.toast('已匯入備份'); setTimeout(() => a.reload(), 600);
      };
      rd.readAsText(f);
    } });
    doc.body.append(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  }

  /* ================================================================== 首次使用（規格 §14） */
  const PLACEMENT = [
    { zh: '我喜歡咖啡。', en: 'I like coffee.', acc: ['I {like|love} coffee.'] },
    { zh: '她昨天去了學校。', en: 'She went to school yesterday.', acc: ['Yesterday she went to school.'] },
    { zh: '我已經吃過午餐了。', en: 'I have already eaten lunch.', acc: ['I have {already |}{eaten|had} lunch{ already|}.'] },
    { zh: '如果下雨，我就不去。', en: 'If it rains, I won\'t go.', acc: ['If it {rains|is raining}, I {won\'t|will not} go.'] },
    { zh: '我在想他是不是生氣了。', en: 'I wonder whether he is angry.', acc: ['I wonder {whether|if} he {is|was} {angry|mad|upset}.'] }
  ];

  Views.onboarding = function () {
    const a = A(), state = a.state;
    const root = h('div', { class: 'onb' });
    const ob = { step: 0, score: 0, q: 0 };
    const dots = (n) => h('div', { class: 'dots' }, [0, 1, 2].map((i) => h('i', { class: i === n ? 'on' : '' })));
    const show = (nodes) => { UI.clear(root); UI.add(root, ...nodes); window.scrollTo(0, 0); };

    function step1() {
      show([
        dots(0),
        h('div', { class: 'grow' },
          h('div', { class: 'eyebrow' }, 'Pattern 10'),
          h('h1', { class: 'big' }, '這不是背單字 App。'),
          h('p', { class: 'muted', style: { fontSize: '19px', lineHeight: 1.7 } }, '你會把一個個英文句型練成反射，再學會自己變形。'),
          h('p', { class: 'muted', style: { fontSize: '16px' } }, '每天約 5 分鐘。每一題都在問：沒看到答案，你說得出來嗎？'),
          h('p', { class: 'tiny' }, '你的進度只存在這台裝置的瀏覽器裡，不會上傳到任何地方。')),
        h('button', { class: 'btn', onclick: step2 }, '開始')]);
    }
    function step2() {
      const canVoice = Sp.sttSupported;
      let mode = state.settings.input_mode || 'text';
      const mk = (val, title, sub, disabled) => h('button', { class: 'choice', 'aria-pressed': String(mode === val), disabled: disabled ? true : null, onclick: (e) => { mode = val; root.querySelectorAll('.choice').forEach((c) => c.setAttribute('aria-pressed', 'false')); e.currentTarget.setAttribute('aria-pressed', 'true'); } }, h('b', null, title), h('span', null, sub));
      show([
        dots(1),
        h('div', { class: 'grow' },
          h('h1', { class: 'big' }, '你想怎麼回答？'),
          h('p', { class: 'muted' }, '之後可以在設定裡改。'),
          mk('text', '打字', '最穩定，隨時都能用'),
          mk('both', '兩者皆可', canVoice ? '可以打字，也可以按麥克風用說的' : Sp.sttOffText, !canVoice),
          mk('voice', '語音為主', canVoice ? '像開口練習一樣，用說的回答' : Sp.sttOffText, !canVoice),
          Sp.isFile && canVoice ? h('p', { class: 'tiny' }, '提醒：直接開檔案時，語音可能被瀏覽器擋住。') : null),
        h('button', { class: 'btn', onclick: () => { state.settings.input_mode = mode; a.save(); step3(); } }, '下一步')]);
    }
    function step3() {
      ob.q = 0; ob.score = 0;
      ask();
    }
    function ask() {
      if (ob.q >= PLACEMENT.length) return done();
      const q = PLACEMENT[ob.q];
      const ta = h('textarea', { class: 'answer', rows: 2, placeholder: 'Type in English…', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
        oninput: () => { btn.disabled = !ta.value.trim(); }, onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (ta.value.trim()) answer(ta.value); } } });
      const btn = h('button', { class: 'btn', disabled: true, onclick: () => answer(ta.value) }, ob.q === PLACEMENT.length - 1 ? '完成' : '下一題');
      show([
        dots(2),
        h('div', { class: 'grow' },
          h('div', { class: 'eyebrow' }, '快速看一下你的起點　' + (ob.q + 1) + ' / ' + PLACEMENT.length),
          h('div', { class: 'prompt lg' }, q.zh),
          ta,
          h('button', { class: 'link muted', onclick: () => answer('') }, '不會，跳過')),
        btn]);
      setTimeout(() => ta.focus(), 80);
    }
    function answer(text) {
      const q = PLACEMENT[ob.q];
      const r = E.judge({ answer: text, ex: { en: q.en, acc: q.acc } });
      if (S.isOk(r.status)) ob.score++;
      ob.q++; ask();
    }
    function done() {
      const level = ob.score <= 1 ? 'beginner' : ob.score <= 3 ? 'basic' : 'advanced';
      state.settings.level = level;
      state.onboarding_score = ob.score;
      state.onboarded = true;
      a.save();
      const text = { beginner: '我們會慢慢來，從最基本的填空開始。', basic: '你有一些基礎。我們會從中間難度的填空開始。', advanced: '你的基礎不錯。我們會跳過最簡單的填空，直接練更有挑戰的部分。' }[level];
      show([
        dots(2),
        h('div', { class: 'grow' },
          h('div', { class: 'eyebrow' }, '看完了'),
          h('h1', { class: 'big' }, '第一個句型'),
          h('div', { class: 'card' }, h('div', { class: 'sentence' }, a.content.patterns[0].mother), h('div', { class: 'zh-line' }, a.content.patterns[0].zh)),
          h('p', { class: 'muted' }, text + ' 現在就開始，大約 5 分鐘。')),
        h('button', { class: 'btn', onclick: () => startSession({}) }, '開始第一課')]);
    }
    step1();
    return root;
  };

  P10.views = Views;
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
