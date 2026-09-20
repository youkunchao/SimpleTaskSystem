import React from 'react';

// 主线学习进度条：让孩子看到"我学到第几个了、还剩多少"
export default function LearningProgress({ done, total, unit = '个', onRestart, gradient = 'from-kid-orange to-kid-yellow' }) {
  const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center text-sm text-gray-500 mb-1">
        <span className="font-bold">已学 {done} / {total} {unit}</span>
        <div className="flex items-center gap-2">
          <span>{percent}%</span>
          {onRestart && (
            <button onClick={onRestart} className="text-xs text-kid-blue underline">从头学</button>
          )}
        </div>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
