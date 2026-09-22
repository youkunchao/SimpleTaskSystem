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
  const all = getVoices();
  // 用户未显式选过音色时，自动选用"推荐的温柔自然女声"，避免系统默认机器人音（僵硬）。
  let name = (s.voices && s.voices[lang]) || '';
  if (!name) {
    const rec = recommendVoiceName(lang, all);
    if (rec) name = rec;
  }
  if (name) {
    // 优先精确匹配语言，再退化为同名即可，找不到就用系统默认
    const match = all.find((v) => v.name === name && v.lang === lang) || all.find((v) => v.name === name);
    if (match) utter.voice = match;
  }
  return utter;
}

// 各语言的"推荐人声"偏好：优先自然语言（神经/在线）女声，避免系统默认机器人音。
// 越靠前越优先；'natural'/'neural' 命中"微软自然语言（神经）"音色，放在最前。
const PREFER = {
  'zh-CN': [
    'natural', 'neural', 'xiaoxiao', 'xiaoyan', 'ting-ting', '婷', 'mei-jia', '美佳',
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

/* ============================================================
 * Edge TTS（微软在线神经网络语音）配置
 * —— 全站朗读 / 本地批量合成的「单一事实来源」。
 *
 * 音色按"角色"区分：
 *  - teach（教学内容）：旁白、讲解、读音示范 → 温暖女声（晓晓）
 *  - feedback（互动反馈）：答对、答错、引导语 → 活泼女声（晓伊）
 * 参数：语速 -20%（放慢，适合 4-6 岁）、音调 +10%（略高活泼）、输出 MP3。
 *
 * role 取值：'teach' | 'feedback'，默认 'teach'。
 * ============================================================ */
export const EDGE_TTS = {
  // 每种语言下，按角色选择音色（与既有 Web Speech 配置并存，互不干扰）
  voices: {
    'zh-CN': {
      teach: 'zh-CN-XiaoxiaoNeural',   // 教学内容：晓晓
      feedback: 'zh-CN-XiaoyiNeural',  // 互动反馈：晓伊
    },
    'en-US': {
      teach: 'en-US-AriaNeural',       // 教学：Aria
      feedback: 'en-US-JennyNeural',    // 反馈：Jenny（活泼）
    },
  },
  // SSML 用的相对语速/音调；'-20%' = 放慢 20%，'+10%' = 调高 10%
  rate: '-20%',
  pitch: '+10%',
  // 输出音频格式（MP3，单声道低码率，体积小、加载快）
  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
};

// 根据角色与语言取 Edge TTS 音色名。
// role: 'teach'（教学内容）| 'feedback'（互动反馈）；lang 缺省 'zh-CN'。
export function getEdgeVoice(role = 'teach', lang = 'zh-CN') {
  const map = EDGE_TTS.voices[lang] || EDGE_TTS.voices['zh-CN'];
  return (map && map[role]) || (map && map.teach) || 'zh-CN-XiaoxiaoNeural';
}
