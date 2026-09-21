/**
 * 枚举「识字五步」全部固定朗读文案，导出 phrases.json 供 python edge-tts 批量合成。
 *
 * 设计：
 *  - 字表来自本机后端 GET /api/courses/characters（与前端同源数据，保证文案完全一致）。
 *  - 内容仍用前端同一套 lessonContent.js 推导，避免重复实现导致文案漂移。
 *  - 只枚举"固定文案"（不随学习进度变化的朗读），动态内容（绘本/跟读）走前端 Web Speech 兜底。
 *
 * 运行：node server/scripts/gen_phrases.mjs  （需后端在 3001 运行）
 */
import { buildLesson } from '../../client/src/utils/lessonContent.js';

const CHARS_API = 'http://localhost:3001/api/courses/characters';

function voiceOf(lang, role) {
  if (lang === 'en-US') return role === 'feedback' ? 'en-US-JennyNeural' : 'en-US-AriaNeural';
  return role === 'feedback' ? 'zh-CN-XiaoyiNeural' : 'zh-CN-XiaoxiaoNeural';
}

async function main() {
  const res = await fetch(CHARS_API);
  if (!res.ok) {
    console.error('获取字表失败:', res.status, '(后端是否在 3001 运行？)');
    process.exit(1);
  }
  const chars = await res.json();
  console.log('字表数量:', chars.length);

  const set = new Set(chars.map((c) => c.hanzi));
  const map = new Map(); // key -> phrase

  const add = (text, role = 'teach', lang = 'zh-CN') => {
    if (!text || !text.trim()) return;
    text = text.trim();
    const key = `${lang}|${role}|${text}`;
    if (map.has(key)) return;
    map.set(key, { key, text, role, lang, voice: voiceOf(lang, role) });
  };

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const lesson = buildLesson(c, chars, i);

    add(c.hanzi, 'teach', 'zh-CN'); // 听读音（单字）
    add(lesson.play.旁白配音, 'teach', 'zh-CN'); // 玩·旁白（自动播）
    add(`${lesson.know.oral}。${lesson.know.shapeHint}`, 'teach', 'zh-CN'); // 认·听讲解（口语释义+字形提示）
    for (const w of lesson.know.words || []) add(w.word, 'teach', 'zh-CN'); // 认·词组卡片
    if (lesson.speak.sentence) add(lesson.speak.sentence, 'teach', 'zh-CN'); // 说·短句
  }

  const phrases = [...map.values()];
  const outPath = new URL('./phrases.json', import.meta.url);
  const fs = await import('fs');
  fs.writeFileSync(outPath, JSON.stringify(phrases, null, 2), 'utf8');
  console.log('已写出', phrases.length, '条固定文案 ->', outPath.pathname);
}

main().catch((e) => {
  console.error('生成失败:', e);
  process.exit(1);
});
