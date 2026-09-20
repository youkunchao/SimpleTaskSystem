import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon.jsx';
import { applyTtsConfig } from '../utils/tts.js';

// 把原文按句拆开，用于"逐句高亮跟读"（洪恩式：读到哪句高亮哪句）
function splitSentences(text) {
  if (!text) return [];
  return text
    .replace(/([。！？!?])/g, '$1\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * 读题/跟读组件（参考洪恩识字）
 * 顶部"朗读全文"按钮：先读拼音/提示 -> 逐句读原文 -> 读题目 -> 逐个读选项（带 A/B/C/D），
 * 并高亮当前正在朗读的内容。选项只用于作答，靠"朗读全文"整体跟读。
 *
 * Props:
 *  - prompt: 前置提示（如拼音），最先朗读并高亮（可选）
 *  - passage: 原文（可选，阅读类题目用）
 *  - question: 题目文字
 *  - options: 选项文字数组
 *  - lang: 'zh-CN' | 'en-US'
 *  - correctIndex: 正确选项下标（用于答后高亮）
 *  - status: null | true | false（是否已作答及对错）
 *  - disabled: 是否禁止作答
 *  - onSelect(i): 选择某选项
 *  - footer: 答对/答错后的操作区（再试一次/下一题等）
 */
export default function AudioReader({
  prompt = '',
  passage = '',
  question = '',
  options = [],
  lang = 'zh-CN',
  correctIndex,
  status,
  disabled,
  onSelect,
  footer,
}) {
  const [activeKey, setActiveKey] = useState(null); // 当前正在朗读的项：p-i / q / o-i
  const [playing, setPlaying] = useState(false);
  const cancelRef = useRef(false);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const stop = () => {
    cancelRef.current = true;
    try { window.speechSynthesis.cancel(); } catch {}
    setPlaying(false);
    setActiveKey(null);
  };

  // 组件卸载时停止，避免后台还在读
  useEffect(() => () => stop(), []);

  // 朗读单条文本；不在这里 cancel，交由调用方决定队列/打断逻辑
  const speakText = (text, onDone) => {
    if (!supported || !text) { onDone && onDone(); return; }
    const utter = new SpeechSynthesisUtterance(String(text));
    applyTtsConfig(utter, lang);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setActiveKey(null);
      onDone && onDone();
    };
    // 安全兜底：某些浏览器/设备不触发 onend，避免卡在"朗读中"
    const fb = setTimeout(finish, Math.max(5000, (String(text).length || 1) * 450));
    utter.onstart = () => {};
    utter.onend = () => { clearTimeout(fb); finish(); };
    utter.onerror = () => { clearTimeout(fb); finish(); };
    window.speechSynthesis.speak(utter);
  };

  // 顺序朗读：拼音/提示 -> 原文逐句 -> 题目 -> 各选项（带字母）。用浏览器自带队列，onend 触发下一条。
  const playAll = () => {
    if (playing) { stop(); return; }
    const seq = [];
    if (prompt) seq.push({ key: 'prompt', text: prompt });
    splitSentences(passage).forEach((s, i) => seq.push({ key: `p-${i}`, text: s }));
    if (question) seq.push({ key: 'q', text: question });
    options.forEach((o, i) => seq.push({ key: `o-${i}`, text: `${String.fromCharCode(65 + i)}，${o}` }));
    if (seq.length === 0) return;

    cancelRef.current = false;
    setPlaying(true);
    let i = 0;
    const next = () => {
      if (cancelRef.current || i >= seq.length) { stop(); return; }
      const item = seq[i++];
      setActiveKey(item.key);
      speakText(item.text, next);
    };
    next();
  };

  const sentences = splitSentences(passage);

  return (
    <div className="space-y-4">
      {/* 拼音/前置提示：朗读时高亮，帮孩子先听到读音 */}
      {prompt && (
        <div className={`text-center text-2xl transition ${activeKey === 'prompt' ? 'text-kid-orange font-bold' : 'text-gray-600'}`}>
          {prompt}
        </div>
      )}

      {/* 朗读控制：读拼音+原文+题目+选项，再点停止 */}
      <div className="flex justify-center">
        <button onClick={playAll}
          className={`btn-kid inline-flex items-center gap-2 ${playing ? 'bg-kid-orange text-white' : 'bg-kid-yellow text-white'}`}>
          <Icon name={playing ? 'pause' : 'play'} size={22} />
          {playing ? '停止' : '朗读全文'}
        </button>
      </div>

      {/* 原文：逐句高亮跟读 */}
      {sentences.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-2xl leading-relaxed text-lg text-gray-700">
          {sentences.map((s, i) => (
            <span key={i} className={activeKey === `p-${i}` ? 'bg-kid-yellow/60 rounded px-0.5 transition' : ''}>
              {s}
            </span>
          ))}
        </div>
      )}

      {/* 题目 */}
      {question && (
        <div className={`text-lg font-bold mb-3 ${activeKey === 'q' ? 'text-kid-orange' : 'text-gray-800'}`}>
          {question}
        </div>
      )}

      {/* 选项：点击作答，朗读全文时整体跟读 */}
      <div className="space-y-3">
        {options.map((opt, i) => {
          const isRight = i === correctIndex;
          const optActive = activeKey === `o-${i}`;
          return (
            <button
              key={i}
              onClick={() => onSelect && onSelect(i)}
              disabled={disabled}
              className={`w-full p-4 text-lg font-bold rounded-2xl border-4 transition text-left ${
                status === null
                  ? 'bg-gray-50 border-gray-200 hover:border-kid-orange'
                  : isRight
                    ? 'bg-kid-green/30 border-kid-green'
                    : 'bg-red-100 border-red-300'
              } ${optActive ? 'ring-4 ring-kid-yellow' : ''}`}>
              {String.fromCharCode(65 + i)}. {opt}
            </button>
          );
        })}
      </div>

      {footer}
    </div>
  );
}
