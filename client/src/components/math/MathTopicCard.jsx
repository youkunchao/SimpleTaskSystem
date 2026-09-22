import React from 'react';

// 知识点卡片（含锁定/已掌握状态）—— 对应英语 CategoryGrid 的卡片
export default function MathTopicCard({ topic, color, onPick }) {
  const locked = !topic.unlocked;
  const mastered = topic.mastered;

  return (
    <button
      disabled={locked}
      onClick={() => onPick(topic)}
      className={`relative w-full text-left bg-white rounded-3xl shadow-lg p-4 pl-5 transition ${
        locked ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
      }`}
    >
      {/* 板块色条 */}
      <span className={`absolute left-0 top-3 bottom-3 w-2 rounded-full ${color.strip}`} />

      <div className="flex items-center gap-3">
        <span className="text-4xl">{locked ? '🔒' : topic.emoji || '📘'}</span>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-lg truncate">{topic.title}</div>
          <div className="text-xs text-gray-400 truncate">{topic.subtitle}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${color.chip}`}>{topic.board}</span>
            {mastered && <span className="text-xs text-kid-green font-bold">✅ 已掌握</span>}
            {!locked && !mastered && topic.quizCount > 0 && (
              <span className="text-xs text-kid-blue">{topic.quizCount} 题测验</span>
            )}
            {locked && <span className="text-xs text-gray-400">前置未解锁</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
