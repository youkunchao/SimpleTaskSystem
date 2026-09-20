// 全局朗读（TTS）配置
// 作用：把"读题 / 听读音 / 听力播放"统一到一套配置，解决系统默认音色太僵硬的问题。
// 配置保存在 localStorage，按语言分别挑选人声，并支持语速/语调微调。

const STORAGE_KEY = 'kid_tts_settings';
const DEFAULTS = { voices: {}, rate: 0.8, pitch: 1.15 };

// 读取配置（带默认值容错）
export function loadTtsSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {
    /* 损坏的配置直接回退默认 */
  }
  return { ...DEFAULTS };
}

export function saveTtsSettings(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) {
    /* 隐私模式等场景忽略 */
  }
}

// 获取当前浏览器可用语音（首次可能为 []，需等 voiceschanged）
export function getVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices() || [];
}

// 等语音列表加载完成（部分浏览器异步加载，getVoices 初次为空）
export function whenVoicesReady(cb) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    cb([]);
    return;
  }
  const voices = getVoices();
  if (voices.length) {
    cb(voices);
    return;
  }
  const handler = () => {
    const vs = getVoices();
    if (vs.length) {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      cb(vs);
    }
  };
  window.speechSynthesis.addEventListener('voiceschanged', handler);
}

// 把全局配置套用到一条 SpeechSynthesisUtterance 上
export function applyTtsConfig(utter, lang = 'zh-CN') {
  const s = loadTtsSettings();
  utter.lang = lang;
  utter.rate = typeof s.rate === 'number' ? s.rate : 0.8;
  utter.pitch = typeof s.pitch === 'number' ? s.pitch : 1.15;
  const name = s.voices && s.voices[lang];
  if (name) {
    const all = getVoices();
    // 优先精确匹配语言，再退化为同名即可，找不到就用系统默认
    const match = all.find((v) => v.name === name && v.lang === lang) || all.find((v) => v.name === name);
    if (match) utter.voice = match;
  }
  return utter;
}

// 各语言的"推荐人声"偏好：按温柔知性女老师、吐字清楚、四声标准的方向排序。
// 越靠前越优先；排在后面的多为男声/生硬音色，仅作兜底。
const PREFER = {
  'zh-CN': [
    '晓', 'xiaoxiao', 'xiaoyan', 'ting-ting', '婷', 'mei-jia', '美佳',
    'yaoyao', '瑶', 'huihui', '慧', 'yue', 'yuyu', 'google 普通话', 'kangkang', 'yunxi',
  ],
  'en-US': [
    'aria', 'zira', 'samantha', 'jenny', 'natasha', 'google us english',
    'microsoft aria', 'female', 'victoria',
  ],
};

// 从当前可用语音里挑出最推荐的那一个（按 PREFER 顺序，命中越靠前分越高）
export function recommendVoiceName(lang, voices = getVoices()) {
  const list = voices.filter(
    (v) => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(lang.toLowerCase())
  );
  if (!list.length) return '';
  const keys = PREFER[lang] || [];
  let best = null;
  let bestScore = Infinity;
  for (const v of list) {
    const name = (v.name || '').toLowerCase();
    let score = Infinity;
    keys.forEach((k, idx) => {
      if (name.includes(k) && idx < score) score = idx;
    });
    if (score < bestScore) {
      bestScore = score;
      best = v.name;
    }
  }
  return best || list[0].name;
}

export function isRecommended(lang, name, voices = getVoices()) {
  return !!name && recommendVoiceName(lang, voices) === name;
}
