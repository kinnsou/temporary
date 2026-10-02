/* Pattern 10 — 啟動與路由 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const U = P10.util, Store = P10.store, Sess = P10.session, S = P10.srs, UI = P10.ui, Views = P10.views, Runner = P10.runner;
  const doc = g.document;
  const App = (P10.app = { state: null, content: null, warning: null, lastSummary: null, flags: {} });

  const TABS = [
    ['today', '今天', 'home'], ['learn', '學習', 'book'], ['patterns', 'Patterns', 'grid'], ['progress', '進度', 'chart'], ['settings', '設定', 'gear']
  ];

  App.save = function () {
    const ok = Store.save(App.state);
    // 請瀏覽器把這個網站的儲存設成「持久」，不會因為空間不足被自動清掉（Chrome 會依使用情況自動決定；Firefox 會問一次）
    if (!App._persistAsked && App.state.onboarded) {
      App._persistAsked = true;
      try { if (g.navigator.storage && g.navigator.storage.persist) g.navigator.storage.persist(); } catch (e) { /* ignore */ }
    }
    if (!ok && !App._warnedSave) { App._warnedSave = true; UI.toast('儲存失敗：瀏覽器的儲存空間可能滿了。請到「設定」匯出備份。', 5000); }
    return ok;
  };
  App.go = function (hash) { if (g.location.hash === hash) render(); else g.location.hash = hash; };
  App.refreshContent = function () { App.content = Store.seedContent(); };
  App.reload = function () { boot(); g.location.hash = '#/today'; render(); };
  App.applyTheme = function () {
    if (P10.env.trial) return;            // 試玩版：主題由外層頁面決定
    const t = App.state.settings.theme;
    if (t === 'auto') doc.documentElement.removeAttribute('data-theme'); else doc.documentElement.setAttribute('data-theme', t);
    const dark = t === 'dark' || (t === 'auto' && g.matchMedia && g.matchMedia('(prefers-color-scheme: dark)').matches);
    const m = doc.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', dark ? '#14161A' : '#F4F1EA');
  };

  function boot() {
    const r = Store.load();
    App.state = r.state;
    App.warning = r.warning;
    App.content = Store.seedContent();
    S.refreshUnlocks(App.state, App.content.patterns);
    App.applyTheme();
  }

  function buildTabbar() {
    const nav = doc.getElementById('tabbar');
    UI.clear(nav);
    TABS.forEach(([key, label, icon]) => nav.append(UI.h('a', { class: 'tab', href: '#/' + key, 'data-tab': key }, UI.icon(icon), label)));
  }

  function mount(node, tab, opts) {
    opts = opts || {};
    const view = doc.getElementById('view'), nav = doc.getElementById('tabbar');
    UI.clear(view);
    view.className = opts.noTab ? 'no-tab' : '';
    view.append(node);
    nav.classList.toggle('hide', !!opts.noTab);
    nav.querySelectorAll('.tab').forEach((t) => { if (t.getAttribute('data-tab') === tab) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current'); });
    g.scrollTo(0, 0);
  }

  function render() {
    try { Runner.unmount(); } catch (e) { /* ignore */ }
    const hash = g.location.hash || '#/today';
    const seg = hash.replace(/^#\/?/, '').split('/');
    const name = seg[0] || 'today';
    if (!App.state.onboarded && name !== 'onboarding') { g.location.hash = '#/onboarding'; return; }
    if (App.state.onboarded && name === 'onboarding') { g.location.hash = '#/today'; return; }       // 已經完成首次使用：不再重看
    switch (name) {
      case 'today': mount(Views.today(), 'today'); break;
      case 'learn': mount(Views.learn(), 'learn'); break;
      case 'patterns': mount(seg[1] ? Views.patternDetail(seg[1]) : Views.patterns(), 'patterns'); break;
      case 'progress': mount(Views.progress(), 'progress'); break;
      case 'probe-result': mount(Views.probeResult(), 'progress'); break;
      case 'settings': mount(Views.settings(), 'settings'); break;
      case 'admin': mount(P10.admin ? P10.admin.render(seg.slice(1)) : Views.settings(), 'settings'); break;
      case 'session': if (!App.state.session) { App.go('#/today'); return; } mount(Runner.mount(), null, { noTab: true }); break;
      case 'summary': mount(Views.summary(), 'today'); break;
      case 'onboarding': mount(Views.onboarding(), null, { noTab: true }); break;
      default: g.location.hash = '#/today';
    }
  }
  App.render = render;

  function start() {
    // 先看看進度有沒有被同網域的其他網頁清掉（localStorage.clear()）；有鏡像就自動還原
    const wait = new Promise((resolve) => setTimeout(() => resolve(null), 1200));
    Promise.race([Store.restoreFromMirror().catch(() => null), wait]).then((restored) => {
      boot();
      buildTabbar();
      g.addEventListener('hashchange', render);
      g.addEventListener('pagehide', () => { try { Store.flushMirror(); } catch (e) { /* ignore */ } });
      if (g.matchMedia) {
        const mq = g.matchMedia('(prefers-color-scheme: dark)');
        if (mq.addEventListener) mq.addEventListener('change', () => App.applyTheme());
      }
      render();
      if (restored) UI.toast('偵測到瀏覽器資料被清掉，已自動還原你的進度', 4500);
      if (!P10.env.trial && 'serviceWorker' in g.navigator && /^https?:$/.test(g.location.protocol)) {
        g.navigator.serviceWorker.register('sw.js').catch(() => { /* 離線快取失敗不影響使用 */ });
      }
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(globalThis);
