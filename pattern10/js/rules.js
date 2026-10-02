/* Pattern 10 — 判題規則的共用零件（各章的規則在 rules_chN.js）
 * 每章一個檔案：rules_ch1.js（P01–P10）、rules_ch2.js（P11–P20）…；新增一章要在 index.html、sw.js、tests/harness.js 登記。
 * 各句型的「典型錯誤」規則與句型偵測器如下寫法：
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
    'fall', 'win', 'rise', 'lead', 'ring', 'fight', 'feed', 'dream', 'smell', 'meet', 'swim', 'fly', 'sleep', 'bite', 'blow', 'hang', 'lay', 'lie',
    'book', 'camp', 'hike', 'schedule', 'reserve', 'interrupt']);
  const MOD_PRES = new Set(['can', 'will', 'shall', 'may']);
  const PAST_MODALS = new Set(['could', 'would', 'might', 'should']);
  const SUBJ = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
  const MODALS = new Set(['can', 'may', 'might', 'could', 'would', 'should', 'must']);
  const ADV_OK = new Set(['also', 'just', 'still', 'probably', 'definitely', 'really', 'always', 'never', 'usually', 'often', 'then', 'only']);

  /* 條件句的「主句」：If …, 主句 / 主句 if …（回傳 token 陣列；找不到就回傳 null） */
  function mainClause(c) {
    const t = c.tokens, k = t.indexOf('if'); if (k < 0) return null;
    if (k > 0) return t.slice(0, k);
    if (c.src && c.words) {                              // 有逗號：以逗號切開
      const w = c.words.findIndex((x) => /[,;，]$/.test(x));
      if (w >= 0) { const j = c.src.findIndex((s) => s > w); return j >= 0 ? t.slice(j) : null; }
    }
    for (let j = 2; j + 1 < t.length; j++) if (SUBJ.has(t[j]) && V.isVerb(t[j + 1])) return t.slice(j);   // 沒寫逗號：if 子句之後第一個「主詞＋動詞」
    return null;
  }

  const DET = new Set(['a', 'an', 'the', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that', 'these', 'those', 'some', 'any', 'another',
    'every', 'each', 'no', 'all', 'both', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']);
  const OBJ = new Set(['me', 'you', 'him', 'her', 'it', 'us', 'them']);
  const AFTER_VERB = new Set(['to', 'for', 'of', 'in', 'on', 'at', 'with', 'about', 'from', 'by', 'into', 'up', 'out', 'off', 'over', 'down', 'back',
    'away', 'together', 'again', 'here', 'there', 'now', 'today', 'tonight', 'tomorrow', 'yesterday', 'early', 'late', 'first', 'soon']);

  /* t[j] 在這個位置是不是「動詞原形」：和名詞同形的字（work / call …），要看後面有沒有受詞才算；loose＝連「後面接副詞／介系詞」也算 */
  function verbAt(t, j, loose) {
    const w = t[j];
    if (!w || !V.isBase(w)) return false;
    if (!NOUNISH.has(w)) return true;
    const n = t[j + 1];
    return !!n && (DET.has(n) || OBJ.has(n) || (!!loose && AFTER_VERB.has(n)));
  }
  /* 一定是動詞原形（不是名詞同形字，也不可能是過去分詞同形的 put / cut / read） */
  const sureVerb = (w) => !!w && V.isBase(w) && !NOUNISH.has(w) && !V.isPP(w);

  const tick = (s) => '「' + s + '」';

  R.util = { NOUNISH, MOD_PRES, PAST_MODALS, SUBJ, MODALS, ADV_OK, DET, OBJ, AFTER_VERB, verbAt, sureVerb, mainClause, tick };
  R.NOUNISH = NOUNISH;
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
