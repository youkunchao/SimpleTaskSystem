import React from 'react';
import Icon from '../Icon.jsx';
import { speak } from '../../api.js';
import { useLandscape } from '../../hooks/useLandscape.js';

/**
 * 单词小测试：样式对齐「语文」的练习面板（白卡 + 大号 4 选 1 + 绿对/琥珀提示）。
 * 答题节奏沿用 useQuiz：答对自动推进、答错停下、连错回学习态（铁律4：只鼓励不打叉）。
 * options 必须由调用方 useMemo 生成，绝不能在渲染里现洗牌。
 */
export default function WordQuiz({ word, options, status, onSelect, onRetry, onNext, onBackLearn }) {
  const landscape = useLandscape();
  if (!word) return null;
  const correctIndex = options.findIndex((o) => o.id === word.id);
  const answered = status !== null;

  const optCls = (i) => {
    const base = `w-full font-bold rounded-2xl border-4 transition text-left ${
      landscape ? 'p-3 text-base' : 'p-4 text-lg'
    } `;
    if (!answered) return base + 'bg-gray-50 border-gray-200 hover:border-kid-orange active:scale-95';
    if (i === correctIndex) return base + 'bg-kid-green/30 border-kid-green';
    return base + 'bg-gray-50 border-gray-200 opacity-60';
  };

  return (
    <div className={`pop-in w-full ${landscape ? 'max-w-lg p-3' : 'max-w-md p-4'} bg-white/95 rounded-3xl shadow-xl`}>
      {/* 题面：看图选词 */}
      <div className={`text-center leading-none ${landscape ? 'text-5xl' : 'text-6xl'}`}>{word.emoji || '✨'}</div>

      {/* 提问 + 听题 */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <p className={`text-center font-bold text-gray-700 ${landscape ? 'text-base' : 'text-lg'}`}>
          「{word.chinese}」对应的英文单词是？
        </p>
        <button
          onClick={() => speak(`「${word.chinese}」对应的英文单词是？`, 'zh-CN', { role: 'teach' })}
          className="btn-3d bg-kid-yellow text-kid-ink px-2.5 py-1 inline-flex items-center gap-1 text-sm shrink-0"
          title="听题目"
        >
          <Icon name="speaker" size={15} />听题
        </button>
      </div>

      {/* 选项：固定 4 选 1，横屏两列省高度 */}
      <div className={`mt-3 ${landscape ? 'grid grid-cols-2 gap-2' : 'space-y-3'}`}>
        {options.map((o, i) => (
          <button key={o.id} onClick={() => !answered && onSelect(i)} disabled={answered} className={optCls(i)}>
            {String.fromCharCode(65 + i)}. {o.english}
          </button>
        ))}
      </div>

      {/* 反馈（铁律4：只鼓励，不打叉） */}
      <div className={`text-center ${landscape ? 'mt-2 min-h-[2.5rem]' : 'mt-3 min-h-[3rem]'}`}>
        {status === true && (
          <div className={`font-bold text-kid-green ${landscape ? 'text-lg' : 'text-2xl'}`}>
            🎉 真棒！<span className="text-kid-yellow">+1 ⭐</span>
          </div>
        )}
        {status === false && (
          <div className="space-y-2">
            <div className={`font-bold text-amber-600 ${landscape ? 'text-base' : 'text-lg'}`}>
              再看看，正确答案是「{word.english}」
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={onRetry} className="btn-3d bg-kid-yellow text-kid-ink px-4 py-2 text-sm">
                再试一次
              </button>
              <button onClick={onNext} className="btn-3d bg-kid-blue text-white px-4 py-2 text-sm">
                下一题
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onBackLearn}
        className="mt-3 mx-auto flex items-center gap-1 text-sm text-gray-400 font-bold"
      >
        <Icon name="back" size={16} />
        回到单词讲解
      </button>
    </div>
  );
}
