/* Pattern 10 — 第 2 章（P11–P20）日常開口說：典型錯誤規則與句型偵測器
 * 寫法同 rules_ch1.js：規則只在答案「不是已知答案」時才會執行；沒把握就不說話，交給通用的逐字差異診斷。
 * free:false 的規則要看標準答案（c.target），自由造句沒有標準答案，所以不執行。
 */
(function (g) {
  'use strict';
  const P10 = g.P10;
  const V = P10.verbs;
  const R = P10.rules;
  const { NOUNISH, SUBJ, MODALS, DET, OBJ, AFTER_VERB, verbAt, sureVerb } = R.util;

  const BE_ANY = new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been']);
  const HAVE = new Set(['have', 'has', 'had']);
  const isIngOnly = (w) => !!w && V.isIng(w) && !V.isBase(w);
  const isPastOnly = (w) => !!w && V.isPast(w) && !V.isBase(w) && !V.isPP(w);   // went / took（不含 put / read 這種同形字）
  const isPastForm = (w) => !!w && V.isPast(w) && !V.isBase(w);                  // opened / went
  const isSForm = (w) => !!w && V.isThirdS(w) && !V.isBase(w) && !V.BE_SET.has(w);
  const nounLike = (w) => NOUNISH.has(V.lemmaOf(w));                               // drinks / calls：也可能是名詞（複數），不亂說
  /* t[j] 之後如果是「結尾」或「受詞／介系詞／副詞」，才把 -ing 當成動詞（避開 swimming class 這類名詞用法） */
  const ingAsVerb = (t, j) => isIngOnly(t[j]) && (j + 1 >= t.length || DET.has(t[j + 1]) || OBJ.has(t[j + 1]) || AFTER_VERB.has(t[j + 1]));

  /* ---------------------------------------------------------------- P11  Could you …, please? */
  const REQ = new Set(['could', 'can', 'would', 'will']);
  function reqVerb(t) {                       // 「Could you」後面（略過 please）第一個字的位置，找不到回傳 -1
    for (let k = 0; k + 2 < t.length; k++) if (REQ.has(t[k]) && t[k + 1] === 'you') { let j = k + 2; while (t[j] === 'please' || t[j] === 'just') j++; return j < t.length ? j : -1; }
    return -1;
  }
  R.byPattern.P11 = [
    { tag: 'GERUND_INFINITIVE', msg: 'Could you 後面直接接原形動詞，不加 to（Could you open …）。', test(c) { const j = reqVerb(c.tokens); return j >= 0 && c.tokens[j] === 'to' ? { ui: [j] } : null; } },
    { tag: 'GERUND_INFINITIVE', msg: 'Could you 後面要用原形動詞（open），不是 -ing。', test(c) { const j = reqVerb(c.tokens); return j >= 0 && isIngOnly(c.tokens[j]) ? { ui: [j] } : null; } },
    { tag: 'TENSE', msg: 'Could you 後面用原形動詞（open），不用過去式。', test(c) { const j = reqVerb(c.tokens); return j >= 0 && isPastForm(c.tokens[j]) ? { ui: [j] } : null; } },
    { tag: 'SUBJECT_VERB', msg: 'Could you 後面的動詞不加 s（Could you open），因為 could 已經帶了時態。', test(c) { const j = reqVerb(c.tokens); return j >= 0 && isSForm(c.tokens[j]) ? { ui: [j] } : null; } }
  ];
  R.detect.P11 = (c) => /\b(could|can|would|will) you\b/.test(c.str);

  /* ---------------------------------------------------------------- P12  I'd like … */
  const wouldLike = (t) => { for (let k = 0; k + 1 < t.length; k++) if (t[k] === 'would' && t[k + 1] === 'like') return k; return -1; };
  R.byPattern.P12 = [
    { tag: 'PREPOSITION', msg: 'I\'d like 後面接名詞時，直接接（I\'d like a table），不加 to；接動詞才加 to。', test(c) { const t = c.tokens, k = wouldLike(t); return k >= 0 && t[k + 2] === 'to' && DET.has(t[k + 3]) ? { ui: [k + 2] } : null; } },
    { tag: 'GERUND_INFINITIVE', msg: 'I\'d like 後面接動詞時要加 to（I\'d like to book …）。', test(c) { const t = c.tokens, k = wouldLike(t); return k >= 0 && verbAt(t, k + 2) ? { ui: [k + 2] } : null; } },
    { tag: 'GERUND_INFINITIVE', msg: 'I\'d like to 後面用「原形動詞」（to book），不是 -ing。', test(c) { const t = c.tokens, k = wouldLike(t); if (k < 0) return null; const j = t[k + 2] === 'to' ? k + 3 : k + 2; return ingAsVerb(t, j) ? { ui: [j] } : null; } },
    { tag: 'GERUND_INFINITIVE', msg: 'I\'d like to 後面用原形動詞（to book），不加 -ed / -s。', test(c) { const t = c.tokens, k = wouldLike(t); return k >= 0 && t[k + 2] === 'to' && (isPastForm(t[k + 3]) || isSForm(t[k + 3])) ? { ui: [k + 3] } : null; } },
    {
      tag: 'PATTERN_NOT_USED', msg: 'I want … 聽起來很直接。點餐或請求時，用 I\'d like …（I would like …）比較客氣。',
      test(c) { const t = c.tokens; if (wouldLike(t) >= 0) return null; const k = t.findIndex((w, i) => w === 'want' && SUBJ.has(t[i - 1])); return k >= 0 ? { ui: [k] } : null; }
    }
  ];
  R.detect.P12 = (c) => /\bwould like\b/.test(c.str);

  /* ---------------------------------------------------------------- P13  I have to … */
  const afterTo = (t, k) => (t[k + 1] === 'to' ? k + 2 : -1);              // have/has/had 的 k → to 後面那個字的位置
  const PAST_TIME = /\b(yesterday|ago|last (night|week|month|year|weekend|time|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/;
  R.byPattern.P13 = [
    {
      tag: 'WORD_MISSING', msg: 'have to 的 to 不能漏：I have to go（「必須」是 have to ＋原形動詞）。',
      test(c) { const t = c.tokens; for (let k = 0; k + 1 < t.length; k++) if (HAVE.has(t[k]) && sureVerb(t[k + 1]) && t[k - 1] !== 'to' && !MODALS.has(t[k - 1])) return { ui: [k + 1] }; return null; }
    },
    { tag: 'GERUND_INFINITIVE', msg: 'must 後面直接接原形動詞，不加 to（I must go）。', test(c) { const t = c.tokens, k = t.indexOf('must'); return k >= 0 && t[k + 1] === 'to' ? { ui: [k + 1] } : null; } },
    {
      tag: 'GERUND_INFINITIVE', msg: 'have to 後面接原形動詞（have to go），不是 -ing。',
      test(c) { const t = c.tokens; for (let k = 0; k < t.length; k++) if (HAVE.has(t[k])) { const j = afterTo(t, k); if (j >= 0 && isIngOnly(t[j])) return { ui: [j] }; } return null; }
    },
    {
      tag: 'TENSE', msg: 'to 後面的動詞一律用原形（have to go）；過去的事是把 have 改成 had（had to go）。',
      test(c) { const t = c.tokens; for (let k = 0; k < t.length; k++) if (HAVE.has(t[k])) { const j = afterTo(t, k); if (j >= 0 && isPastForm(t[j])) return { ui: [j] }; } return null; }
    },
    {
      tag: 'SUBJECT_VERB', msg: 'to 後面的動詞不加 s（has to go，不是 has to goes）。',
      test(c) { const t = c.tokens; for (let k = 0; k < t.length; k++) if (HAVE.has(t[k])) { const j = afterTo(t, k); if (j >= 0 && isSForm(t[j])) return { ui: [j] }; } return null; }
    },
    {
      tag: 'TENSE', msg: '已經過去的事（yesterday / last …）要用 had to。',
      test(c) { if (!PAST_TIME.test(c.str)) return null; const t = c.tokens; for (let k = 0; k + 1 < t.length; k++) if ((t[k] === 'have' || t[k] === 'has') && t[k + 1] === 'to') return { ui: [k] }; return null; }
    },
    {
      tag: 'MEANING_CHANGED', free: false, msg: 'must not 是「不可以」；說「不用、不必」要用 don\'t have to（或 don\'t need to）。',
      test(c) {
        const t = c.tokens, k = t.indexOf('must'); if (k < 0 || t[k + 1] !== 'not' || !c.target) return null;
        const tg = c.target; return tg.includes('have') || tg.includes('has') || tg.includes('need') || tg.includes('needs') ? (tg.includes('not') ? { ui: [k] } : null) : null;
      }
    }
  ];
  R.detect.P13 = (c) => /\b(have|has|had) to\b|\bneeds? to\b|\bmust\b|\bhave got to\b/.test(c.str) || c.tokens.some((w, k) => HAVE.has(w) && sureVerb(c.tokens[k + 1]));

  /* ---------------------------------------------------------------- P14  I'm going to … */
  R.byPattern.P14 = [
    {
      tag: 'AUXILIARY', msg: 'going to 前面要有 be 動詞：I\'m going to …（I am / he is / they are），不能只寫 going to。',
      test(c) { const t = c.tokens; for (let k = 1; k + 2 < t.length; k++) if (t[k] === 'going' && t[k + 1] === 'to' && verbAt(t, k + 2, true) && !t.slice(Math.max(0, k - 3), k).some((w) => BE_ANY.has(w)) && t[k - 1] !== 'will') return { ui: [k] }; return null; }
    },
    {
      tag: 'GERUND_INFINITIVE', msg: 'be 動詞後面要用 going（I\'m going to …），不是 go。',
      test(c) { const t = c.tokens; for (let k = 0; k + 3 < t.length; k++) if (['am', 'is', 'are'].includes(t[k]) && t[k + 1] === 'go' && t[k + 2] === 'to' && verbAt(t, k + 3, true)) return { ui: [k + 1] }; return null; }
    },
    {
      tag: 'WORD_MISSING', msg: 'going to 的 to 不能漏：I\'m going to visit …',
      test(c) { const t = c.tokens; for (let k = 1; k + 1 < t.length; k++) if (t[k] === 'going' && sureVerb(t[k + 1]) && t.slice(Math.max(0, k - 3), k).some((w) => BE_ANY.has(w))) return { ui: [k + 1] }; return null; }
    },
    {
      tag: 'GERUND_INFINITIVE', msg: 'going to 後面接原形動詞（going to visit），不是 -ing。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if (t[k] === 'going' && t[k + 1] === 'to' && ingAsVerb(t, k + 2)) return { ui: [k + 2] }; return null; }
    },
    {
      tag: 'GERUND_INFINITIVE', msg: 'going to 後面用原形動詞（going to visit），不加 -ed / -s。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if (t[k] === 'going' && t[k + 1] === 'to' && (isPastForm(t[k + 2]) || isSForm(t[k + 2]))) return { ui: [k + 2] }; return null; }
    },
    { tag: 'AUXILIARY', msg: 'will 和 going to 不能一起用；說計畫用 I\'m going to …，或用 I\'ll …，選一個就好。', test(c) { const t = c.tokens; for (let k = 0; k + 1 < t.length; k++) if (t[k] === 'will' && t[k + 1] === 'going') return { ui: [k] }; return null; } }
  ];
  R.detect.P14 = (c) => /\bgoing\b/.test(c.str);

  /* ---------------------------------------------------------------- P15  Thank you for …ing / Sorry for …ing */
  const THANKS = /^(thank|thanks|thanked|sorry|apologize|apologized)$/;
  const forIdx = (t) => { for (let k = 0; k < t.length; k++) if (t[k] === 'for' && t.slice(Math.max(0, k - 4), k).some((w) => THANKS.test(w))) return k; return -1; };
  const ADJ_AFTER_FOR = new Set(['late', 'early', 'rude', 'slow', 'wrong', 'noisy', 'busy', 'angry', 'difficult', 'a']);
  R.byPattern.P15 = [
    { tag: 'GERUND_INFINITIVE', msg: 'for 是介系詞，後面接 -ing（Thank you for helping），不接原形動詞。', test(c) { const t = c.tokens, k = forIdx(t); return k >= 0 && verbAt(t, k + 1) ? { ui: [k + 1] } : null; } },
    { tag: 'GERUND_INFINITIVE', msg: 'for 後面不加 to，直接接 -ing（Thank you for helping）。', test(c) { const t = c.tokens, k = forIdx(t); return k >= 0 && t[k + 1] === 'to' && verbAt(t, k + 2) ? { ui: [k + 1] } : null; } },
    { tag: 'GERUND_INFINITIVE', msg: 'for 後面接 -ing（helping），不是過去式或加 s 的動詞。', test(c) { const t = c.tokens, k = forIdx(t); return k >= 0 && (isPastForm(t[k + 1]) || (isSForm(t[k + 1]) && !nounLike(t[k + 1]))) && !DET.has(t[k + 1]) ? { ui: [k + 1] } : null; } },
    {
      tag: 'PREPOSITION', msg: '感謝「某件事」用 for ＋ -ing（Thank you for helping），不是 to。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if (/^(thank|thanks)$/.test(t[k])) { const j = t[k + 1] === 'you' ? k + 2 : k + 1; if (t[j] === 'to' && verbAt(t, j + 1)) return { ui: [j] }; } return null; }
    },
    {
      tag: 'WORD_MISSING', msg: 'for 後面接形容詞時，前面要加 being（Sorry for being late）。',
      test(c) { const t = c.tokens, k = forIdx(t); return k >= 0 && ADJ_AFTER_FOR.has(t[k + 1]) && t[k + 1] !== 'a' ? { ui: [k + 1] } : null; }
    },
    {
      tag: 'PREPOSITION', msg: '道歉的原因用 for（Sorry for being late），不是 to。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if (t[k] === 'sorry' && t[k + 1] === 'to' && ADJ_AFTER_FOR.has(t[k + 2]) && t[k + 2] !== 'a') return { ui: [k + 1] }; return null; }
    }
  ];
  R.detect.P15 = (c) => /\b(thank|thanks|thanked|sorry|apologize|apologized)\b/.test(c.str);

  /* ---------------------------------------------------------------- P16  How about …ing? */
  const aboutIdx = (t) => { for (let k = 0; k + 1 < t.length; k++) if ((t[k] === 'how' || t[k] === 'what') && t[k + 1] === 'about') return k + 1; return -1; };
  R.byPattern.P16 = [
    { tag: 'GERUND_INFINITIVE', msg: 'How about 後面不加 to，直接接 -ing（How about going …）。', test(c) { const t = c.tokens, k = aboutIdx(t); return k >= 0 && t[k + 1] === 'to' && verbAt(t, k + 2) ? { ui: [k + 1] } : null; } },
    { tag: 'GERUND_INFINITIVE', msg: 'How about 後面接 -ing 或名詞（How about going …），不接原形動詞。', test(c) { const t = c.tokens, k = aboutIdx(t); return k >= 0 && verbAt(t, k + 1) && !SUBJ.has(t[k + 1]) ? { ui: [k + 1] } : null; } },
    { tag: 'GERUND_INFINITIVE', msg: 'How about 後面接 -ing（going），不是過去式或加 s 的動詞。', test(c) { const t = c.tokens, k = aboutIdx(t); return k >= 0 && (isPastForm(t[k + 1]) || (isSForm(t[k + 1]) && !nounLike(t[k + 1]))) && !DET.has(t[k + 1]) ? { ui: [k + 1] } : null; } }
  ];
  R.detect.P16 = (c) => /\b(how|what) about\b|\bwhy do not (we|you|i)\b|\blet us\b/.test(c.str);

  /* ---------------------------------------------------------------- P17  Is there a … near here? */
  const NOT_PLURAL = new Set(['bus', 'gas', 'news', 'lens', 'chess', 'plus', 'canvas', 'atlas', 'this', 'his', 'us', 'yes', 'always', 'perhaps']);
  const QUANT = new Set(['lot', 'few', 'couple', 'bunch', 'number', 'great', 'good', 'large', 'huge']);      // are there a lot of / a few / a couple of … 其實是複數
  const MANY = new Set(['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'many', 'several', 'few']);
  R.byPattern.P17 = [
    {
      tag: 'AUXILIARY', msg: '「有沒有」不是 have。問附近有沒有，用 Is there … / Are there …（不是 Have …）。',
      test(c) { const t = c.tokens; return (t[0] === 'have' || t[0] === 'has') && !t.includes('there') && (DET.has(t[1]) || t[1] === 'any') ? { ui: [0] } : null; }
    },
    {
      tag: 'AUXILIARY', msg: 'there 後面不接 have：Is there a …?（「有」已經包含在 there is 裡了）。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if (t[k] === 'there' && (t[k + 1] === 'have' || t[k + 1] === 'has') && t[k + 2] !== 'been' && t[k + 2] !== 'to') return { ui: [k + 1] }; return null; }
    },
    {
      tag: 'AUXILIARY', msg: '問句不用 do / does：Is there a …?（不是 Does there have …?）。',
      test(c) { const t = c.tokens; for (let k = 0; k + 1 < t.length; k++) if ((t[k] === 'do' || t[k] === 'does') && t[k + 1] === 'there') return { ui: [k] }; return null; }
    },
    {
      tag: 'SUBJECT_VERB', msg: 'a / an 後面是「一個」：Is there a …?；複數才用 Are there any …?。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if ((t[k] === 'are' || t[k] === 'were') && t[k + 1] === 'there' && (t[k + 2] === 'a' || t[k + 2] === 'an') && !QUANT.has(t[k + 3])) return { ui: [k] }; return null; }
    },
    {
      tag: 'SUBJECT_VERB', msg: '後面是複數（兩個以上）：Are there …?，不是 Is there …?。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if ((t[k] === 'is' || t[k] === 'was') && t[k + 1] === 'there' && MANY.has(t[k + 2])) return { ui: [k] }; return null; }
    },
    {
      tag: 'PLURAL', msg: 'there is 後面接「一個」：a bank；說很多個要用 there are（Are there any banks?）。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if ((t[k] === 'is' || t[k] === 'was') && t[k + 1] === 'there' && /[^s]s$/.test(t[k + 2]) && !NOT_PLURAL.has(t[k + 2]) && !V.isVerb(t[k + 2]) && t[k + 2].length > 3) return { ui: [k + 2] }; return null; }
    }
  ];
  R.detect.P17 = (c) => /\bthere\b/.test(c.str);

  /* ---------------------------------------------------------------- P18  This one is cheaper than that one. */
  const COMP = {
    cheap: 'cheaper', big: 'bigger', small: 'smaller', fast: 'faster', slow: 'slower', tall: 'taller', short: 'shorter', old: 'older', young: 'younger',
    new: 'newer', easy: 'easier', hard: 'harder', large: 'larger', close: 'closer', nice: 'nicer', warm: 'warmer', cold: 'colder', hot: 'hotter',
    light: 'lighter', heavy: 'heavier', long: 'longer', high: 'higher', low: 'lower', safe: 'safer', quiet: 'quieter', clean: 'cleaner', busy: 'busier',
    early: 'earlier', late: 'later', cool: 'cooler', near: 'nearer', happy: 'happier', rich: 'richer', strong: 'stronger', weak: 'weaker', dark: 'darker',
    bright: 'brighter', simple: 'simpler', healthy: 'healthier', good: 'better', bad: 'worse'
  };
  const COMP_ER = new Set(Object.values(COMP));
  const LONG_ADJ = ['expensive', 'beautiful', 'interesting', 'important', 'difficult', 'comfortable', 'popular', 'delicious', 'dangerous', 'boring', 'crowded', 'convenient', 'useful', 'famous', 'exciting', 'wonderful', 'careful'];
  const isMoreLess = (w) => w === 'more' || w === 'less';
  R.byPattern.P18 = [
    { tag: 'COMPARATIVE', msg: 'more 和 -er 不能一起用：只說 cheaper（不是 more cheaper）。', test(c) { const t = c.tokens; for (let k = 0; k + 1 < t.length; k++) if (t[k] === 'more' && COMP_ER.has(t[k + 1])) return { ui: [k] }; return null; } },
    {
      tag: 'COMPARATIVE', msg: (h) => '短的形容詞直接加 -er（' + h.to + '），不用 more；長的才用 more（more expensive）。',
      test(c) { const t = c.tokens; if (!t.includes('than') && !t.includes('then')) return null; for (let k = 0; k + 1 < t.length; k++) if (t[k] === 'more' && COMP[t[k + 1]] && t[k + 1] !== 'good' && t[k + 1] !== 'bad') return { ui: [k, k + 1], to: COMP[t[k + 1]] }; return null; }
    },
    {
      tag: 'COMPARATIVE', msg: (h) => '比較兩個東西，形容詞要變成比較級：' + h.from + ' → ' + h.to + '（後面再接 than）。',
      test(c) { const t = c.tokens; for (let k = 1; k < t.length; k++) if (t[k] === 'than' && COMP[t[k - 1]] && !isMoreLess(t[k - 2])) return { ui: [k - 1], from: t[k - 1], to: COMP[t[k - 1]] }; return null; }
    },
    {
      tag: 'COMPARATIVE', msg: '比較的對象前面用 than（不是 then）。',
      test(c) { const t = c.tokens; if (t.includes('than')) return null; for (let k = 1; k < t.length; k++) if (t[k] === 'then' && (COMP_ER.has(t[k - 1]) || (isMoreLess(t[k - 2]) && !V.isBase(t[k - 1])))) return { ui: [k] }; return null; }
    },
    {
      tag: 'COMPARATIVE', msg: '長的形容詞用 more（more expensive），不加 -er。',
      test(c) { const t = c.tokens; for (let k = 0; k < t.length; k++) { const w = t[k]; if (LONG_ADJ.some((a) => w === a + 'er' || w === a + 'r' || w === a.replace(/e$/, '') + 'er')) return { ui: [k] }; } return null; }
    }
  ];
  R.detect.P18 = (c) => /\b(than|then)\b|\bas\b.*\bas\b|\b(more|less)\b/.test(c.str);

  /* ---------------------------------------------------------------- P19  I've lived here for five years. */
  const UNIT = /^(second|minute|hour|day|week|month|year|decade)s?$/;
  const NUMISH = new Set(['a', 'an', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'fifteen', 'twenty', 'thirty', 'forty', 'fifty', 'hundred', 'several', 'many', 'few', 'some', 'half', 'another']);
  const POINT = new Set(['last', 'yesterday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']);
  const isYear = (w) => /^(19|20)\d\d$/.test(w || '');
  const STATIVE = new Set(['live', 'lives', 'know', 'knows', 'own', 'owns', 'like', 'likes', 'love', 'loves']);   // 這類「狀態」動詞配 for ＋一段時間，幾乎一定要用現在完成式
  R.byPattern.P19 = [
    {
      tag: 'PREPOSITION', msg: 'since 後面接「起點」（since 2019 / since last year）；一段時間（five years）要用 for。',
      test(c) { const t = c.tokens; for (let k = 0; k + 2 < t.length; k++) if (t[k] === 'since' && (NUMISH.has(t[k + 1]) || /^\d+$/.test(t[k + 1])) && UNIT.test(t[k + 2]) && t[k + 3] !== 'ago') return { ui: [k] }; return null; }
    },
    {
      tag: 'PREPOSITION', msg: 'for 後面接「一段時間」（for five years）；說起點（2019 / last year / Monday）要用 since。',
      test(c) { const t = c.tokens; for (let k = 0; k + 1 < t.length; k++) if (t[k] === 'for' && (isYear(t[k + 1]) || (POINT.has(t[k + 1]) && !(t[k + 1] === 'may')))) return { ui: [k] }; return null; }
    },
    {
      tag: 'TENSE', msg: 'have 後面要用「過去分詞」（have lived / have been），不是原形或一般過去式。',
      test(c) { const t = c.tokens; for (let k = 0; k + 1 < t.length; k++) if (HAVE.has(t[k]) && t[k - 1] !== 'to' && !MODALS.has(t[k - 1]) && (sureVerb(t[k + 1]) || isPastOnly(t[k + 1]))) return { ui: [k + 1] }; return null; }
    },
    {
      /* 一條規則，三種情形：① 這題的標準答案是現在完成式、你卻沒用 have　② 說 since 起點卻用現在式／過去式　③ 自由造句時，live / know 這類「狀態」動詞配 for ＋一段時間 */
      tag: 'TENSE',
      msg: (h) => (h.kind === 'since' ? 'since 說的是「從某個時間點到現在」，要用現在完成式（have lived），不是現在式或過去式。' : '「從以前一直到現在」要用現在完成式（have ＋過去分詞）：I have lived here for five years。'),
      test(c) {
        const t = c.tokens;
        if (t.some((w) => w === 'will' || MODALS.has(w) || w === 'every' || w === 'each' || w === 'per')) return null;
        const aux = t.some((w, i) => HAVE.has(w) && (V.isPP(t[i + 1]) || t[i + 1] === 'been' || t[i + 1] === 'not' || ['already', 'just', 'ever', 'never', 'always', 'also'].includes(t[i + 1])));
        if (aux) return null;
        const forAt = t.findIndex((w, i) => w === 'for' && (NUMISH.has(t[i + 1]) || /^\d+$/.test(t[i + 1])) && UNIT.test(t[i + 2] || ''));
        const sinceAt = t.indexOf('since');
        const tg = c.target;
        if (tg && tg.some((w) => HAVE.has(w)) && (forAt >= 0 || sinceAt >= 0) && !t.some((w) => HAVE.has(w))) return { ui: [forAt >= 0 ? forAt : sinceAt], kind: forAt >= 0 ? 'for' : 'since' };
        if (sinceAt >= 1) {
          const n = t[sinceAt + 1];
          const point = isYear(n) || POINT.has(n) || ['this', 'then', 'childhood', 'morning', 'noon'].includes(n) || (SUBJ.has(n) && (V.isPast(t[sinceAt + 2]) || t[sinceAt + 2] === 'was' || t[sinceAt + 2] === 'were'));
          const before = t.slice(0, sinceAt);
          if (point && before.some((w, i) => ['am', 'is', 'are'].includes(w) || (i > 0 && SUBJ.has(before[i - 1]) && V.isBase(w)) || isSForm(w))) return { ui: [sinceAt], kind: 'since' };
        }
        if (forAt >= 0 && t.slice(0, forAt).some((w) => STATIVE.has(w))) return { ui: [forAt], kind: 'for' };
        return null;
      }
    }
  ];
  R.detect.P19 = (c) => /\b(for|since)\b|\bhow long\b|\b(have|has) (not|been|never|already|just|ever|\w+ed|\w+en)\b/.test(c.str);

  /* ---------------------------------------------------------------- P20  Do you know where the station is? */
  const WH = new Set(['where', 'what', 'when', 'why', 'how', 'who', 'which', 'whose', 'if', 'whether']);
  const ASKV = new Set(['know', 'tell', 'wonder', 'idea', 'ask', 'asked', 'sure', 'remember', 'understand', 'explain', 'show']);
  const AUXQ = new Set(['is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'has', 'have']);
  const HOW_ADJ = new Set(['much', 'many', 'long', 'far', 'old', 'often', 'tall', 'big', 'high', 'wide']);
  const SUBJ2 = new Set([...SUBJ, ...DET, 'there']);
  R.byPattern.P20 = [
    {
      tag: 'WORD_ORDER',
      msg: (h) => '疑問詞後面用「一般句子的順序」（where the station is），不用問句的順序（where is the station）。' + (h.aux ? '也不再需要 ' + h.aux + '。' : ''),
      test(c) {
        const t = c.tokens;
        for (let k = 1; k < t.length; k++) {
          if (!WH.has(t[k]) || !t.slice(Math.max(0, k - 6), k).some((w) => ASKV.has(w))) continue;
          let m = k + 1;
          if (t[k] === 'how' && HOW_ADJ.has(t[m])) m++;
          else if ((t[k] === 'what' || t[k] === 'which') && t[m] && !AUXQ.has(t[m]) && AUXQ.has(t[m + 1])) m++;
          if (AUXQ.has(t[m]) && SUBJ2.has(t[m + 1])) return { ui: [m, m + 1], aux: ['do', 'does', 'did'].includes(t[m]) ? t[m] : null };
        }
        return null;
      }
    }
  ];
  R.detect.P20 = (c) => /\b(know|tell me|wonder|idea|ask|asked) (where|what|when|why|how|who|which|if|whether)\b/.test(c.str);

  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
