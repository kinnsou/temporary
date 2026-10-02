/* Pattern 10 — 判題引擎
 * 三層：Layer 1 正規化（大小寫／標點／縮寫）→ Layer 2 已知答案 → Layer 3 離線診斷（逐字對齊＋規則）
 * 不呼叫任何網路服務；之後要接 AI 時，只需要替換 judge() 的 Layer 3。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const V = P10.verbs;
  const E = (P10.engine = {});

  /* ------------------------------------------------------------------ 常數 */
  const ARTICLES = new Set(['a', 'an', 'the']);
  const PREPS = new Set(['to', 'for', 'of', 'in', 'on', 'at', 'with', 'about', 'from', 'by', 'into', 'during', 'over', 'under',
    'between', 'without', 'near', 'through', 'across', 'around', 'against', 'among', 'toward', 'towards']);
  const CONJ = new Set(['before', 'after', 'until', 'than', 'as', 'since', 'while', 'because', 'that', 'whether', 'if', 'when', 'but', 'so', 'or', 'and']);
  const PRONOUNS = new Set(['i', 'me', 'my', 'mine', 'myself', 'you', 'your', 'yours', 'yourself', 'he', 'him', 'his', 'himself',
    'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'we', 'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves']);
  const AUX = V.AUX;
  const FILLERS = new Set(['um', 'uh', 'umm', 'uhh', 'erm', 'hmm', 'hm', 'ah', 'er']);

  const NUM_WORDS = {
    0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen',
    19: 'nineteen', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'hundred'
  };
  const SPELL = {
    cancelled: 'canceled', cancelling: 'canceling', travelling: 'traveling', travelled: 'traveled', traveller: 'traveler',
    colour: 'color', favourite: 'favorite', centre: 'center', grey: 'gray', learnt: 'learned', gotten: 'got', okay: 'ok',
    mum: 'mom', programme: 'program', realise: 'realize', organise: 'organize', practise: 'practice', whilst: 'while',
    neighbour: 'neighbor', theatre: 'theater', cinema: 'cinema', kilos: 'kilograms', kilo: 'kilogram', kg: 'kilograms',
    mom: 'mom', mommy: 'mom', mama: 'mom', dad: 'dad', daddy: 'dad', cellphone: 'cellphone', 'e-mail': 'email'
  };
  /* 縮寫後面接這些字時，'d 讀作 had、's 讀作 has */
  const HAD_NEXT = new Set(['better', 'been', 'had', 'gone', 'done', 'seen', 'eaten', 'taken', 'left', 'known', 'never', 'already', 'just']);
  const HAS_NEXT = new Set(['been', 'got', 'had', 'gone', 'done', 'seen', 'taken', 'eaten', 'learned', 'never', 'already', 'just', 'ever', 'not', 'always', 'still']);
  const ADV_SKIP = new Set(['never', 'already', 'just', 'ever', 'also', 'still', 'always', 'not', 'really', 'only', 'even', 'often']);
  const PRON_S = new Set(['he', 'she', 'it', 'that', 'there', 'what', 'who', 'here', 'where', 'how', 'everyone', 'someone', 'everybody', 'nobody', 'nothing', 'something', 'everything']);

  E.CONST = { ARTICLES, PREPS, CONJ, PRONOUNS, AUX };

  /* 錯誤標籤（規格 §8 ＋ 兩個自訂）與白話名稱 */
  E.TAGS = {
    WORD_MISSING: '少了字', WORD_ORDER: '字的順序', TENSE: '時態', SUBJECT_VERB: '主詞和動詞配合', ARTICLE: '冠詞（a / the）',
    PREPOSITION: '介系詞', GERUND_INFINITIVE: '動詞形式（原形／-ing）', CONDITIONAL: 'if 條件句', WISH_REALITY: 'wish 要用過去式',
    AUXILIARY: '助動詞', PLURAL: '單複數', PRONOUN: '代名詞', PATTERN_NOT_USED: '沒有用到這個句型', MEANING_CHANGED: '意思改變了',
    STT_UNCERTAIN: '語音沒聽清楚', OTHER: '其他', WORD_EXTRA: '多了字', CONJUNCTION: '連接詞', SPELLING: '拼字', COMPARATIVE: '比較級（-er / more … than）'
  };
  /* 不開「回馬槍」的標籤（不是句型本身的問題） */
  E.NON_REPAIRABLE = new Set(['MEANING_CHANGED', 'STT_UNCERTAIN', 'OTHER', 'SPELLING', 'WORD_EXTRA']);

  /* ------------------------------------------------------------------ Layer 1：正規化 */
  function cleanPieces(word) {
    let s = word.toLowerCase();
    s = s.replace(/[‘’‛′`´]/g, "'");
    s = s.replace(/e[- ]?mail/g, 'email');
    s = s.replace(/[‐-―\-_/]/g, ' ');
    s = s.replace(/[^a-z0-9'À-ɏ\s]/g, ' ');
    // 不在字母之間的撇號去掉
    s = s.replace(/(^|[^a-zÀ-ɏ])'+/g, '$1 ').replace(/'+(?=$|[^a-zÀ-ɏ])/g, ' ');
    return s.split(/\s+/).filter(Boolean);
  }

  function nextNonAdv(pieces, i) {
    let j = i + 1;
    while (j < pieces.length && ADV_SKIP.has(pieces[j].text)) j++;
    return j < pieces.length ? pieces[j].text : null;
  }

  /* 一個字 → [{tokens, alts}]；alts 是另一種讀法（'d、's 有歧義） */
  function expandPiece(p, pieces, i) {
    const t = p.text;
    const fixed = {
      "i'm": ['i', 'am'], "can't": ['can', 'not'], cannot: ['can', 'not'], "won't": ['will', 'not'], "shan't": ['shall', 'not'],
      "ain't": ['is', 'not'], "let's": ['let', 'us'], gonna: ['going', 'to'], wanna: ['want', 'to'], gotta: ['got', 'to']
    };
    if (fixed[t]) return { tokens: fixed[t] };
    let m;
    if ((m = t.match(/^(.+)n't$/))) return { tokens: [m[1], 'not'] };
    if ((m = t.match(/^(.+)'re$/))) return { tokens: [m[1], 'are'] };
    if ((m = t.match(/^(.+)'ve$/))) return { tokens: [m[1], 'have'] };
    if ((m = t.match(/^(.+)'ll$/))) return { tokens: [m[1], 'will'] };
    if ((m = t.match(/^(.+)'m$/))) return { tokens: [m[1], 'am'] };
    if ((m = t.match(/^(.+)'d$/))) {
      const nx = nextNonAdv(pieces, i);
      const def = nx && HAD_NEXT.has(nx) ? 'had' : 'would';
      const alt = def === 'had' ? 'would' : 'had';
      return { tokens: [m[1], def], alts: [[m[1], alt]] };
    }
    if ((m = t.match(/^(.+)'s$/))) {
      const stem = m[1];
      const nx = nextNonAdv(pieces, i);
      if (PRON_S.has(stem)) {
        const def = nx && HAS_NEXT.has(nx) ? 'has' : 'is';
        const alt = def === 'has' ? 'is' : 'has';
        return { tokens: [stem, def], alts: [[stem, alt]] };
      }
      // 名詞 's：所有格 / is / has
      return { tokens: [t], alts: [[stem, 'is'], [stem, 'has']] };
    }
    return { tokens: [t] };
  }

  function mapToken(t) {
    if (/^\d+$/.test(t) && NUM_WORDS[+t] != null) return NUM_WORDS[+t];
    if (SPELL[t]) return SPELL[t];
    return t;
  }

  /* 完整分詞：回傳 tokens、每個 token 來自原文第幾個字(src)、以及歧義位置 */
  function tokenizeFull(raw) {
    const text = String(raw == null ? '' : raw).normalize('NFKC');
    const words = text.trim().split(/\s+/).filter(Boolean);
    const pieces = [];
    words.forEach((w, wi) => cleanPieces(w).forEach((x) => { if (!FILLERS.has(x)) pieces.push({ text: x, wi }); }));
    const tokens = [], src = [], segs = [];
    pieces.forEach((p, i) => {
      const ex = expandPiece(p, pieces, i);
      const opts = [ex.tokens].concat(ex.alts || []).map((a) => a.map(mapToken));
      segs.push(opts);
      opts[0].forEach((tk) => { tokens.push(tk); src.push(p.wi); });
    });
    return { tokens, src, words, segs };
  }

  /* 所有可能讀法（上限 16 種），用於「是否相等」 */
  function variantsOf(full) {
    let list = [[]];
    for (const opts of full.segs) {
      if (opts.length === 1) { list.forEach((l) => l.push(...opts[0])); continue; }
      const next = [];
      for (const l of list) for (const o of opts) { if (next.length >= 16) break; next.push(l.concat(o)); }
      list = next.length ? next : list;
    }
    return list;
  }

  E.tokenize = (s) => tokenizeFull(s).tokens;
  E.normalize = (s) => tokenizeFull(s).tokens.join(' ');
  E.tokenizeFull = tokenizeFull;
  E.variantsOf = variantsOf;

  /* ------------------------------------------------------------------ 教材語法：{a|b|} 展開 */
  E.expand = function (pattern, limit) {
    limit = limit || 1500;
    const re = /\{([^{}]*)\}/;
    let out = [String(pattern)];
    for (let guard = 0; guard < 12; guard++) {
      let changed = false;
      const next = [];
      for (const s of out) {
        const m = s.match(re);
        if (!m) { next.push(s); continue; }
        changed = true;
        m[1].split('|').forEach((opt) => next.push(s.slice(0, m.index) + opt + s.slice(m.index + m[0].length)));
        if (next.length > limit) return next.slice(0, limit);
      }
      out = next;
      if (!changed) break;
    }
    return out.map((s) => s.replace(/\s+/g, ' ').replace(/\s+([.,!?])/g, '$1').trim());
  };

  /* "If A, B." → "B if A."（條件句前後換位也算對） */
  E.ifSwap = function (s) {
    const m = String(s).trim().match(/^if\s+(.+?),\s*(.+?)\s*([.!?]?)$/i);
    if (!m) return null;
    return m[2] + ' if ' + m[1] + (m[3] || '.');
  };

  /* ------------------------------------------------------------------ 候選答案 */
  const candCache = new Map();
  function makeCand(text, kind) {
    const full = tokenizeFull(text);
    return { text, kind, full, tokens: full.tokens, keys: new Set(variantsOf(full).map((v) => v.join(' '))) };
  }
  /* ex: {en, acc:[...]}；overrides: 使用者自己認定的答案（字串陣列） */
  E.candidates = function (ex, overrides) {
    const key = (ex.en || '') + '¦' + (ex.acc || []).join('¦') + '¦' + (ex.swapIf === false ? 'n' : 'y');
    let base = candCache.get(key);
    if (!base) {
      base = [makeCand(ex.en, 'target')];
      const seen = new Set(base[0].keys);
      const add = (txt, kind) => {
        const c = makeCand(txt, kind);
        const k = [...c.keys][0];
        if (!seen.has(k)) { seen.add(k); base.push(c); }
      };
      const lits = [];
      (ex.acc || []).forEach((p) => E.expand(p).forEach((s) => lits.push(s)));
      lits.forEach((s) => add(s, 'accept'));
      if (ex.swapIf !== false) {
        [ex.en].concat(lits).forEach((s) => { const sw = E.ifSwap(s); if (sw) add(sw, 'accept'); });
      }
      if (candCache.size > 800) candCache.clear();
      candCache.set(key, base);
    }
    const extra = (overrides || []).map((t) => makeCand(t, 'override'));
    return base.concat(extra);
  };

  /* ------------------------------------------------------------------ 逐字對齊（含相鄰互換） */
  function charDist(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = new Array(n + 1), cur = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      const t = prev; prev = cur; cur = t;
    }
    return prev[n];
  }
  E.charDist = charDist;

  function spellingClose(a, b) {
    const L = Math.max(a.length, b.length);
    if (L < 4 || a === b) return false;
    const d = charDist(a, b);
    return d === 1 || (L >= 7 && d === 2);
  }
  function stemPlural(a, b) {
    const f = (x, y) => y === x + 's' || y === x + 'es' || (x.endsWith('y') && y === x.slice(0, -1) + 'ies');
    return f(a, b) || f(b, a);
  }

  function subCost(a, b) {
    if (a === b) return 0;
    if (V.sameLemma(a, b)) return 0.5;
    if (stemPlural(a, b)) return 0.5;
    if (spellingClose(a, b)) return 0.4;
    if (ARTICLES.has(a) && ARTICLES.has(b)) return 0.6;
    if (PRONOUNS.has(a) && PRONOUNS.has(b)) return 0.8;
    return 1;
  }
  const insCost = (t) => (ARTICLES.has(t) ? 0.8 : 1);

  E.align = function (u, c) {
    const n = u.length, m = c.length;
    const dp = [], bt = [];
    for (let i = 0; i <= n; i++) { dp.push(new Float64Array(m + 1)); bt.push(new Uint8Array(m + 1)); }
    for (let i = 1; i <= n; i++) { dp[i][0] = dp[i - 1][0] + insCost(u[i - 1]); bt[i][0] = 2; }
    for (let j = 1; j <= m; j++) { dp[0][j] = dp[0][j - 1] + insCost(c[j - 1]); bt[0][j] = 1; }
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        let best = dp[i - 1][j - 1] + subCost(u[i - 1], c[j - 1]), b = 0;
        const del = dp[i][j - 1] + insCost(c[j - 1]);          // 使用者少了 c[j-1]
        const ins = dp[i - 1][j] + insCost(u[i - 1]);          // 使用者多了 u[i-1]
        if (del < best - 1e-9) { best = del; b = 1; }
        if (ins < best - 1e-9) { best = ins; b = 2; }
        if (i >= 2 && j >= 2 && u[i - 1] === c[j - 2] && u[i - 2] === c[j - 1] && u[i - 1] !== u[i - 2]) {
          const sw = dp[i - 2][j - 2] + 1;
          if (sw < best - 1e-9) { best = sw; b = 3; }
        }
        dp[i][j] = best; bt[i][j] = b;
      }
    }
    const ops = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
      const b = bt[i][j];
      if (i > 0 && j > 0 && b === 0) {
        ops.push({ t: u[i - 1] === c[j - 1] ? 'eq' : 'sub', ui: i - 1, ci: j - 1, u: u[i - 1], c: c[j - 1] }); i--; j--;
      } else if (j > 0 && (b === 1 || i === 0)) {
        ops.push({ t: 'del', ui: i, ci: j - 1, u: null, c: c[j - 1] }); j--;
      } else if (b === 3) {
        ops.push({ t: 'swap', ui: [i - 2, i - 1], ci: [j - 2, j - 1], u: u[i - 2] + ' ' + u[i - 1], c: c[j - 2] + ' ' + c[j - 1] }); i -= 2; j -= 2;
      } else {
        ops.push({ t: 'ins', ui: i - 1, ci: j, u: u[i - 1], c: null }); i--;
      }
    }
    ops.reverse();
    return { dist: dp[n][m], ops };
  };

  /* ------------------------------------------------------------------ 診斷：逐字差異 → 錯誤標籤 */
  function wordClassTag(w) {
    if (ARTICLES.has(w)) return 'ARTICLE';
    if (PREPS.has(w)) return 'PREPOSITION';
    if (CONJ.has(w) && w !== 'and' && w !== 'but') return 'CONJUNCTION';
    if (AUX.has(w)) return 'AUXILIARY';
    return null;
  }

  function formTag(u, c) {
    const U = V.analyze(u), C = V.analyze(c);
    let best = null;
    for (const x of U) for (const y of C) {
      if (x.lemma !== y.lemma) continue;
      if (x.form === y.form) continue;
      const pair = x.form + '>' + y.form;     // 使用者的形態 > 正確的形態
      let tag = 'TENSE';
      if (/^(ing>(base|s|past|pp)|(base|s|past|pp)>ing)$/.test(pair)) tag = 'GERUND_INFINITIVE';
      else if (pair === 'base>s' || pair === 's>base') tag = 'SUBJECT_VERB';
      if (x.lemma === 'be') {
        const pres = new Set(['am', 'is', 'are']);
        tag = pres.has(u) && pres.has(c) ? 'SUBJECT_VERB' : (u === 'was' && c === 'were') || (u === 'were' && c === 'was') ? 'SUBJECT_VERB' : 'TENSE';
      }
      best = best || tag;
    }
    return best;
  }

  function opNote(op) {
    const tick = (s) => '「' + s + '」';
    switch (op.t) {
      case 'swap': return { tag: 'WORD_ORDER', text: '字的順序不一樣：' + tick(op.u) + ' → ' + tick(op.c), ui: op.ui, ci: op.ci };
      case 'del': {
        const tag = wordClassTag(op.c) || 'WORD_MISSING';
        const label = tag === 'ARTICLE' ? '（a / an / the）' : tag === 'AUXILIARY' ? '（助動詞）' : '';
        return { tag, text: '少了 ' + tick(op.c) + label, ui: [], ci: [op.ci] };
      }
      case 'ins': {
        const tag = wordClassTag(op.u);
        if (tag === 'ARTICLE' || tag === 'PREPOSITION' || tag === 'AUXILIARY' || tag === 'CONJUNCTION') return { tag, text: '這裡不需要 ' + tick(op.u), ui: [op.ui], ci: [] };
        return { tag: 'WORD_EXTRA', text: '多了 ' + tick(op.u), ui: [op.ui], ci: [] };
      }
      case 'sub': {
        const u = op.u, c = op.c;
        const ft = formTag(u, c);
        if (ft) return { tag: ft, text: ({ TENSE: '時態不一樣', SUBJECT_VERB: '主詞和動詞要配合', GERUND_INFINITIVE: '動詞的形式不一樣' })[ft] + '：' + tick(u) + ' → ' + tick(c), ui: [op.ui], ci: [op.ci] };
        if (PRONOUNS.has(u) && PRONOUNS.has(c)) return { tag: 'PRONOUN', text: '代名詞不一樣：' + tick(u) + ' → ' + tick(c), ui: [op.ui], ci: [op.ci] };
        if (ARTICLES.has(u) && ARTICLES.has(c)) return { tag: 'ARTICLE', text: '冠詞不一樣：' + tick(u) + ' → ' + tick(c), ui: [op.ui], ci: [op.ci] };
        if (PREPS.has(u) && PREPS.has(c)) return { tag: 'PREPOSITION', text: '介系詞不一樣：' + tick(u) + ' → ' + tick(c), ui: [op.ui], ci: [op.ci] };
        if (CONJ.has(u) && CONJ.has(c)) return { tag: 'CONJUNCTION', text: '連接詞不一樣：' + tick(u) + ' → ' + tick(c), ui: [op.ui], ci: [op.ci] };
        if (AUX.has(u) && AUX.has(c)) return { tag: 'AUXILIARY', text: '助動詞不一樣：' + tick(u) + ' → ' + tick(c), ui: [op.ui], ci: [op.ci] };
        if (stemPlural(u, c)) return { tag: 'PLURAL', text: '單複數：' + tick(u) + ' → ' + tick(c), ui: [op.ui], ci: [op.ci] };
        if (spellingClose(u, c)) return { tag: 'SPELLING', text: '拼字：' + tick(u) + ' → ' + tick(c), ui: [op.ui], ci: [op.ci] };
        return { tag: 'MEANING_CHANGED', text: '這裡的字不一樣：' + tick(u) + ' ↔ ' + tick(c) + '（意思可能改變）', ui: [op.ui], ci: [op.ci] };
      }
    }
    return null;
  }

  /* 主詞動詞一致（通用規則，所有句型都會檢查） */
  const SUBJ_PREV = new Set(['and', 'but', 'that', 'if', 'because', 'when', 'whether', 'before', 'after', 'while', 'so', 'than', 'as', 'wish',
    'think', 'know', 'say', 'said', 'believe', 'hope', 'reason', 'is', 'was', 'until', 'since', 'though', 'although', 'how', 'what', 'why',
    'where', 'who', 'which', 'then', 'or', 'sure', 'now']);
  const ADV_BETWEEN = new Set(['usually', 'always', 'often', 'never', 'just', 'also', 'still', 'really', 'already', 'even', 'only', 'now', 'sometimes',
    'rarely', 'seldom', 'hardly', 'ever', 'not', 'quickly', 'slowly']);
  E.subjectVerbIssues = function (tokens) {
    const out = [];
    const tick = (s) => '「' + s + '」';
    for (let i = 0; i < tokens.length; i++) {
      const s = tokens[i];
      const third = s === 'he' || s === 'she' || s === 'it';
      const plural = s === 'i' || s === 'you' || s === 'we' || s === 'they';
      if (!third && !plural) continue;
      if (s === 'it' && i > 0 && !SUBJ_PREV.has(tokens[i - 1])) continue;
      if (s === 'you' && i > 0 && !SUBJ_PREV.has(tokens[i - 1])) continue;
      let j = i + 1;
      while (j < tokens.length && ADV_BETWEEN.has(tokens[j])) j++;
      const t = tokens[j];
      if (!t) continue;
      let fix = null;
      if (third) {
        if (t === 'are' || t === 'am') fix = 'is';
        else if (t === 'have') fix = 'has';
        else if (t === 'do') fix = 'does';
        else if (V.isBase(t) && !V.isThirdS(t) && !V.isPast(t) && t !== 'be') {
          fix = V.formOf(V.lemmaOf(t), 's');
        }
      } else {
        if (s === 'i' && (t === 'is' || t === 'are')) fix = 'am';
        else if (s !== 'i' && (t === 'is' || t === 'am')) fix = 'are';
        else if (s === 'i' && t === 'has') fix = 'have';
        else if (t === 'has') fix = 'have';
        else if (t === 'does') fix = 'do';
        else if (V.isThirdS(t) && !V.isBase(t) && !V.isPast(t) && !V.BE_SET.has(t)) fix = V.formOf(V.lemmaOf(t), 'base');
        else if (t === 'was' && s === 'you') fix = 'were';
      }
      if (fix && fix !== t) out.push({ tag: 'SUBJECT_VERB', text: '主詞和動詞要配合：' + s + ' ' + tick(t) + ' → ' + s + ' ' + tick(fix), ui: [j], ci: [] });
    }
    return out;
  };

  /* ------------------------------------------------------------------ 語音容錯（STT） */
  const HOMOPHONES = [['to', 'too', 'two'], ['for', 'four', 'fore'], ['there', 'their', 'theyre'], ['its', 'itis'], ['no', 'know'], ['right', 'write'],
    ['by', 'buy', 'bye'], ['hear', 'here'], ['see', 'sea'], ['week', 'weak'], ['whether', 'weather'], ['which', 'witch'], ['one', 'won'], ['our', 'hour'],
    ['new', 'knew'], ['would', 'wood'], ['been', 'bean'], ['wait', 'weight'], ['wish', 'which'], ['had', 'ad'], ['lived', 'live'], ['i', 'eye', 'aye'], ['than', 'then'], ['thank', 'think'], ['could', 'good'], ['cheap', 'chip']];
  const HOMO = {};
  HOMOPHONES.forEach((grp) => grp.forEach((w) => { HOMO[w] = (HOMO[w] || []).concat(grp); }));
  const isHomo = (a, b) => a === b || (HOMO[a] && HOMO[a].indexOf(b) >= 0);

  /* ------------------------------------------------------------------ judge */
  const PRIORITY = ['WISH_REALITY', 'CONDITIONAL', 'COMPARATIVE', 'WORD_ORDER', 'TENSE', 'SUBJECT_VERB', 'GERUND_INFINITIVE', 'CONJUNCTION', 'AUXILIARY', 'PREPOSITION',
    'ARTICLE', 'PLURAL', 'PRONOUN', 'WORD_MISSING', 'WORD_EXTRA', 'MEANING_CHANGED', 'SPELLING', 'PATTERN_NOT_USED', 'OTHER'];
  /* 專屬規則命中某個標籤時，哪些「籠統的逐字差異標籤」就不再重複列出 */
  const SPECIALIZES = {
    WISH_REALITY: ['TENSE', 'AUXILIARY', 'SUBJECT_VERB'],
    CONDITIONAL: ['TENSE', 'AUXILIARY'],
    TENSE: ['AUXILIARY', 'GERUND_INFINITIVE', 'MEANING_CHANGED', 'WORD_EXTRA'],
    GERUND_INFINITIVE: ['TENSE', 'SUBJECT_VERB', 'AUXILIARY', 'PREPOSITION', 'WORD_EXTRA'],
    WORD_ORDER: ['SUBJECT_VERB', 'AUXILIARY', 'WORD_MISSING', 'WORD_EXTRA'],
    CONJUNCTION: ['AUXILIARY', 'WORD_MISSING', 'WORD_EXTRA', 'SUBJECT_VERB'],
    PREPOSITION: ['WORD_MISSING', 'WORD_EXTRA', 'GERUND_INFINITIVE', 'SUBJECT_VERB'],
    AUXILIARY: ['SUBJECT_VERB', 'TENSE', 'WORD_EXTRA', 'WORD_MISSING'],
    MEANING_CHANGED: ['AUXILIARY', 'WORD_EXTRA'],
    COMPARATIVE: ['MEANING_CHANGED', 'WORD_EXTRA', 'WORD_MISSING']
  };

  function rulesFor(pattern) {
    const R = P10.rules || {};
    return {
      rules: (pattern && R.byPattern && R.byPattern[pattern.id]) || [],
      detect: pattern ? (R.detect && R.detect[pattern.id]) || (pattern.detector ? safeRegexTest(pattern.detector) : null) : null
    };
  }
  function safeRegexTest(src) {
    try { const re = new RegExp(src, 'i'); return (ctx) => re.test(ctx.str); } catch (e) { return null; }
  }

  function makeCtx(full, target) {
    return { tokens: full.tokens, str: full.tokens.join(' '), words: full.words, src: full.src, target: target ? target.tokens : null, V };
  }

  function emptyResult(status, extra) {
    return Object.assign({ status, matched: null, tags: [], notes: [], primary: null, variation: false, closest: null, dist: 0, ratio: 0, patternUsed: null, marks: { user: [], target: [] } }, extra || {});
  }

  /* judge({answer, ex:{en,acc,swapIf}, overrides, pattern, inputType, confidence}) */
  E.judge = function (o) {
    const ex = o.ex;
    const full = tokenizeFull(o.answer);
    if (!full.tokens.length) return emptyResult('incorrect', { empty: true, closest: o.ex.en, userWords: [], targetWords: E.displayWords(o.ex.en) });

    const cands = E.candidates(ex, o.overrides);
    const ukeys = new Set(variantsOf(full).map((v) => v.join(' ')));
    // Layer 2：已知答案
    for (const c of cands) {
      for (const k of ukeys) {
        if (c.keys.has(k)) {
          return emptyResult(c.kind === 'target' ? 'correct' : 'acceptable', { matched: c.kind, closest: c.text, patternUsed: true });
        }
      }
    }
    // Layer 3：診斷
    const u = full.tokens;
    let best = null;
    for (const c of cands) {
      if (Math.abs(c.tokens.length - u.length) > 8) continue;
      const a = E.align(u, c.tokens);
      const r = a.dist / Math.max(u.length, c.tokens.length, 1);
      if (!best || a.dist < best.dist - 1e-9 || (Math.abs(a.dist - best.dist) < 1e-9 && c.kind === 'target' && best.cand.kind !== 'target')) best = { cand: c, dist: a.dist, ops: a.ops, ratio: r };
    }
    if (!best) best = { cand: cands[0], dist: 99, ops: [], ratio: 1 };

    const pat = rulesFor(o.pattern);
    const ctx = makeCtx(full, best.cand.full);
    ctx.ops = best.ops;
    let patternUsed = null;
    if (pat.detect) { try { patternUsed = !!pat.detect(ctx); } catch (e) { patternUsed = null; } }

    // 句型專屬規則（優先）
    const notes = [];
    pat.rules.forEach((rule) => {
      let hit = null;
      try { hit = rule.test(ctx); } catch (e) { hit = null; }
      if (hit) notes.push({ tag: rule.tag, text: typeof rule.msg === 'function' ? rule.msg(hit) : rule.msg, ui: hit.ui || [], ci: [], rule: true });
    });
    // 逐字差異
    best.ops.filter((op) => op.t !== 'eq').forEach((op) => { const n = opNote(op); if (n) notes.push(n); });
    // 通用規則
    E.subjectVerbIssues(u).forEach((n) => { if (!notes.some((x) => x.tag === 'SUBJECT_VERB' && x.ui.some((i) => n.ui.indexOf(i) >= 0))) notes.push(n); });

    // 完全沒用到這個句型：直接告訴使用者「這題要用什麼句型」，其餘逐字差異多半只是雜訊
    if (patternUsed === false && !notes.some((n) => n.tag === 'PATTERN_NOT_USED')) {
      const label = o.pattern && (o.pattern.short || o.pattern.template);
      notes.unshift({ tag: 'PATTERN_NOT_USED', text: '這題要練的句型是 ' + (label || '指定的句型'), ui: [], ci: [], rule: true });
    }

    // 專屬規則已經說明的，就不重複列出較籠統的同類（避免同一個錯誤被記兩次）
    const dropTags = new Set();
    notes.filter((n) => n.rule).forEach((n) => (SPECIALIZES[n.tag] || []).forEach((t) => dropTags.add(t)));
    const ruleUi = new Set();
    notes.filter((n) => n.rule).forEach((n) => (n.ui || []).forEach((i) => ruleUi.add(i)));
    const patNotUsed = notes.some((n) => n.rule && n.tag === 'PATTERN_NOT_USED');
    let finalNotes = notes.filter((n) => {
      if (n.rule) return true;
      if (patNotUsed) return false;
      if (dropTags.has(n.tag) && n.tag !== 'SPELLING') return false;
      if ((n.ui || []).some((i) => ruleUi.has(i))) return false;
      return true;
    });
    // 同一個 token 只留一則
    const used = new Set();
    finalNotes = finalNotes.filter((n) => {
      if (n.rule) return true;
      const keys = (n.ui || []).map((i) => 'u' + i);
      if (keys.length && keys.some((k) => used.has(k))) return false;
      keys.forEach((k) => used.add(k));
      return true;
    });
    finalNotes.sort((a, b) => (b.rule ? 1 : 0) - (a.rule ? 1 : 0) || PRIORITY.indexOf(a.tag) - PRIORITY.indexOf(b.tag));

    const tags = [];
    finalNotes.forEach((n) => { if (tags.indexOf(n.tag) < 0) tags.push(n.tag); });

    // 狀態
    const sigNotes = finalNotes.filter((n) => n.tag !== 'SPELLING');
    let status;
    const onlySpelling = finalNotes.length > 0 && sigNotes.length === 0;
    if (patternUsed === false) status = 'incorrect';
    else if (onlySpelling) status = 'partial';
    else if (best.dist <= 2.01 || best.ratio <= 0.34) status = 'partial';
    else if (best.ratio <= 0.5 && patternUsed === true) status = 'partial';
    else status = 'incorrect';
    if (!finalNotes.length && patternUsed !== false) status = 'partial';   // 找不到明確差異，保守處理

    // 語音：不能因為辨識問題處罰使用者
    if (o.inputType === 'voice' && (status === 'partial' || status === 'incorrect')) {
      const lowConf = o.confidence != null && o.confidence < 0.55;
      const minor = finalNotes.length > 0 && finalNotes.every((n) => ['ARTICLE', 'SPELLING', 'PLURAL', 'WORD_EXTRA'].indexOf(n.tag) >= 0 && best.dist <= 2.01);
      const homo = best.ops.filter((op) => op.t !== 'eq').length > 0 && best.ops.filter((op) => op.t !== 'eq').every((op) => op.t === 'sub' && isHomo(op.u, op.c));
      if (lowConf || minor || homo) status = 'stt_uncertain';
    }

    /* 「可能只是說法不同」：差異只有 名詞單複數＋冠詞成對互換（a book ↔ books）、換了實詞、多了字，而且沒有觸發任何文法規則。
     * 這種差異系統分不出對錯（它不懂中文，也沒收錄這個說法），所以：不當成文法錯誤記錄、提醒使用者可以自己認定。
     * 只缺冠詞、或只有單複數錯誤，通常是真的錯，不算在內。 */
    const VARIATION = new Set(['ARTICLE', 'PLURAL', 'MEANING_CHANGED', 'WORD_EXTRA']);
    const tagSet = new Set(finalNotes.map((n) => n.tag));
    const variation = (status === 'partial' || status === 'incorrect') && patternUsed !== false && finalNotes.length > 0 &&
      finalNotes.every((n) => !n.rule && VARIATION.has(n.tag)) && tagSet.has('ARTICLE') === tagSet.has('PLURAL');

    // 標示用：哪些「原文字」要標出來
    const mu = new Set(), mt = new Set();
    finalNotes.forEach((n) => {
      (n.ui || []).forEach((i) => { if (full.src[i] != null) mu.add(full.src[i]); });
      (n.ci || []).forEach((i) => { const s = best.cand.full.src[i]; if (s != null) mt.add(s); });
    });

    return {
      status, matched: null, tags, notes: finalNotes, primary: finalNotes[0] || null, variation,
      closest: best.cand.text, dist: best.dist, ratio: best.ratio, patternUsed,
      marks: { user: [...mu].sort((a, b) => a - b), target: [...mt].sort((a, b) => a - b) },
      userWords: full.words, targetWords: best.cand.full.words
    };
  };

  /* ------------------------------------------------------------------ 自由生成（Stage 7） */
  E.judgeFree = function (o) {
    const full = tokenizeFull(o.answer);
    const pattern = o.pattern;
    if (full.tokens.length < 3) return emptyResult('incorrect', { empty: full.tokens.length === 0, tags: ['WORD_MISSING'], notes: [{ tag: 'WORD_MISSING', text: '再多寫一點，寫成一句完整的話', ui: [], ci: [] }] });
    const pat = rulesFor(pattern);
    const ctx = makeCtx(full, null);
    let patternUsed = true;
    if (pat.detect) { try { patternUsed = !!pat.detect(ctx); } catch (e) { patternUsed = true; } }
    const notes = [];
    pat.rules.forEach((rule) => {
      if (rule.free === false) return;
      let hit = null; try { hit = rule.test(ctx); } catch (e) { hit = null; }
      if (hit) notes.push({ tag: rule.tag, text: typeof rule.msg === 'function' ? rule.msg(hit) : rule.msg, ui: hit.ui || [], ci: [], rule: true });
    });
    E.subjectVerbIssues(full.tokens).forEach((n) => notes.push(n));
    const known = new Set((o.known || []).map((s) => E.normalize(s)));
    const novel = !known.has(full.tokens.join(' '));
    const tags = [];
    notes.forEach((n) => { if (tags.indexOf(n.tag) < 0) tags.push(n.tag); });
    let status = 'correct';
    if (!patternUsed) {
      status = 'incorrect';
      if (tags.indexOf('PATTERN_NOT_USED') < 0) {
        tags.unshift('PATTERN_NOT_USED');
        notes.unshift({ tag: 'PATTERN_NOT_USED', text: '這題要練的句型是 ' + ((pattern && (pattern.short || pattern.template)) || '指定的句型'), ui: [], ci: [], rule: true });
      }
    }
    else if (notes.length) status = 'partial';
    else if (!novel) status = 'partial';
    const mu = new Set();
    notes.forEach((n) => (n.ui || []).forEach((i) => { if (full.src[i] != null) mu.add(full.src[i]); }));
    return { status, tags, notes, primary: notes[0] || null, patternUsed, novel, matched: null, closest: null, dist: 0, ratio: 0, marks: { user: [...mu], target: [] }, userWords: full.words };
  };

  /* ------------------------------------------------------------------ 暗記（遮字）輔助 */
  E.displayWords = (sentence) => String(sentence).trim().split(/\s+/);
  /* 回傳每個字：{w, blank} */
  E.clozeParts = function (sentence, blankIdx) {
    const set = new Set(blankIdx);
    return E.displayWords(sentence).map((w, i) => ({ w, blank: set.has(i), i }));
  };
  const stripPunct = (w) => w.replace(/[.,!?;:]+$/g, '');
  E.blankAnswer = (w) => stripPunct(w);
  /* 把使用者填的空格塞回句子 */
  E.clozeAssemble = function (sentence, blankIdx, fills) {
    const words = E.displayWords(sentence);
    let k = 0;
    return words.map((w, i) => {
      if (blankIdx.indexOf(i) < 0) return w;
      return (fills[k++] || '').trim();
    }).join(' ').replace(/\s+/g, ' ').trim();
  };
  /* 每個空格是否正確 */
  E.clozeCheck = function (sentence, blankIdx, fills) {
    const words = E.displayWords(sentence);
    return blankIdx.map((wi, k) => E.normalize(stripPunct(words[wi])) === E.normalize(fills[k] || ''));
  };
  /* 提示：每個字只露出第一個字母 */
  E.hintSkeleton = function (sentence, keepFirst) {
    const words = E.displayWords(sentence);
    return words.map((w, i) => {
      const core = stripPunct(w), tail = w.slice(core.length);
      if (keepFirst && i === 0) return w;
      return core[0] + '_'.repeat(Math.max(core.length - 1, 1)) + tail;
    }).join(' ');
  };
  E.blankSkeleton = function (sentence) {
    return E.displayWords(sentence).map((w) => '___' + w.slice(stripPunct(w).length)).join(' ');
  };

  E.ARTICLES = ARTICLES;
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
