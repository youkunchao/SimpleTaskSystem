import React, { useMemo } from 'react';
import MathTopicCard from './MathTopicCard.jsx';
import { BOARDS, BOARD_COLORS } from '../../utils/mathContent.js';

// 知识点列表：按四大板块分组展示（对应英语 CategoryGrid 的列表）
export default function MathTopicList({ topics, onPick }) {
  const groups = useMemo(() => {
    const g = {};
    for (const t of topics) (g[t.board] ||= []).push(t);
    return g;
  }, [topics]);

  if (topics.length === 0) {
    return <p className="text-center text-gray-400 py-8">这个学段还没有内容哦～</p>;
  }

  return (
    <div className="space-y-5">
      {BOARDS.map((b) =>
        groups[b] ? (
          <div key={b}>
            <h3 className={`text-lg font-bold mb-2 ${BOARD_COLORS[b].text}`}>{b}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groups[b].map((t) => (
                <MathTopicCard key={t.id} topic={t} color={BOARD_COLORS[b]} onPick={onPick} />
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
