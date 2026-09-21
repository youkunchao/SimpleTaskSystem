import React, { useRef, useState, useEffect, useMemo } from 'react';
import Icon from './Icon.jsx';
import { useLandscape } from '../hooks/useLandscape.js';

/* ==================== 轨道布局常量（单位 px） ==================== */
const SLOT = 116;        // 每个节点占用的槽位长度（方块宽度 + 间距）
const BLOCK = 84;        // 汉字方块边长
const CIRCLE = 62;       // 练习圆点直径
const PAD = 56;          // 轨道两端留白，保证首尾节点也能滚到中间
const BUFFER = 4;        // ★懒加载：可视区域前后各额外渲染 4 个节点
const WAVE = 40;         // 路径弯曲幅度，让小路像游戏里的蜿蜒小道
const OVER_DAMP = 0.35;  // 拖出边界后的阻尼系数（橡皮筋手感）
const FRICTION = 0.94;   // 松手后惯性每帧衰减系数
const MIN_SPEED = 0.02;  // 惯性停止阈值（px/ms）
const CLICK_SLOP = 6;    // 位移小于该值才算点击，用于区分"拖拽"和"点击"

// 方块配色：已完成绿 / 当前橙黄 / 未解锁蓝（加厚立体边 + 落地投影，像立在地面上的积木）
const CUBE = {
  done: { background: 'linear-gradient(180deg,#9BEA86,#4FC437)', boxShadow: 'inset 0 4px 0 rgba(255,255,255,.8), 0 10px 0 #2E7D1E, 0 16px 12px rgba(0,0,0,.22)' },
  current: { background: 'linear-gradient(180deg,#FFE27A,#FFB01F)', boxShadow: 'inset 0 4px 0 rgba(255,255,255,.85), 0 10px 0 #C9760A, 0 16px 12px rgba(0,0,0,.22)' },
  locked: { background: 'linear-gradient(180deg,#7CC3FF,#3C82EE)', boxShadow: 'inset 0 4px 0 rgba(255,255,255,.8), 0 10px 0 #244FA0, 0 16px 12px rgba(0,0,0,.22)' },
};
// 练习节点（蓝色圆形）
const PRACTICE = { background: 'linear-gradient(180deg,#7CC7FF,#3E8FE0)', boxShadow: '0 10px 0 #2B6FB5, 0 16px 12px rgba(0,0,0,.22)' };

// 路旁装饰（近景，随地图滚动，移动最快）
const DECOR = [
  { icon: '🌸', cls: 'd-flower', size: 30 },
  { icon: '🌳', cls: 'd-tree', size: 42 },
  { icon: '🍄', cls: 'd-mush', size: 26 },
  { icon: '🌿', cls: 'd-grass', size: 26 },
  { icon: '🐰', cls: 'd-bunny', size: 30 },
  { icon: '🌼', cls: 'd-flower', size: 28 },
];
// 已学字块的小标记（星星 / 旗帜 / 脚印）
const BADGE = ['⭐', '🚩', '🐾'];

