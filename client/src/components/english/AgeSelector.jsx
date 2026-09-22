import React from 'react';
import Icon from '../Icon.jsx';
import { useLandscape } from '../../hooks/useLandscape.js';

// 年龄段选择（海洋主题）：吉祥物引导气泡 + 年龄气泡，按孩子年龄推荐
export default function AgeSelector({ groups, active, recommended, onPick }) {
  const landscape = useLandscape();
  if (!groups || groups.length === 0) {
    return <p className="text-center text-white/80 py-10">加载中…</p>;
  }

  return (
    <div className="relative z-10 px-4 py-4">
      {/* 吉祥物引导气泡 */}
      <div className="flex items-end gap-2 mb-4">
        <img
          src="/assets/english/mascot.png"
          alt="mascot"
          className="mascot w-16 h-16 sm:w-20 sm:h-20 floaty"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="glass rounded-2xl rounded-bl-sm px-4 py-2 text-[15px] font-bold text-kid-navy">
          请选择你的年龄，不同年龄会有不一样的学习内容哦 🐠
        </div>
      </div>

      <div className={landscape ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
        {groups.map((g, i) => {
          const on = g.key === active;
          const rec = g.key === recommended;
          return (
            <button
              key={g.key}
              onClick={() => onPick(g.key)}
              className={`pop-in glass flex items-center gap-3 rounded-3xl text-left transition active:scale-95 ${
                landscape ? 'p-3' : 'p-4'
              } ${rec ? 'ring-4 ring-kid-yellow/80' : ''}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className={`shrink-0 rounded-2xl flex items-center justify-center font-extrabold text-white ${
                  landscape ? 'w-12 h-12 text-base' : 'w-16 h-16 text-lg'
                } bg-gradient-to-br from-kid-blue to-kid-purple shadow-md`}
              >
                {String(g.label).replace('岁', '')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-bold text-kid-navy ${landscape ? 'text-base' : 'text-xl'}`}>{g.label}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-kid-green/20 text-kid-green">
                    {g.mode}
                  </span>
                  {rec && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-kid-yellow text-kid-ink">
                      推荐
                    </span>
                  )}
                </div>
                <div className={`text-kid-navy/70 mt-0.5 ${landscape ? 'text-[11px] leading-tight' : 'text-sm'}`}>
                  {g.desc}
                </div>
                <div className="text-xs text-kid-blue mt-1 inline-flex items-center gap-1 font-bold">
                  <Icon name="shapes" size={13} />
                  {g.category_count} 个主题
                </div>
              </div>
              <Icon name="chevronRight" size={20} className="text-kid-blue/50 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
