// 浏览器端离线音频播放（跨浏览器可用）
// 前端按 key（lang|role|text）向同源 /api/tts 请求"预合成好的 mp3"（由 python edge-tts 离线生成）。
// 任意失败（无预合成 / 404 / 播放异常）都通过 reject 暴露，由 api.speak 捕获后无缝回退 Web Speech。
// 对外暴露：speakEdge / prefetchEdge / cancelEdge / clearEdgeCache。
//
// 防叠音 + 零延迟：
//   - cancelEdge() 停"正在播放"的音频并 abort"在途请求"；makeAudio 开播前再校验序号，被取代立即停。
//   - audioCache 缓存已取回的 mp3（objectURL）；进入步骤时 prefetchEdge 预热，点按直接播、首次也无延迟。

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
