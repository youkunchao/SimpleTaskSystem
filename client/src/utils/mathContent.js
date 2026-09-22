// 数学模块的常量与派生逻辑（与 UI 解耦，便于复用）

export const BOARDS = ['数与代数', '图形与几何', '统计与概率', '数学思维'];

// 统一成长主线：学段/年级顺序（幼儿在前，小学在后）。与后端 math.generated.js 的 STAGES 对应。
export const MATH_STAGES = [
  { key: '2-3', label: '2-3岁', phase: '幼儿' },
  { key: '3-4', label: '3-4岁', phase: '幼儿' },
  { key: '4-5', label: '4-5岁', phase: '幼儿' },
  { key: '5-6', label: '5-6岁', phase: '幼儿' },
  { key: 'grade1', label: '一年级', phase: '小学', grade: 1 },
  { key: 'grade2', label: '二年级', phase: '小学', grade: 2 },
  { key: 'grade3', label: '三年级', phase: '小学', grade: 3 },
  { key: 'grade4', label: '四年级', phase: '小学', grade: 4 },
  { key: 'grade5', label: '五年级', phase: '小学', grade: 5 },
  { key: 'grade6', label: '六年级', phase: '小学', grade: 6 },
];

// 四大板块配色（延续启蒙星 kid-* 渐变体系）
export const BOARD_COLORS = {
  数与代数: { from: 'from-kid-green', to: 'to-kid-blue', strip: 'bg-kid-green', text: 'text-kid-green', chip: 'bg-kid-green/20 text-kid-green' },
  图形与几何: { from: 'from-kid-blue', to: 'to-kid-purple', strip: 'bg-kid-blue', text: 'text-kid-blue', chip: 'bg-kid-blue/20 text-kid-blue' },
  统计与概率: { from: 'from-kid-pink', to: 'to-kid-orange', strip: 'bg-kid-pink', text: 'text-kid-pink', chip: 'bg-kid-pink/20 text-kid-pink' },
  数学思维: { from: 'from-kid-orange', to: 'to-kid-yellow', strip: 'bg-kid-orange', text: 'text-kid-orange', chip: 'bg-kid-orange/20 text-kid-orange' },
};

// 按孩子年龄推荐学段（后端 key）
export function mathStageOfChild(age) {
  const n = Number(age);
  if (!Number.isFinite(n)) return 'grade1';
  if (n <= 3) return '2-3';
  if (n === 4) return '3-4';
  if (n === 5) return '4-5';
  if (n === 6) return '5-6';
  if (n <= 7) return 'grade1';
  if (n <= 8) return 'grade2';
  if (n <= 9) return 'grade3';
  if (n <= 10) return 'grade4';
  if (n <= 11) return 'grade5';
  return 'grade6';
}

// 断点续学 scope（数学按学段）
export const MATH_SCOPE = (stage) => `math:${stage}`;

// 去掉表情/图形符号等 TTS 读不出来的字符（否则朗读时会穿插"怪音"或直接卡顿）
export function stripForSpeech(text) {
  return String(text || '')
    // 表情、象形符号、变体选择符、区域指示符（旗帜）、杂项符号
    .replace(/[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// 把数学题面转成适合朗读的中文，避免 TTS 把 "+/-/=/?" 读成符号音
export function mathSpeakText(q) {
  if (!q) return '';
  let text = String(q);
  if (text.includes('+') || text.includes('-')) {
    text = text.replace(/\+/g, '加').replace(/-/g, '减').replace(/=/g, '等于').replace(/\?/g, '几');
  }
  return stripForSpeech(text);
}
