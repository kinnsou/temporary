/* Pattern 10 — 教材總表（教材分「章」，每章一個檔案）
 *   content_ch1.js   第 1 章：核心句型（P01–P10）
 *   content_ch2.js   第 2 章：日常開口說（P11–P20）
 *   之後每加一章 = 新增 content_chN.js ＋ 在 index.html、sw.js、tests/harness.js 登記
 *
 * 答案寫法：acc 陣列放「也算對」的說法。
 *   {a|b|c}  → 三選一（組合會自動展開）；{ before|} → 可有可無
 *   縮寫不用重複列（I'm = I am、don't = do not 系統自動視為相同）
 *   If … , … 句型會自動接受前後換位（If it rains, we'll stay. = We'll stay if it rains.）
 * h:1 = 留作「能力檢測」用的未見題，平常訓練不會出現。
 * 全部教材都是自行編寫，不搬運任何教材原文。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});

  const T = (level, zh, en, acc, focus, o) => ({ level, zh, en, acc: acc || [], focus: focus || null, h: !!(o && o.h) });
  const H = { h: 1 };
  P10.T = T; P10.H = H;

  const seed = (P10.seed = { version: 2, patterns: [], exercises: [] });
  P10.chapters = [];

  /* 註冊一章：patterns 裡每個句型帶 items（用 T 寫的題目）。攤平成 patterns[] 與 exercises[]（每題給固定 id：P05-T07） */
  P10.addChapter = function (ch) {
    P10.chapters.push({ id: ch.id, title: ch.title, blurb: ch.blurb || '' });
    P10.chapters.sort((a, b) => a.id - b.id);
    ch.patterns.forEach((p) => {
      const items = p.items; delete p.items;
      p.active = true;
      p.source = 'seed';
      p.chapter = ch.id;
      seed.patterns.push(p);
      items.forEach((it, i) => {
        seed.exercises.push({
          id: p.id + '-T' + String(i + 1).padStart(2, '0'), pattern: p.id, level: it.level, zh: it.zh, en: it.en, acc: it.acc,
          focus: it.focus, holdout: it.h, source: 'manual', active: true
        });
      });
    });
    seed.patterns.sort((a, b) => a.order - b.order);
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
