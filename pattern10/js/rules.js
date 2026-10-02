/* Pattern 10 — 各句型的「典型錯誤」規則與句型偵測器
 * 規則只在答案「不是已知答案」時才會執行（見 engine.judge）。
 * 規則回傳 null（沒中）或 { ui:[token 位置], ...給訊息函式的資料 }。
 * 原則：寧可少說，不亂說——沒把握就交給通用的逐字差異診斷。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const V = P10.verbs;
  const R = (P10.rules = { byPattern: {}, detect: {} });

  /* 同形的名詞／動詞：遇到時不武斷當成動詞 */
  const NOUNISH = new Set(['work', 'drink', 'start', 'rest', 'plan', 'test', 'study', 'trip', 'call', 'visit', 'show', 'walk', 'play', 'cook',
    'change', 'order', 'practice', 'travel', 'move', 'review', 'watch', 'dance', 'help', 'rain', 'snow', 'smoke', 'shop', 'park', 'train',
    'answer', 'reply', 'return', 'record', 'rent', 'save', 'hope', 'wish', 'look', 'sound', 'taste', 'touch', 'use', 'mind', 'face', 'point',
    'pass', 'stop', 'turn', 'wait', 'jump', 'push', 'pull', 'fix', 'guess', 'cost', 'set', 'hit', 'cut', 'let', 'read', 'run', 'ride', 'drive',
    'fall', 'win', 'rise', 'lead', 'ring', 'fight', 'feed', 'dream', 'smell', 'meet', 'swim', 'fly', 'sleep', 'bite', 'blow', 'hang', 'lay', 'lie']);
  const MOD_PRES = new Set(['can', 'will', 'shall', 'may']);
  const PAST_MODALS = new Set(['could', 'would', 'might', 'should']);
  const SUBJ = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);

  const tick = (s) => '「' + s + '」';

  /* ---------------------------------------------------------------- P01  I usually … before … */
  R.byPattern.P01 = [
    {
      tag: 'TENSE', msg: 'before 後面講的是習慣，用現在式（before I start），不用 will。',
      test(c) { const t = c.tokens, k = t.indexOf('before'); if (k < 0) return null; const w = t.indexOf('will', k + 1); return w >= 0 ? { ui: [w] } : null; }
    },
    {
      tag: 'TENSE', msg: 'before I 後面直接接動詞（before I start），不加 -ing。',
      test(c) { const t = c.tokens, k = t.indexOf('before'); if (k < 0 || !SUBJ.has(t[k + 1])) return null; const w = t[k + 2]; return w && V.isIng(w) && !V.isBase(w) ? { ui: [k + 2] } : null; }
    },
    {
      tag: 'WORD_MISSING', msg: 'before 後面要有主詞：before I start（也可以改成 before starting）。',
      test(c) {
        const t = c.tokens, k = t.indexOf('before'); if (k < 0 || k + 2 >= t.length) return null;
        const w = t[k + 1], n = t[k + 2];
        if (V.isBase(w) && !V.isThirdS(w) && !V.isPast(w) && !(V.isThirdS(n) || V.isPast(n))) return { ui: [k + 1] };
        return null;
      }
    },
    {
      tag: 'AUXILIARY', msg: '說習慣用現在簡單式，不用 be 動詞：I usually drink（不是 I am usually drink）。',
      test(c) { const t = c.tokens; for (let i = 0; i + 2 < t.length; i++) if (['am', 'is', 'are'].includes(t[i]) && ['usually', 'always', 'often', 'normally'].includes(t[i + 1]) && V.isBase(t[i + 2]) && !V.isIng(t[i + 2])) return { ui: [i] }; return null; }
    }
  ];
  R.detect.P01 = (c) => /\b(usually|always|often|normally|generally|typically|sometimes|seldom|rarely|never)\b/.test(c.str) && /\bbefore\b/.test(c.str);

  /* ---------------------------------------------------------------- P02  I used to … but now … */
  R.byPattern.P02 = [
    {
      tag: 'TENSE', msg: 'used to 後面直接接原形動詞（used to stay），不加 -ed、也不用過去式。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if (t[k] === 'used' && t[k + 1] === 'to' && V.isPastOnly(t[k + 2])) return { ui: [k + 2] }; return null; }
    },
    {
      tag: 'GERUND_INFINITIVE', msg: '「以前常常」是 used to ＋原形動詞（used to stay）；used to ＋ -ing 是另一個意思（習慣於）。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if (t[k] === 'used' && t[k + 1] === 'to' && V.isIng(t[k + 2]) && !V.isBase(t[k + 2]) && !['am', 'is', 'are', 'was', 'were'].includes(t[k - 1])) return { ui: [k + 2] }; return null; }
    },
    {
      tag: 'MEANING_CHANGED', msg: 'am / was used to 是「習慣於」的意思；要說「以前常常」，用 I used to ＋原形動詞。',
      test(c) { const t = c.tokens; for (let k = 1; k + 1 < t.length; k++) if (t[k] === 'used' && t[k + 1] === 'to' && ['am', 'is', 'are', 'was', 'were'].includes(t[k - 1])) return { ui: [k - 1, k] }; return null; }
    },
    {
      tag: 'TENSE', msg: '要寫 used to（used 有 d），表示「以前常常」。',
      test(c) { const t = c.tokens; for (let k = 0; k + 1 < t.length; k++) if (t[k] === 'use' && t[k + 1] === 'to' && !['did', 'not'].includes(t[k - 1])) return { ui: [k] }; return null; }
    },
    {
      tag: 'TENSE', msg: 'but now 說的是「現在」，動詞用現在式（but now I go）。',
      test(c) {
        const t = c.tokens, k = t.indexOf('now'); if (k < 0) return null;
        for (let j = k + 1; j < Math.min(t.length, k + 4); j++) { if (V.isPastOnly(t[j]) && t[j] !== 'used') return { ui: [j] }; if (V.isVerb(t[j]) && !NOUNISH.has(t[j])) return null; }
        return null;
      }
    }
  ];
  R.detect.P02 = (c) => /\bused? to\b/.test(c.str);

  /* ---------------------------------------------------------------- P03  I've never … before */
  R.byPattern.P03 = [
    {
      tag: 'TENSE', msg: '「從來沒有…過」要用 have never ＋過去分詞（I have never tried）。',
      test(c) { const t = c.tokens, k = t.indexOf('never'); if (k < 0) return null; return t.slice(0, k).some((w) => w === 'have' || w === 'has' || w === 'had') ? null : { ui: [k] }; }
    },
    {
      tag: 'TENSE', msg: 'have never 後面要接「過去分詞」（tried / been / seen / eaten），不是原形或一般過去式。',
      test(c) {
        const t = c.tokens, k = t.indexOf('never'); if (k < 0) return null;
        if (!t.slice(0, k).some((w) => w === 'have' || w === 'has' || w === 'had')) return null;
        const w = t[k + 1];
        if (w && V.isVerb(w) && !V.isPP(w) && !MOD_PRES.has(w)) return { ui: [k + 1] };
        return null;
      }
    }
  ];
  R.detect.P03 = (c) => /\bnever\b/.test(c.str);

  /* ---------------------------------------------------------------- P04  If …, I'll … */
  function ifWill(c) {
    const t = c.tokens, k = t.indexOf('if'); if (k < 0) return null;
    for (let j = k + 1; j < Math.min(t.length, k + 5); j++) {
      if (t[j] === 'will') return { ui: [j] };
      if (V.isVerb(t[j]) && !NOUNISH.has(t[j])) return null;
    }
    return null;
  }
  function ifPast(c) {
    const t = c.tokens, k = t.indexOf('if'); if (k < 0 || !t.includes('will')) return null;
    for (let j = k + 1; j < Math.min(t.length, k + 6); j++) {
      const w = t[j];
      if (w === 'will') return null;
      if (V.isPastOnly(w)) return { ui: [j] };
      if (V.isVerb(w) && !NOUNISH.has(w)) return null;
    }
    return null;
  }
  R.byPattern.P04 = [
    { tag: 'CONDITIONAL', msg: 'if 後面講「可能發生的事」用現在式（If I have time），不用 will；主句才用 will。', test: ifWill },
    { tag: 'CONDITIONAL', msg: 'if 後面用現在式（If I have time），不是過去式；主句用 will 說「之後會做什麼」。', test: ifPast },
    {
      tag: 'CONDITIONAL', msg: '主句要用 will（I\'ll …），說「之後會做什麼」。',
      test(c) { const t = c.tokens; if (!t.includes('if')) return null; if (t.includes('will') || t.some((w) => ['can', 'may', 'might', 'could', 'would', 'should'].includes(w))) return null; return { ui: [] }; }
    }
  ];
  R.detect.P04 = (c) => /\bif\b/.test(c.str);

  /* ---------------------------------------------------------------- P05  I wish … */
  function wishPresent(c) {
    const t = c.tokens, k = t.indexOf('wish'); if (k < 0) return null;
    for (let j = k + 1; j < Math.min(t.length, k + 8); j++) {
      const w = t[j];
      if (w === 'not' || w === 'never') continue;
      if (PAST_MODALS.has(w) || V.isPastOnly(w)) return null;
      if (!V.isVerb(w)) continue;
      if (NOUNISH.has(w) && !V.BE_SET.has(w)) continue;
      if (MOD_PRES.has(w) || V.isPresentOnly(w)) return { ui: [j], from: w, to: V.pastOf(w) };
      return null;
    }
    return null;
  }
  R.byPattern.P05 = [
    {
      tag: 'WISH_REALITY',
      msg: (h) => 'wish 後面是「跟現實不同」的願望，動詞要退一格用過去式' + (h && h.to ? '：' + tick(h.from) + ' → ' + tick(h.to) : '') + '。',
      test: wishPresent
    }
  ];
  R.detect.P05 = (c) => /\bwish(es)?\b/.test(c.str);

  /* ---------------------------------------------------------------- P06  It took me … to … */
  R.byPattern.P06 = [
    {
      tag: 'TENSE', msg: '事情已經做完了，用過去式 took（It took me …），不是 takes。',
      test(c) { const t = c.tokens, k = t.indexOf('takes'); return k >= 0 && t[k - 1] === 'it' ? { ui: [k] } : null; }
    },
    {
      tag: 'GERUND_INFINITIVE', msg: 'It took me … to 後面接原形動詞（to finish），不是 -ing。',
      test(c) {
        const t = c.tokens, k = t.indexOf('took'); if (k < 0) return null;
        const j = t.indexOf('to', k); if (j < 0) return null;
        const w = t[j + 1];
        return w && V.isIng(w) && !V.isBase(w) ? { ui: [j + 1] } : null;
      }
    },
    {
      tag: 'PREPOSITION', msg: '時間前面不用 for：It took me two hours（不是 took me for two hours）。',
      test(c) { const t = c.tokens, k = t.indexOf('took'); return k >= 0 && (t[k + 2] === 'for' || t[k + 1] === 'for') ? { ui: [t[k + 1] === 'for' ? k + 1 : k + 2] } : null; }
    },
    {
      tag: 'PATTERN_NOT_USED', msg: '這個句型要用 It took me ＋時間＋ to …（「花了…時間做某事」），不是 spent / cost。',
      test(c) { const t = c.tokens; const k = t.findIndex((w) => w === 'spent' || w === 'spend' || w === 'cost' || w === 'costs'); return k >= 0 ? { ui: [k] } : null; }
    }
  ];
  R.detect.P06 = (c) => /\bit (took|takes)\b/.test(c.str);

  /* ---------------------------------------------------------------- P07  The reason … is that … */
  R.byPattern.P07 = [
    {
      tag: 'CONJUNCTION', msg: 'The reason … is that …：reason 本身就是「原因」，後面接 that，不再用 because。',
      test(c) { const t = c.tokens, k = t.indexOf('reason'); if (k < 0) return null; const b = t.indexOf('because', k); return b >= 0 ? { ui: [b] } : null; }
    },
    {
      tag: 'CONJUNCTION', msg: '這個句型的中間不能少了 is that：The reason … is that …。',
      test(c) {
        const s = c.str; if (!/\breason\b/.test(s)) return null;
        if (/\b(is|was|are|were) that\b/.test(s) || /\bbecause\b/.test(s)) return null;
        return { ui: [] };
      }
    }
  ];
  R.detect.P07 = (c) => /\bthe reason\b/.test(c.str);

  /* ---------------------------------------------------------------- P08  I'm not sure whether … */
  const QAUX = new Set(['will', 'can', 'do', 'does', 'did', 'is', 'are', 'was', 'were', 'should', 'would', 'could', 'have', 'has']);
  R.byPattern.P08 = [
    {
      tag: 'WORD_ORDER', msg: 'whether 後面接一般句子的順序（he will come），不是問句的順序（will he come）。',
      test(c) {
        const t = c.tokens;
        for (let k = 0; k + 2 < t.length; k++) if ((t[k] === 'whether' || t[k] === 'if') && QAUX.has(t[k + 1]) && SUBJ.has(t[k + 2])) return { ui: [k + 1, k + 2] };
        return null;
      }
    },
    {
      tag: 'AUXILIARY', msg: 'sure 是形容詞，前面要用 be 動詞：I\'m not sure（不是 I don\'t sure）。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if ((t[k] === 'do' || t[k] === 'does') && t[k + 1] === 'not' && t[k + 2] === 'sure') return { ui: [k] }; return null; }
    },
    {
      tag: 'CONJUNCTION', msg: '「會不會／是不是」要用 whether（或 if），不是 that。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if (t[k] === 'not' && t[k + 1] === 'sure' && t[k + 2] === 'that') return { ui: [k + 2] }; return null; }
    },
    {
      tag: 'CONJUNCTION', msg: '要表達「會不會」，要加上 whether（或 if）。',
      test(c) { const s = c.str; return /\bnot sure\b/.test(s) && !/\b(whether|if)\b/.test(s) && !/\bnot sure that\b/.test(s) ? { ui: [] } : null; }
    }
  ];
  R.detect.P08 = (c) => /\bnot sure\b/.test(c.str);

  /* ---------------------------------------------------------------- P09  I'd rather A than B */
  R.byPattern.P09 = [
    {
      tag: 'GERUND_INFINITIVE', msg: 'would rather 後面直接接原形動詞，不加 to（I\'d rather stay）。',
      test(c) { const t = c.tokens, k = t.indexOf('rather'); return k >= 0 && t[k + 1] === 'to' ? { ui: [k + 1] } : null; }
    },
    {
      tag: 'GERUND_INFINITIVE', msg: 'would rather 後面用原形動詞（I\'d rather stay），不是 -ing。',
      test(c) { const t = c.tokens, k = t.indexOf('rather'); const w = t[k + 1]; return k >= 0 && w && V.isIng(w) && !V.isBase(w) ? { ui: [k + 1] } : null; }
    },
    {
      tag: 'GERUND_INFINITIVE', msg: 'than 後面的動詞也要用原形（than go），和前面對稱，不加 to、不加 -ing。',
      test(c) {
        const t = c.tokens, k = t.indexOf('than'); if (k < 0) return null;
        const w = t[k + 1];
        if (w === 'to' && V.isBase(t[k + 2])) return { ui: [k + 1] };
        return w && V.isIng(w) && !V.isBase(w) ? { ui: [k + 1] } : null;
      }
    },
    {
      tag: 'AUXILIARY', msg: 'rather 前面要有 would：I\'d rather …（I rather 是不完整的）。',
      test(c) { const t = c.tokens, k = t.indexOf('rather'); return k > 0 && !['would', 'had'].includes(t[k - 1]) && t[k - 1] !== 'or' ? { ui: [k] } : null; }
    }
  ];
  R.detect.P09 = (c) => /\brather\b/.test(c.str);

  /* ---------------------------------------------------------------- P10  I'm looking forward to … */
  R.byPattern.P10 = [
    {
      tag: 'GERUND_INFINITIVE', msg: 'looking forward to 的 to 是介系詞，後面接名詞或 -ing（seeing），不接原形動詞。',
      test(c) {
        const t = c.tokens;
        for (let k = 0; k + 3 < t.length; k++) if (t[k] === 'forward' && t[k + 1] === 'to') {
          const w = t[k + 2];
          if (V.isBase(w) && !V.isIng(w) && !NOUNISH.has(w) && !V.isThirdS(w) && !V.isPast(w)) return { ui: [k + 2] };
        }
        return null;
      }
    },
    {
      tag: 'PREPOSITION', msg: '要說 look forward to，to 不能少（也不是 for）。',
      test(c) { const t = c.tokens; for (let k = 0; k + 1 < t.length; k++) if (t[k] === 'forward' && t[k + 1] !== 'to') return { ui: [k + 1] }; return null; }
    }
  ];
  R.detect.P10 = (c) => /\blook(s|ing)? forward\b/.test(c.str);

  R.NOUNISH = NOUNISH;
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
