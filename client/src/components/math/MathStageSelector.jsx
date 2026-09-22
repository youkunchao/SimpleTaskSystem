import React from 'react';
import Icon from '../Icon.jsx';

// 学段/年级选择（对应英语 AgeSelector）
export default function MathStageSelector({ stages, active, recommended, onPick }) {
  if (!stages || stages.length === 0) {
    return <p className="text-center text-gray-400 py-10">加载中…</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      {stages.map((s) => {
        const isRec = s.key === recommended;
        const isActive = s.key === active;
        return (
          <button
            key={s.key}
            onClick={() => onPick(s.key)}
            className={`relative bg-gradient-to-br ${isRec ? 'from-kid-orange to-kid-yellow' : 'from-kid-green to-kid-blue'} text-white rounded-3xl p-5 text-left shadow-lg hover:scale-105 active:scale-95 transition`}
          >
            {isRec && (
              <span className="absolute top-2 right-2 text-xs bg-white/30 rounded-full px-2 py-0.5 font-bold">
                推荐
              </span>
            )}
            {isActive && (
              <span className="absolute top-2 left-2 text-lg">✅</span>
            )}
            <div className="text-2xl font-bold flex items-center gap-1">
              <Icon name="calculator" size={22} />{s.label}
            </div>
            <div className="text-sm opacity-90 mt-1">
              {s.phase}{s.grade ? ` · 第${s.grade}年` : ''}
            </div>
          </button>
        );
      })}
    </div>
  );
}
