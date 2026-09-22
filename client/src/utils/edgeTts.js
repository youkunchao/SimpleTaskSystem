// 浏览器端离线音频播放（跨浏览器可用）
// 前端按 key（lang|role|text）向同源 /api/tts 请求"预合成好的 mp3"（由 python edge-tts 离线生成）。
// 任意失败（无预合成 / 404 / 播放异常）都通过 reject 暴露，由 api.speak 捕获后无缝回退 Web Speech。
// 对外暴露：speakEdge / speakEdgeLive / prefetchEdge / cancelEdge / clearEdgeCache。
//
// 防叠音 + 零延迟：
//   - cancelEdge() 停"正在播放"的音频并 abort"在途请求"；makeAudio 开播前再校验序号，被取代立即停。
//   - audioCache 缓存已取回的 mp3（objectURL）；进入步骤时 prefetchEdge 预热，点按直接播、首次也无延迟。

import { getEdgeVoice, EDGE_TTS } from './tts.js';

// 浏览器原生直连微软神经语音（edge-tts 协议）：在"预合成 mp3 缺失"时（如数学动态题）即时合成自然语言，
// 音色与预合成一致（晓晓/晓伊）。仅当浏览器能连通微软时生效；失败/受限自动 reject，由上层回退 Web Speech。
// 这是对"僵硬发音"的兜底——即使没有离线 mp3，也能拿到温柔的神经网络女声。
const EDGE_WS = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const GEC_VERSION = '1-130.0.2849.56';
const HANDSHAKE = 'https://edge.microsoft.com/tts/handshake/v1';

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// 浏览器原生 edge-tts 实时合成主入口：成功 resolve（已播放），失败（握手/连接/播放异常）reject。
// alive()：返回 false 表示已被更新的朗读取代，应立即放弃，避免叠音。
export function speakEdgeLive(text, lang = 'zh-CN', { role = 'teach', onStart, onEnd, alive } = {}) {
  return new Promise((resolve, reject) => {
    if (!text || typeof WebSocket === 'undefined') {
      reject(new Error('no websocket'));
      return;
    }
    const voice = getEdgeVoice(role, lang);
    const now = new Date().toISOString();
    const ssml =
      `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
      `<voice name='${voice}'><prosody rate='${EDGE_TTS.rate}' pitch='${EDGE_TTS.pitch}'>${escapeXml(text)}</prosody></voice></speak>`;
    const configMsg =
      `X-Timestamp: ${now}\r\nContent-Type: application/json; charset=utf-8\r\nPath: speech.config\r\n\r\n` +
      JSON.stringify({
        context: {
          synthesis: {
            audio: {
              metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
              outputFormat: EDGE_TTS.outputFormat,
            },
          },
        },
      });
    const ctxMsg =
      `X-Timestamp: ${now}\r\nContent-Type: application/json; charset=utf-8\r\nPath: synthesis.context\r\n\r\n` +
      JSON.stringify({ device: { os: 'Windows', version: '10.0.0' } });
    const synthMsg =
      `X-Timestamp: ${now}\r\nContent-Type: application/ssml+xml\r\nPath: audio.synthesis\r\n\r\n` + ssml;

    let ws = null;
    let done = false;
    let audioChunks = [];
    const finish = (ok, err) => {
      if (done) return;
      done = true;
      try { if (ws) ws.close(); } catch { /* noop */ }
      if (ok) resolve();
      else reject(err || new Error('edge live failed'));
    };

    fetch(HANDSHAKE, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('handshake ' + r.status); return r.text(); })
      .then((token) => {
        if (alive && !alive()) return finish(false);
        const url =
          `${EDGE_WS}?TrustedClientToken=${TRUSTED_TOKEN}` +
          `&Sec-MS-GEC=${encodeURIComponent(String(token).trim())}&Sec-MS-GEC-Version=${GEC_VERSION}`;
        ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';
        let opened = false;
        ws.onopen = () => {
          opened = true;
          ws.send(configMsg);
          ws.send(ctxMsg);
          ws.send(synthMsg);
        };
        ws.onmessage = (ev) => {
          let data = ev.data;
          if (typeof data !== 'string') {
            // 二进制帧：微软把"头文本 + 原始音频"拼在一起，尝试按文本解析头部
            try { data = new TextDecoder().decode(data); } catch { return; }
          }
          if (data.indexOf('Path:audio') !== -1) {
            const idx = data.indexOf('\r\n\r\n');
            const b64 = idx >= 0 ? data.slice(idx + 4) : '';
            if (b64) audioChunks.push(b64);
          } else if (data.indexOf('Path:turn.end') !== -1) {
            try {
              const blob = new Blob([base64ToBytes(audioChunks.join(''))], { type: 'audio/mpeg' });
              const urlObj = URL.createObjectURL(blob);
              const audio = new Audio(urlObj);
              audio.onplay = () => { if (!(alive && !alive())) onStart && onStart(); };
              audio.onended = () => { URL.revokeObjectURL(urlObj); if (onEnd) onEnd(); finish(true); };
              audio.onerror = () => { URL.revokeObjectURL(urlObj); finish(false, new Error('audio play error')); };
              audio.play().catch((e) => { URL.revokeObjectURL(urlObj); finish(false, e); });
            } catch (e) { finish(false, e); }
          }
        };
        ws.onerror = () => { if (!opened) finish(false, new Error('ws error')); };
        ws.onclose = () => { if (!done && audioChunks.length === 0) finish(false, new Error('ws closed early')); };
      })
      .catch((err) => finish(false, err));
  });
}

let currentAudio = null;
let currentAbort = null;
const audioCache = new Map(); // key -> objectURL（已取回的 mp3，避免重复请求）

function cacheKey(text, lang, role) {
  return `${lang}|${role}|${String(text).trim()}`;
}

function supersededError() {
  const e = new Error('superseded');
  e.__superseded = true;
  return e;
}

export function cancelEdge() {
  if (currentAbort) {
    try { currentAbort.abort(); } catch { /* noop */ }
    currentAbort = null;
  }
  if (currentAudio) {
    const a = currentAudio;
    currentAudio = null;
    try {
      a.onended = null;
      a.onerror = null;
      a.pause();
      a.src = '';
    } catch { /* noop */ }
  }
}

// 释放所有缓存音频（换字 / 离开时调用，避免内存堆积）
export function clearEdgeCache() {
  for (const url of audioCache.values()) {
    try { URL.revokeObjectURL(url); } catch { /* noop */ }
  }
  audioCache.clear();
}

function makeAudio(url, onStart, onEnd, alive) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    let ended = false;
    audio.onplay = () => {
      // 已被更新的朗读取代：立刻停掉自己，绝不与新的叠音
      if (alive && !alive()) { cancelEdge(); return; }
      if (onStart) onStart();
    };
    audio.onended = () => {
      if (ended) return; ended = true;
      if (onEnd) onEnd();
      resolve();
    };
    audio.onerror = () => {
      if (ended) return; ended = true;
      reject(new Error('audio play error'));
    };
    currentAudio = audio;
    audio.play().catch((e) => reject(e));
  });
}

// 预热：提前取回某条 mp3 放入缓存（不播放）。失败无所谓，播放时再取。
export function prefetchEdge(text, lang = 'zh-CN', role = 'teach') {
  if (!text) return;
  const key = cacheKey(text, lang, role);
  if (audioCache.has(key)) return;
  const ac = new AbortController();
  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: String(text).trim(), role, lang }),
    signal: ac.signal,
  })
    .then((r) => { if (!r.ok) throw new Error('tts http ' + r.status); return r.blob(); })
    .then((blob) => {
      if (ac.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      if (!audioCache.has(key)) audioCache.set(key, url);
      else URL.revokeObjectURL(url);
    })
    .catch(() => { /* 预拉取失败：播放时再取（可能回退 Web Speech） */ });
}

// 主入口：优先用缓存；无缓存则取回并缓存，再播放。成功 resolve；失败（无预合成/404/播放异常）reject。
// alive(): 返回 false 表示本次朗读已被更新的朗读取代，调用方应放弃回退（避免叠音）。
export function speakEdge(text, lang = 'zh-CN', { role = 'teach', onStart, onEnd, alive } = {}) {
  return new Promise((resolve, reject) => {
    if (!text) { reject(new Error('no text')); return; }
    const key = cacheKey(text, lang, role);
    const cached = audioCache.get(key);
    if (cached) {
      makeAudio(cached, onStart, onEnd, alive).then(resolve).catch(reject);
      return;
    }
    const ac = new AbortController();
    currentAbort = ac;
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: String(text).trim(), role, lang }),
      signal: ac.signal,
    })
      .then((r) => { if (!r.ok) throw new Error('tts http ' + r.status); return r.blob(); })
      .then((blob) => {
        if (ac.signal.aborted || (alive && !alive())) throw supersededError();
        const url = URL.createObjectURL(blob);
        if (!audioCache.has(key)) audioCache.set(key, url);
        else URL.revokeObjectURL(url);
        return makeAudio(url, onStart, onEnd, alive);
      })
      .then(resolve)
      .catch(reject);
  });
}
