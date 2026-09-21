import axios from 'axios';
import { applyTtsConfig } from './utils/tts.js';
import { speakEdge, cancelEdge, prefetchEdge, clearEdgeCache } from './utils/edgeTts.js';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Web Speech API 封装（edge-tts 不可用时的最终兜底）
// 返回是否真的发声，并通过 onStart/onEnd 让界面能显示"播放中"状态，
// 避免点了按钮却毫无反馈（浏览器不支持或没有音频设备时会静默失败）
function webSpeechSpeak(text, lang = 'zh-CN', { onStart, onEnd } = {}) {
  const done = () => onEnd && onEnd();
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    done();
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    cancelEdge(); // 同样停掉 edge 音频，避免两条音轨叠音
    const utter = new SpeechSynthesisUtterance(String(text));
    applyTtsConfig(utter, lang);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      done();
    };
    // 只在语音压根没启动时兜底复位状态（例如没有音频设备、被浏览器策略拦截），
    // 一旦开始朗读就交给 onend，避免长句子还没读完状态就提前复位
    const fallback = setTimeout(() => { if (!finished) finish(); }, 800);
    utter.onstart = () => {
      clearTimeout(fallback);
      if (onStart) onStart();
    };
    utter.onend = finish;
    utter.onerror = finish;

    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    done();
    return false;
  }
}

// 朗读主入口：优先使用 edge-tts（微软神经网络语音，音色按 role 选择），
// 任意失败（网络不通 / 端点受限 / 超时 / 播放异常）自动回退 Web Speech API。
// 接口签名与 onStart/onEnd/cancel 语义完全不变，全站 25 处调用点零改动受益。
//
// 参数：
//   text   要朗读的文本
//   lang   语言（'zh-CN' | 'en-US'）
//   role   音色角色：'teach'（教学内容→晓晓）/ 'feedback'（互动反馈→晓伊），默认 'teach'
//   onStart / onEnd  播放开始 / 结束回调（用于界面"播放中"状态）
// 全局朗读序号：每次 speak 递增，只有"最新"的那次朗读才被允许发声/回调。
// 这是从根上消除"旧音频还在响、新音频又叠加"的关键。
let speakSeq = 0;

// 停止全部朗读（edge 音频 + 在途请求 + Web Speech）。
// 供组件在"切步骤 / 换字 / 卸载"时调用，实现"切走即停"，杜绝叠音。
export function cancelSpeak() {
  speakSeq++;
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
  cancelEdge();
}

export function speak(text, lang = 'zh-CN', { onStart, onEnd, role = 'teach' } = {}) {
  const my = ++speakSeq;
  const alive = () => my === speakSeq;
  const fireStart = () => { if (alive() && onStart) onStart(); };
  const fireEnd = () => { if (alive() && onEnd) onEnd(); };

  if (!text) {
    fireEnd();
    return false;
  }

  // 先停掉上一段（edge 音频/在途取音频请求 + Web Speech），杜绝新旧叠音
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
  cancelEdge();

  const hasEdge = typeof window !== 'undefined' && typeof WebSocket !== 'undefined';
  if (!hasEdge) {
    webSpeechSpeak(text, lang, { onStart: fireStart, onEnd: fireEnd });
    return true;
  }

  speakEdge(text, lang, { role, onStart: fireStart, onEnd: fireEnd, alive }).catch((err) => {
    // 已被更新的朗读取代（或被 cancelSpeak 打断）：静默放弃，绝不回退，否则会与新音频叠音
    if (!alive() || (err && err.__superseded)) return;
    console.warn('[tts] edge-tts 不可用，回退 Web Speech：', err && err.message);
    webSpeechSpeak(text, lang, { onStart: fireStart, onEnd: fireEnd });
  });
  return true;
}

// 暴露预拉取 / 缓存清理，供组件在进入步骤时预热音频、换字时释放缓存
export { prefetchEdge, clearEdgeCache };

export default api;
