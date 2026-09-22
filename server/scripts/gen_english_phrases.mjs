/**
 * 枚举英语模块的固定朗读文案，导出 phrases_en.json 供 python edge-tts 批量合成。
 *
 * 音色与中文保持一致的原则：
 *  - 英文文本（单词 / 英文例句）→ en-US-AriaNeural：温暖清晰的女老师，对应中文的晓晓同一人设。
 *    （不用晓晓念英文：她是中文音色，念英文会带中文口音，不利于孩子模仿发音。）
 *  - 英文模块里的中文（中文词义 / 白话讲解 / 例句翻译）→ zh-CN-XiaoxiaoNeural：
 *    与识字五步完全是同一个晓晓，孩子听到的中文始终一致。
 *  - 每个单词额外合成一条慢速版（role='slow'，rate -30%），方便孩子跟读。
 *
 * 运行：node server/scripts/gen_english_phrases.mjs  （需后端在 3001 运行）
 * 然后：python server/scripts/gen_tts.py
 */
import fs from 'fs';

const WORDS_API = 'http://localhost:3001/api/courses/words';

async function main() {
  const res = await fetch(WORDS_API);
  if (!res.ok) {
    console.error('获取单词失败:', res.status, '（后端是否在 3001 运行？）');
    process.exit(1);
  }
  const words = await res.json();

  const map = new Map();
  const add = (text, role, lang, voice, rate) => {
    if (!text || !String(text).trim()) return;
    const t = String(text).trim();
    const key = `${lang}|${role}|${t}`; // 与后端 /api/tts、前端 cacheKey 完全一致的 key
    if (map.has(key)) return;
    map.set(key, { key, text: t, role, lang, voice, ...(rate ? { rate } : {}) });
  };

  for (const w of words) {
    add(w.english, 'teach', 'en-US', 'en-US-AriaNeural');                 // 单词
    add(w.english, 'slow', 'en-US', 'en-US-AriaNeural', '-30%');          // 单词·慢速
    add(w.example_en, 'teach', 'en-US', 'en-US-AriaNeural');              // 英文例句
    add(w.chinese, 'teach', 'zh-CN', 'zh-CN-XiaoxiaoNeural');             // 中文词义（晓晓）
    add(w.meaning, 'teach', 'zh-CN', 'zh-CN-XiaoxiaoNeural');             // 白话讲解（晓晓）
    add(w.example_cn, 'teach', 'zh-CN', 'zh-CN-XiaoxiaoNeural');          // 例句中文翻译（晓晓）
  }

  const out = [...map.values()];
  const outPath = new URL('./phrases_en.json', import.meta.url);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  const en = out.filter((p) => p.lang === 'en-US').length;
  const zh = out.filter((p) => p.lang === 'zh-CN').length;
  console.log(`已写出 ${out.length} 条英语文案（英文 ${en} / 中文 ${zh}）-> ${outPath.pathname}`);
}

main().catch((e) => {
  console.error('生成失败:', e);
  process.exit(1);
});