// 由一串点生成平滑的曲线路径（二次贝塞尔，穿过每个节点中心）
function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]} ${pts[0][1]}` : '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q ${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

/**
 * 汉字轨道地图（自适应方向）
 * - 横屏：一条横向轨道，手指左右拖拽平移
 * - 竖屏：一条纵向轨道，手指上下拖拽平移
 * - 松手后有滑动惯性，拖到两端有阻尼回弹
 * - ★懒加载：只渲染"可视区域 + 前后各 BUFFER 个"节点，滑出视野的节点直接不渲染，
 *   所以即使有上千个字也不会一次性渲染卡顿
 */
export default function HanziMap({
  chars, currentIdx, unlockedIdx = currentIdx, onPick, onLockedPick, child,
  onBack, onSettings, onBooks, onReview, onLibrary,
}) {
  const landscape = useLandscape();
  const axis = landscape ? 'x' : 'y';      // x=左右移动(横屏)，y=上下移动(竖屏)
  const isX = axis === 'x';

  /**
   * 构造节点数组：汉字方块 + 每 5 个字插入一个圆形练习节点
   * type(类型) / text(文字) / index(在轨道上的下标，决定沿轴位置)
   */
  const nodes = useMemo(() => {
    const arr = [];
    (chars || []).forEach((c, i) => {
      arr.push({ key: 'c' + c.id, type: 'char', text: c.hanzi, ci: i });
      if ((i + 1) % 5 === 0) arr.push({ key: 'p' + i, type: 'practice', text: String(i + 1) });
    });
    arr.forEach((n, i) => { n.index = i; });
    return arr;
  }, [chars]);

  // 轨道总长度 = 节点数 × 槽位长 + 两端留白
  const trackTotal = PAD * 2 + nodes.length * SLOT;

  const winRef = useRef(null);
  const [viewport, setViewport] = useState(0);   // 可视窗口沿轴方向的尺寸
  const [scroll, setScroll] = useState(0);       // 已滚动的距离（0 = 起点）
  const [crossSize, setCrossSize] = useState(360); // 垂直轴（屏幕宽/高）的尺寸，用于路径与节点横向定位
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, start: 0, startScroll: 0, lastT: 0, vel: 0, moved: 0 });
  const raf = useRef(0);

  const maxScroll = Math.max(0, trackTotal - viewport);
  const clamp = (v) => Math.min(maxScroll, Math.max(0, v));

  /** 测量可视窗口尺寸（跟随窗口/容器变化），尺寸变化时夹紧滚动位置（旋转/分屏兼容） */
  useEffect(() => {
    const el = winRef.current;
    if (!el) return;
    const measure = () => {
      const size = isX ? el.clientWidth : el.clientHeight;
      const cross = isX ? el.clientHeight : el.clientWidth;
      setViewport(size);
      setCrossSize(cross);
      setScroll((s) => Math.min(s, Math.max(0, trackTotal - size)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [trackTotal, axis]);

  /** 自动居中：把【当前学习的汉字节点】移到视口中央；换方向/换字只居中一次 */
  const centeredKey = useRef('');
  useEffect(() => {
    if (!viewport || !nodes.length) return;
    const key = `${axis}-${currentIdx}-${nodes.length}`;
    if (centeredKey.current === key) return;
    centeredKey.current = key;
    const idx = nodes.findIndex(n => n.type === 'char' && n.ci === currentIdx);
    const center = PAD + (idx < 0 ? 0 : idx) * SLOT + SLOT / 2 - viewport / 2;
    setScroll(clamp(center));
  }, [viewport, nodes.length, currentIdx, axis]);

  /** 停止惯性动画 */
  const stopInertia = () => cancelAnimationFrame(raf.current);

  /** 松手后的惯性滑动 + 越界回弹（requestAnimationFrame 驱动） */
  const runInertia = () => {
    let vel = drag.current.vel;
    const step = () => {
      vel *= FRICTION;
      setScroll((s) => {
        let next = s + vel * 16;
        // 越界时把距离按阻尼缩回，形成"橡皮筋"回弹
        if (next < 0) next = next * 0.6;
        if (next > maxScroll) next = maxScroll + (next - maxScroll) * 0.6;
        return next;
      });
      if (Math.abs(vel) > MIN_SPEED) {
        raf.current = requestAnimationFrame(step);
      } else {
        setScroll((s) => clamp(s));   // 惯性结束后吸附回合法范围
      }
    };
    raf.current = requestAnimationFrame(step);
  };

  /* -------------------- 拖拽事件（鼠标 + 触摸统一用 Pointer 事件） -------------------- */
  const posOf = (e) => (isX ? e.clientX : e.clientY);

  const onDown = (e) => {
    stopInertia();
    drag.current = { active: true, start: posOf(e), startScroll: scroll, lastT: performance.now(), vel: 0, moved: 0 };
    setDragging(true);
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const delta = posOf(e) - d.start;
    d.moved = Math.max(d.moved, Math.abs(delta));
    let next = d.startScroll - delta;             // 手指向起点方向拖 → 看到前面的内容
    // 超出边界时加阻尼，越拖越费劲（橡皮筋）
    if (next < 0) next = next * OVER_DAMP;
    else if (next > maxScroll) next = maxScroll + (next - maxScroll) * OVER_DAMP;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.vel = (next - scroll) / dt;                 // 记录速度用于惯性
    d.lastT = now;
    setScroll(next);
  };

  const onUp = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    runInertia();
  };

  /** 点击节点：拖动超过阈值就不算点击 */
  const onNodeTap = (n) => {
    if (drag.current.moved > CLICK_SLOP) return;
    if (n.type === 'char') {
      if (n.ci > unlockedIdx) { onLockedPick && onLockedPick(); return; } // 未解锁：主线模式不可跳学
      onPick && onPick(n.ci);                                       // 汉字方块 → 单字学习页
    } else {
      onReview && onReview();                                       // 练习圆块 → 复习练习页
    }
  };

  useEffect(() => stopInertia, []);

  /**
   * ★ 懒加载核心：根据当前滚动位置，算出需要渲染的节点区间
   * 只有这个区间内的节点会被渲染成 DOM；滑远的节点直接不渲染。
   */
  const startIdx = Math.max(0, Math.floor(scroll / SLOT) - BUFFER);
  const endIdx = Math.min(nodes.length - 1, Math.ceil((scroll + (viewport || 360)) / SLOT) + BUFFER);
  const visible = nodes.slice(startIdx, endIdx + 1);

  // 底部功能入口
  const action = { books: onBooks, review: onReview, library: onLibrary };
  const ACTIONS = [
    { key: 'books', label: '子集绘本', icon: 'book', color: 'text-kid-blue' },
    { key: 'review', label: '复习巩固', icon: 'refresh', color: 'text-kid-orange' },
    { key: 'library', label: '字库', icon: 'listChecks', color: 'text-kid-purple' },
  ];

  const transition = dragging ? 'none' : 'transform .5s cubic-bezier(.22,1,.36,1)';
  const innerStyle = isX
    ? { width: trackTotal, height: '100%', transform: `translateX(${-scroll}px)`, transition }
    : { width: '100%', height: trackTotal, transform: `translateY(${-scroll}px)`, transition };
  // 视差辅助：根据滚动量给远景层不同的位移比例（近快远慢）
  const par = (f) => isX
    ? { transform: `translateX(${-scroll * f}px)` }
    : { transform: `translateY(${-scroll * f}px)` };

  // 弯曲地图路径：穿过每个节点中心
  const roadD = useMemo(() => {
    if (!nodes.length) return '';
    const pts = nodes.map((n) => {
      const a = PAD + n.index * SLOT + SLOT / 2;
      const c = (crossSize || 360) / 2 + Math.sin(n.index * 0.7) * WAVE;
      return isX ? [a, c] : [c, a];
    });
    return smoothPath(pts);
  }, [nodes, crossSize, isX]);

  return (
    <div data-axis={axis}
      className="scene relative overflow-hidden flex flex-col w-full h-[100dvh]"
      style={{ backgroundImage: 'url(/assets/map-scene.png)', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: 0 }}>
      {/* 远景：太阳 */}
      <div className="map-sun" />
      {/* 远景：天空云朵（卡通蓬松，缓慢飘动 + 轻微视差） */}
      <div className="map-clouds" style={par(0.10)}>
        <span className="cloud c1" />
        <span className="cloud c2" />
        <span className="cloud c3" />
      </div>
      {/* 远山（最慢，制造纵深） */}
      <div className="map-hills-far" style={par(0.04)} />
      {/* 中景山丘 / 树林（稍快） */}
      <div className="map-hills-mid" style={par(0.16)} />
      {/* 飞过的蝴蝶 / 小鸟（轻柔） */}
      <div className="map-flyers">
        <span className="butterfly b1">🦋</span>
        <span className="butterfly b2">🦋</span>
        <span className="bird">🐦</span>
      </div>
      {/* 前景草地（固定，强化近大远小的纵深） */}
      <div className="map-fore">
        <span className="bush l">🌳</span>
        <span className="bush r">🌲</span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-emerald-900/10" />

      {/* 顶部：返回 + 头像 / 设置 */}
      <div className="relative z-20 flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-90" title="返回">
            <Icon name="back" size={20} className="text-gray-600" />
          </button>
          <button onClick={onBack} className="w-11 h-11 rounded-full bg-white/90 shadow flex items-center justify-center border-2 border-white active:scale-90" title="切换孩子">
            <Icon name={child?.avatar || 'smile'} size={24} className="text-kid-orange" />
          </button>
        </div>
        <button onClick={onSettings} className="w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center active:scale-90" title="设置">
          <Icon name="settings" size={20} className="text-gray-600" />
        </button>
      </div>

      {/* 本关进度 */}
      <div className="relative z-10 flex justify-center mt-1">
        <span className="bg-white/80 backdrop-blur rounded-full px-3 py-1 text-xs font-bold text-gray-600 shadow">
          已学 {Math.max(0, currentIdx)} / {chars.length} · {isX ? '左右拖动' : '上下拖动'}
        </span>
      </div>

      {/* ===== 轨道：外层固定高度 + overflow hidden，作为可视窗口 ===== */}
      <div ref={winRef} className="track-win relative z-10 flex-1 mt-2"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        onPointerLeave={onUp} onPointerCancel={onUp}>
        {/* 内部长轨道：整条轨道平移，拖到边界有阻尼回弹；松手后靠 transition 平滑归位 */}
        <div className="track-inner" style={innerStyle}>
          {/* 弯曲的地图路径（石板路风）：穿过每个节点中心 */}
          <svg className="map-road"
            width={isX ? trackTotal : (crossSize || 360)}
            height={isX ? (crossSize || 360) : trackTotal}
            viewBox={`0 0 ${isX ? trackTotal : (crossSize || 360)} ${isX ? (crossSize || 360) : trackTotal}`}
            preserveAspectRatio="none">
            <path className="road-edge" d={roadD} fill="none" />
            <path className="road-base" d={roadD} fill="none" />
            <path className="road-dash" d={roadD} fill="none" />
          </svg>

          {/* 路旁装饰（花草 / 树木 / 小动物）：随地图滚动 = 近景，移动最快 */}
          {visible.map((n) => {
            const size = n.type === 'char' ? BLOCK : CIRCLE;
            const a = PAD + n.index * SLOT + SLOT / 2;
            const c = (crossSize || 360) / 2 + Math.sin(n.index * 0.7) * WAVE;
            const side = n.index % 2 === 0 ? -1 : 1;
            const deco = DECOR[n.index % DECOR.length];
            const dStyle = isX
              ? { left: a, top: c + side * (size / 2 + 26) }
              : { top: a, left: c + side * (size / 2 + 26) };
            return (
              <span key={'d' + n.key} className={`map-decor ${deco.cls}`}
                style={{ ...dStyle, fontSize: deco.size }}>{deco.icon}</span>
            );
          })}

          {/* ★ 这里只渲染 visible（可视区 + 前后各 4 个），而不是全部节点 */}
          {visible.map((n) => {
            const size = n.type === 'char' ? BLOCK : CIRCLE;
            const a = PAD + n.index * SLOT + (SLOT - size) / 2;   // 沿轴位置
            const c = (crossSize || 360) / 2 + Math.sin(n.index * 0.7) * WAVE - size / 2; // 垂直轴位置
            let base, cls = 'track-node ';
            let status = null;
            if (n.type === 'char') {
              status = n.ci < currentIdx ? 'done' : n.ci === currentIdx ? 'current' : 'locked';
              base = { ...CUBE[status] };
              if (status === 'current') cls += 'cube-glow ';   // 当前学习：金色呼吸光圈
              if (status === 'locked') cls += 'is-locked ';    // 未解锁：轻微灰色锁定
              cls += 'hz-tile';
            } else {
              base = { ...PRACTICE, borderRadius: '50%' };
            }
            const style = isX
              ? { ...base, width: size, height: size, left: a, top: c }
              : { ...base, width: size, height: size, top: a, left: c };
            return (
              <div key={n.key} className={cls} style={style} onClick={() => onNodeTap(n)}>
                <span className="tile-shadow" />
                {status === 'current' && <span className="tile-halo" />}
                {status === 'done' && <span className="tile-badge">{BADGE[n.ci % BADGE.length]}</span>}
                {status === 'locked' && <span className="tile-lock">🔒</span>}
                <span className="text-white font-bold" style={{ fontSize: n.type === 'char' ? 34 : 22 }}>{n.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧功能入口：竖排、仅图标（不显示文字） */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
        {ACTIONS.map((a) => (
          <button key={a.key} onClick={action[a.key]} title={a.label} aria-label={a.label}
            className="w-12 h-12 rounded-2xl bg-white/90 shadow-lg flex items-center justify-center border-2 border-white active:scale-90">
            <Icon name={a.icon} size={26} className={a.color} />
          </button>
        ))}
      </div>
    </div>
  );
}
