import React, { useState } from 'react';
import { speak } from '../api.js';
import Icon from './Icon.jsx';

// 读题按钮：把当前题目文字朗读出来（中文用 zh-CN，英文用 en-US）。
// 用 onStart/onEnd 驱动"播放中"状态，让孩子知道点了之后确实在发声，
// 避免浏览器不支持或被策略拦截时毫无反馈。
export default function ReadAloud({ text, lang = 'zh-CN', size = 22, className = '' }) {
  const [playing, setPlaying] = useState(false);

  const onClick = () => {
    if (!text) return;
    let resetTimer;
    const ok = speak(text, lang, {
      onStart: () => setPlaying(true),
      onEnd: () => {
        setPlaying(false);
        clearTimeout(resetTimer);
      },
    });
    // 浏览器不支持语音合成时，给个短暂高亮反馈，提示"已点击"
    if (!ok) {
      setPlaying(true);
      resetTimer = setTimeout(() => setPlaying(false), 800);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title="读题"
      aria-label="读题"
      className={`inline-flex items-center justify-center rounded-full transition active:scale-90 ${className}`}
    >
      <Icon
        name="speaker"
        size={size}
        className={playing ? 'text-kid-orange animate-pulse' : 'text-gray-400 hover:text-kid-orange'}
      />
    </button>
  );
}
