import React, { useState } from 'react';
import { useLandscape } from '../../hooks/useLandscape.js';

// 分类插画：用 AI 生成的主题插画（按中文名映射 slug），缺图时回退数据自带 emoji
const CAT_IMG = {
  服饰: 'clothes', 食物: 'food', 英文字母: 'alphabet', 家庭成员: 'family',
  数字: 'numbers', 水果: 'fruit', 颜色: 'colors', 职业: 'jobs',
  动物: 'animals', 交通工具: 'vehicles',
};

function CategoryCard({ c, landscape, onPick }) {
  const [imgError, setImgError] = useState(false);
  const slug = CAT_IMG[c.name_cn];
  const showImg = slug && !imgError;

  return (
    <button
      onClick={() => onPick(c.id)}
      className="pop-in relative flex items-stretch aspect-[3/2] rounded-3xl overflow-hidden active:scale-95"
      style={{
        background: '#FBF3E3',
        boxShadow: '0 5px 16px rgba(20,70,110,0.22)',
        animationDelay: `${(c.sort || 0) * 40}ms`,
      }}
    >
      {/* 配图：大图铺满；multiply 让源图白底融入卡片，画面更干净、不留白框 */}
      <div className="flex-1 min-w-0 flex items-center justify-center p-1.5">
        {showImg ? (
          <img
            src={`/assets/english/cats/${slug}.png`}
            alt={c.name_cn}
            className="w-full h-full object-contain"
            style={{ mixBlendMode: 'multiply' }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-4xl leading-none">{c.icon || '📘'}</span>
        )}
      </div>

      {/* 名称：右侧竖排（参考图样式） */}
      <div className="w-[34%] shrink-0 flex items-center justify-center py-1.5">
        <span
          className="font-bold select-none"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'upright',
            color: '#6B4E2E',
            letterSpacing: '3px',
            fontSize: landscape ? 16 : 19,
            lineHeight: 1.1,
          }}
        >
          {c.name_cn}
        </span>
      </div>
    </button>
  );
}

// 主题分类宫格：竖屏两列，横屏四列；卡片为「暖色 + 大图 + 竖排名称」
export default function CategoryGrid({ categories, onPick }) {
  const landscape = useLandscape();

  if (!categories || categories.length === 0) {
    return <p className="text-center text-white/80 py-10">这个年龄段还没有主题，换一档看看～</p>;
  }

  return (
    <div className={landscape ? 'grid grid-cols-4 gap-2.5' : 'grid grid-cols-2 gap-3'}>
      {categories.map((c) => (
        <CategoryCard key={c.id} c={c} landscape={landscape} onPick={onPick} />
      ))}
    </div>
  );
}
