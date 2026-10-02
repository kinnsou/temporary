/* Pattern 10 — 語音（朗讀 TTS / 語音辨識 STT）
 * 都用瀏覽器內建功能：免費、不上傳任何錄音，只保留辨識出來的文字（規格 §23）。
 * 介面刻意和引擎分離（TTSProvider / STTProvider），之後要換雲端服務只需改這個檔。
 */
(function (g) {
  'use strict';
  const P10 = (g.P10 = g.P10 || {});
  const Sp = (P10.speech = {});

  /* ------------------------------------------------------------------ TTS */
  const synth = g.speechSynthesis || null;
  Sp.ttsSupported = !!synth && typeof g.SpeechSynthesisUtterance === 'function';
  let voices = [];
  function loadVoices() { try { voices = synth ? synth.getVoices() : []; } catch (e) { voices = []; } }
  if (synth) {
    loadVoices();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
    else synth.onvoiceschanged = loadVoices;
  }
  Sp.voices = function () {
    loadVoices();
    return voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  };
  /* 選聲音：使用者指定 → Google US English → Samantha(蘋果) → Zira → David → 其他英文聲音。
   * 盡量避開「線上串流」聲音（某些裝置上會破音）。 */
  Sp.pickVoice = function (uri) {
    const all = Sp.voices();
    if (!all.length) return null;
    if (uri) { const hit = all.find((v) => v.voiceURI === uri); if (hit) return hit; }
    let pool = all.filter((v) => v.localService !== false);
    if (!pool.length) pool = all;
    const pins = ['google us english', 'samantha', 'zira', 'david', 'mark', 'aria', 'jenny', 'google uk english female'];
    for (const pin of pins) {
      const hit = pool.find((v) => v.name.toLowerCase().indexOf(pin) >= 0);
      if (hit) return hit;
    }
    return pool.find((v) => /^en[-_]US/i.test(v.lang)) || pool[0];
  };

  let speakToken = 0;
  /* speak(text, {rate, voiceURI}) → Promise（播完 / 出錯 / 逾時都會 resolve） */
  Sp.speak = function (text, o) {
    o = o || {};
    if (!Sp.ttsSupported || !text) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        synth.cancel();
        const u = new g.SpeechSynthesisUtterance(String(text));
        u.lang = 'en-US';
        u.rate = o.rate || 1;
        u.pitch = 1;
        const v = Sp.pickVoice(o.voiceURI);
        if (v) { u.voice = v; u.lang = v.lang || 'en-US'; }
        const my = ++speakToken;
        let done = false;
        const fin = (ok) => { if (done) return; done = true; resolve(ok); };
        u.onend = () => fin(true);
        u.onerror = () => fin(false);
        setTimeout(() => { if (my === speakToken) fin(true); }, 9000);
        synth.speak(u);
      } catch (e) { resolve(false); }
    });
  };
  Sp.stopSpeaking = function () { try { if (synth) synth.cancel(); } catch (e) { /* ignore */ } };

  /* ------------------------------------------------------------------ STT */
  const SR = g.SpeechRecognition || g.webkitSpeechRecognition || null;
  Sp.sttSupported = !!SR && !P10.env.trial;
  Sp.sttOffText = P10.env.trial ? '試玩版不支援語音辨識（網頁預覽會擋麥克風）' : '這個瀏覽器不支援語音辨識';
  Sp.secure = typeof g.isSecureContext === 'boolean' ? g.isSecureContext : true;
  Sp.isFile = !!(g.location && g.location.protocol === 'file:');

  /* listen({onAudioStart, onSpeechStart, onInterim, onFinal(alts, info), onError(code), onEnd}) → {stop, abort} */
  Sp.listen = function (o) {
    o = o || {};
    if (!SR) { if (o.onError) o.onError('not-supported'); return { stop() {}, abort() {} }; }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.continuous = false;
    const info = { speechAt: null, startAt: performance.now(), gotFinal: false };
    rec.onaudiostart = () => { info.audioAt = performance.now(); if (o.onAudioStart) o.onAudioStart(info.audioAt); };
    rec.onspeechstart = () => { if (info.speechAt == null) info.speechAt = performance.now(); if (o.onSpeechStart) o.onSpeechStart(info.speechAt); };
    rec.onresult = (ev) => {
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          info.gotFinal = true;
          const alts = [];
          for (let k = 0; k < r.length; k++) alts.push({ text: r[k].transcript, confidence: typeof r[k].confidence === 'number' ? r[k].confidence : null });
          if (o.onFinal) o.onFinal(alts, info);
        } else if (o.onInterim) o.onInterim(r[0].transcript);
      }
    };
    rec.onerror = (e) => { if (o.onError) o.onError(e && e.error ? e.error : 'error'); };
    rec.onend = () => { if (o.onEnd) o.onEnd(info); };
    try { rec.start(); } catch (e) { if (o.onError) o.onError('start-failed'); }
    return { stop() { try { rec.stop(); } catch (e) { /* ignore */ } }, abort() { try { rec.abort(); } catch (e) { /* ignore */ } } };
  };

  Sp.errorText = function (code) {
    switch (code) {
      case 'not-allowed': case 'service-not-allowed': return '麥克風被封鎖了。請在網址列旁邊允許使用麥克風（或改用打字）。';
      case 'no-speech': return '沒有聽到聲音，再試一次？';
      case 'audio-capture': return '找不到麥克風。';
      case 'network': return '語音辨識需要網路連線（瀏覽器會把聲音交給語音服務辨識，本程式不會保存錄音）。';
      case 'not-supported': return '這個瀏覽器不支援語音辨識，請改用 Chrome 或 Edge，或用打字。';
      case 'aborted': return '';
      default: return '語音辨識出了點問題，可以再試一次或改用打字。';
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = P10;
})(globalThis);
