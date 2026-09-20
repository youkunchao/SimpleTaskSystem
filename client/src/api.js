import axios from 'axios';
import { applyTtsConfig } from './utils/tts.js';

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

// Web Speech API 封装
// 返回是否真的发声，并通过 onStart/onEnd 让界面能显示"播放中"状态，
// 避免点了按钮却毫无反馈（浏览器不支持或没有音频设备时会静默失败）
export function speak(text, lang = 'zh-CN', { onStart, onEnd } = {}) {
  const done = () => onEnd && onEnd();
  if (!text || !('speechSynthesis' in window)) {
    done();
    return false;
  }
  try {
    window.speechSynthesis.cancel();
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

export default api;
