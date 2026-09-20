import { speak } from '../api.js';

// 复习项可能来自任意模块，各模块的内容字段不同（汉字是 hanzi、单词是 english、
// 绘本/语法/听力/阅读是 title 或 question），统一取一个可展示的文本
export const MODULE_LABELS = {
  characters: '汉字',
  english: '英语单词',
  math: '数学',
  books: '绘本',
  grammar: '语法',
  listening: '听力',
  reading: '英语阅读',
  'chinese-reading': '中文阅读',
};

// 艾宾浩斯五级复习间隔（天）
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15];

export function reviewText(detail) {
  if (!detail) return '复习';
  return detail.hanzi || detail.english || detail.title || detail.question || '复习';
}

export function reviewEmoji(detail) {
  return detail?.emoji || detail?.cover || '📖';
}

// 中文类模块用中文朗读，英文类用英语朗读
const ZH_MODULES = new Set(['characters', 'chinese-reading', 'books', 'math']);

export function speakReview(item, options) {
  const d = item.detail || {};
  const text = d.hanzi || d.english || d.title || d.question;
  if (!text) return false;
  return speak(text, ZH_MODULES.has(item.module) ? 'zh-CN' : 'en-US', options);
}
