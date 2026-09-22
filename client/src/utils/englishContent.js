// 英语模块的常量与派生逻辑（与 UI 解耦，便于校验脚本复用）

// 三大模式：认知（看图认单词）/ 英语沟通（口语跟读）/ 技能练习（语法·听力·阅读·错题）
export const MODES = [
  { id: 'cognition', name: '认知', icon: 'shapes', desc: '看图认单词，听中文讲解' },
  { id: 'speaking', name: '英语沟通', icon: 'mic', desc: '跟着读，开口说英语' },
  { id: 'skills', name: '技能练习', icon: 'grad', desc: '语法 / 听力 / 阅读 / 错题' },
];

// 按孩子档案里的年龄推荐年龄段档位（后端 key 形如 '3-4'）
export function ageGroupOfChild(age) {
  const n = Number(age);
  if (!Number.isFinite(n) || n <= 4) return '3-4';
  if (n === 5) return '4-5';
  if (n === 6) return '5-6';
  if (n === 7) return '6-7';
  return '7-8';
}

// 断点续学的 scope：新体系用 `cat:<分类id>`，与旧的「中文分类名」明确区分，互不覆盖
export const CAT_SCOPE = (categoryId) => `cat:${categoryId}`;

// 单词讲解：统一兜底，保证界面永远有内容可读（缺字段也不会空白）
export function explainOf(word) {
  // 音标讲解在库里存的是 JSON 字符串，解析失败就当没有，绝不让页面崩
  let tips = [];
  try {
    const raw = word?.phonetic_tips;
    if (raw) tips = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    tips = [];
  }
  if (!Array.isArray(tips)) tips = [];
  return {
    meaning: word?.meaning || `这就是「${word?.chinese || ''}」`,
    exampleEn: word?.example_en || '',
    exampleCn: word?.example_cn || '',
    phonetic: word?.phonetic || '',
    tips: tips.filter((t) => t && t.sym && t.tip),
  };
}
