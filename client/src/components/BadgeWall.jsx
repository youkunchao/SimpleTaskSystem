import React, { useMemo, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * 荣誉陈列柜（徽章墙）
 *
 * 数据驱动：每枚徽章自带 metric（统计指标）与 requirement（目标值），
 * 后端 /api/rewards 返回 stats（各维度实时统计），前端据此算出"当前/目标、还差多少"。
 * 扩充徽章只需在后端加数据，这里无需改动。
 *
 * 两种用法：
 *  - 完整模式（缺省）：独立徽章页使用，展示全部徽章 + 筛选；
 *  - 预览模式（传 limit）：奖励页内嵌，只展示少量（已获得优先，不足则补"最接近达成"的），
 *    避免把奖励页拉得过长，并提供 onViewAll 跳转到徽章主页。
 */

// 指标元信息：文案单位 + 系列配色（同一维度同色，一眼看出成长路线）
const METRIC_META = {
  study_count: { label: '累计学习次数', unit: '次', from: 'from-emerald-300', to: 'to-emerald-500', ring: '#34D399' },
  correct_count: { label: '答对题目数', unit: '题', from: 'from-sky-300', to: 'to-blue-500', ring: '#60A5FA' },
  stars: { label: '星星总数', unit: '颗', from: 'from-amber-200', to: 'to-orange-500', ring: '#FFB01F' },
  streak: { label: '连续打卡', unit: '天', from: 'from-pink-300', to: 'to-pink-500', ring: '#FF6B9D' },
  char_mastered: { label: '已掌握汉字', unit: '个', from: 'from-orange-300', to: 'to-orange-500', ring: '#FF8C42' },
  english_mastered: { label: '已掌握单词', unit: '个', from: 'from-indigo-300', to: 'to-indigo-500', ring: '#818CF8' },
  math_correct: { label: '数学答对题数', unit: '题', from: 'from-cyan-300', to: 'to-cyan-500', ring: '#22D3EE' },
  books_read: { label: '读完绘本', unit: '本', from: 'from-lime-300', to: 'to-lime-500', ring: '#A3E635' },
  chinese_mastered: { label: '完成中文阅读', unit: '篇', from: 'from-teal-300', to: 'to-teal-500', ring: '#2DD4BF' },
  review_mastered: { label: '复习到精通', unit: '个', from: 'from-fuchsia-300', to: 'to-fuchsia-500', ring: '#E879F9' },
  days_active: { label: '学习天数', unit: '天', from: 'from-violet-300', to: 'to-violet-500', ring: '#A78BFA' },
  study_minutes: { label: '累计学习时长', unit: '分钟', from: 'from-rose-300', to: 'to-rose-500', ring: '#FB7185' },
};

// 未知指标（或手工徽章无 metric）的兜底样式
const FALLBACK = { label: '完成条件', unit: '次', from: 'from-gray-200', to: 'to-gray-400', ring: '#9CA3AF' };

// 把后端徽章补上「系列色 + 当前进度」
function decorate(badge, stats) {
  const meta = METRIC_META[badge.metric] || FALLBACK;
  const target = Number(badge.requirement || 0);
  const raw = badge.metric ? Number(stats?.[badge.metric] ?? 0) : 0;
  const percent = badge.unlocked
    ? 100
    : target > 0
      ? Math.min(100, Math.round((raw / target) * 100))
      : 0;
  return {
    ...badge,
    series: meta,
    unit: meta.unit,
    metricLabel: meta.label,
    target,
    current: Math.min(raw, target),
    percent,
    remain: Math.max(0, target - raw),
  };
}

// 圆形奖章 + （解锁后）高光与对勾
function Medal({ b, size = 72, font = 34 }) {
  return (
    <div
      className={`badge-medal bg-gradient-to-br ${b.series.from} ${b.series.to} ${b.unlocked ? 'badge-float' : ''}`}
      style={{ '--badge-ring': b.series.ring, width: `${size}px`, height: `${size}px` }}
    >
      <span className={`leading-none ${b.unlocked ? '' : 'badge-locked-img'}`} style={{ fontSize: `${font}px` }}>
        {b.icon}
      </span>
      {b.unlocked ? (
        <>
          <span className="badge-shine-wrap"><i className="badge-shine" /></span>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center">
            <Icon name="check" size={14} className="text-kid-green" />
          </span>
        </>
      ) : (
        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center">
          <Icon name="lock" size={13} className="text-gray-400" />
        </span>
      )}
    </div>
  );
}

function ProgressBar({ b, slim = true }) {
  return (
    <div className={`${slim ? 'h-2' : 'h-2.5'} w-full bg-gray-100 rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full bg-gradient-to-r ${b.series.from} ${b.series.to} transition-all duration-500`}
        style={{ width: `${Math.max(4, b.percent)}%` }}
      />
    </div>
  );
}

export default function BadgeWall({ badges, stats, limit, onViewAll }) {
  const [filter, setFilter] = useState('all'); // all | got | todo
  const [openId, setOpenId] = useState(null);
  const previewMode = Number(limit) > 0;

  const list = useMemo(() => badges.map(b => decorate(b, stats)), [badges, stats]);
  const gotCount = list.filter(b => b.unlocked).length;
  const total = list.length;
  const overall = total ? Math.round((gotCount / total) * 100) : 0;

  // 预览模式：已获得的优先展示（成就感），不够数量则用"最接近达成"的补齐（激励）
  const preview = useMemo(() => {
    if (!previewMode) return [];
    const got = list.filter(b => b.unlocked);
    const rest = list.filter(b => !b.unlocked).sort((a, b) => b.percent - a.percent);
    return [...got, ...rest].slice(0, Number(limit));
  }, [list, previewMode, limit]);

  const visible = useMemo(() => {
    if (previewMode) return preview;
    if (filter === 'got') return list.filter(b => b.unlocked);
    if (filter === 'todo') return list.filter(b => !b.unlocked);
    return list;
  }, [list, filter, previewMode, preview]);

  // 下一个目标：进度最高的未解锁徽章（最能激发"再努力一点点"）
  const nextGoal = useMemo(
    () => [...list].filter(b => !b.unlocked).sort((a, b) => b.percent - a.percent)[0],
    [list]
  );

  const open = list.find(b => b.id === openId) || null;

  const filters = [
    { key: 'all', label: '全部', n: total },
    { key: 'got', label: '已获得', n: gotCount },
    { key: 'todo', label: '未解锁', n: total - gotCount },
  ];

  return (
    <div className="card-kid">
      {/* 概览：收集进度 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-extrabold text-kid-ink inline-flex items-center gap-2">
          <Icon name="medal" size={20} className="text-kid-purple" />徽章墙
        </h3>
        {previewMode && onViewAll ? (
          <button onClick={onViewAll} className="chip bg-kid-purple/15 text-kid-purple active:scale-95 transition">
            <Icon name="award" size={13} />{gotCount}/{total} · 查看全部
          </button>
        ) : (
          <span className="chip bg-kid-purple/15 text-kid-purple">
            <Icon name="award" size={13} />{gotCount} / {total}
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-kid-purple to-kid-pink p-4 text-white mb-3">
        <span className="absolute -right-8 -top-10 w-24 h-24 rounded-full bg-white/15" />
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <div className="text-3xl font-extrabold leading-none">
              {gotCount}<span className="text-lg opacity-80">/{total}</span>
            </div>
            <div className="text-xs opacity-90 mt-1">已点亮徽章</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold">{overall}%</div>
            <div className="text-xs opacity-90">收集进度</div>
          </div>
        </div>
        <div className="relative h-2 mt-3 bg-white/25 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${overall}%` }} />
        </div>
      </div>

      {/* 下一个目标：给孩子明确的下一步 */}
      {nextGoal && (
        <button
          onClick={() => setOpenId(nextGoal.id)}
          className="w-full flex items-center gap-3 rounded-2xl bg-kid-yellow/15 p-3 mb-3 text-left active:scale-[0.98] transition"
        >
          <Medal b={nextGoal} size={52} font={26} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-kid-orange flex items-center gap-1">
              <Icon name="target" size={12} />下一个目标
            </div>
            <div className="font-extrabold text-kid-ink truncate">{nextGoal.name}</div>
            <div className="text-xs text-kid-ink/50 mt-0.5">还差 {nextGoal.remain} {nextGoal.unit}</div>
          </div>
          <Icon name="chevronRight" size={18} className="text-kid-orange/60 shrink-0" />
        </button>
      )}

      {/* 筛选（仅完整模式，避免预览卡片过长） */}
      {!previewMode && (
        <div className="flex gap-2 mb-3">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`chip transition active:scale-95 ${
                filter === f.key ? 'bg-kid-orange text-white shadow-kid' : 'bg-gray-100 text-kid-ink/60'
              }`}
            >
              {f.label} {f.n}
            </button>
          ))}
        </div>
      )}

      {/* 徽章格 */}
      {visible.length === 0 ? (
        <p className="text-center text-kid-ink/40 py-6">
          {filter === 'got' ? '还没获得徽章，继续加油！' : '全部徽章都收集齐啦，太厉害了！'}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map(b => (
            <button
              key={b.id}
              onClick={() => setOpenId(b.id)}
              className={`rounded-2xl p-3 text-center transition active:scale-95 ${
                b.unlocked ? 'bg-white shadow-kid' : 'bg-gray-50'
              }`}
            >
              <div className="flex justify-center">
                <Medal b={b} />
              </div>
              <div className="text-sm font-bold text-kid-ink mt-2 truncate">{b.name}</div>
              {b.unlocked ? (
                <span className="chip mt-1 bg-kid-green/15 text-kid-green !text-[11px] !py-0.5">已获得</span>
              ) : (
                <div className="mt-1.5">
                  <ProgressBar b={b} />
                  <div className="text-[11px] text-kid-ink/45 mt-1">
                    {b.current}/{b.target} {b.unit}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 预览模式：底部大按钮跳转徽章主页 */}
      {previewMode && onViewAll && total > visible.length && (
        <button onClick={onViewAll} className="btn-kid mt-4 w-full bg-kid-purple text-white text-base">
          <Icon name="medal" size={20} />查看全部 {total} 枚徽章
        </button>
      )}

      {/* 详情弹层 */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
          onClick={() => setOpenId(null)}
          role="presentation"
        >
          <div
            className="sheet-in w-full max-w-sm bg-white rounded-[28px] shadow-kid-lg p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center mb-3">
              <Medal b={open} size={96} font={46} />
            </div>
            <h4 className="text-xl font-extrabold text-kid-ink">{open.name}</h4>
            <p className="text-sm text-kid-ink/55 mt-1">{open.description}</p>

            <div className="mt-4 rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-kid-ink/60 mb-1.5">
                <span>{open.metricLabel}</span>
                <span>{open.unlocked ? '已达成 🎉' : `${open.current} / ${open.target} ${open.unit}`}</span>
              </div>
              <ProgressBar b={open} slim={false} />
              {!open.unlocked && (
                <p className="text-xs text-kid-orange font-bold mt-2">
                  还差 {open.remain} {open.unit} 就能点亮啦，加油！
                </p>
              )}
            </div>

            <button onClick={() => setOpenId(null)} className="btn-kid mt-4 w-full bg-kid-purple text-white text-base">
              知道啦
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
