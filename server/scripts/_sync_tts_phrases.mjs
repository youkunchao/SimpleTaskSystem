// 把数学「讲解步骤文本」与「题面」同步进 TTS 预合成清单（phrases.json + manifest.json）。
// 新增的 16 个知识点讲解步骤此前未纳入，导致 full-course-test 的"数学讲题语音覆盖率"下跌。
// 架构上未合成内容由 /api/tts 返回 404 走 Web Speech 兜底，这里只补全"应合成"清单；
// 待在可连通微软的机器上跑 gen_tts.py 即可生成对应 mp3。
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { TOPICS, QUIZZES } from '../src/data/math.generated.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TTS = path.resolve(__dirname, '..', 'tts-audio');
const phrasesPath = path.join(__dirname, 'phrases.json');
const manifestPath = path.join(TTS, 'manifest.json');

// 与前端 utils/mathContent.js / full-course-test.js 的 stripForSpeech 保持一致（用 RegExp 构造规避字面 emoji 规范化）
const EMOJI_RE = new RegExp('[\\u{1F000}-\\u{1FAFF}\\u{1F1E6}-\\u{1F1FF}\\u{2190}-\\u{2BFF}\\u{FE0F}\\u{200D}]', 'gu');
const stripForSpeech = (text) =>
  String(text || '')
    .replace(EMOJI_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const existingKeys = new Set(Object.values(phrases).map((v) => v.key));
let added = 0;
let nextIdx = Math.max(...Object.keys(phrases).map((k) => Number(k))) + 1;

const ensure = (rawText) => {
  const text = stripForSpeech(rawText);
  if (!text) return;
  const key = `zh-CN|teach|${text}`;
  if (!manifest[key]) {
    manifest[key] = crypto.createHash('sha1').update(key).digest('hex').slice(0, 12) + '.mp3';
    added++;
  }
  if (!existingKeys.has(key)) {
    phrases[String(nextIdx++)] = {
      key, text, role: 'teach', lang: 'zh-CN', voice: 'zh-CN-XiaoxiaoNeural',
    };
    existingKeys.add(key);
  }
};

// 1) 所有真实知识点的讲解步骤文本
for (const t of TOPICS) {
  for (const s of (t.content || [])) ensure(s.text);
}
// 2) 所有测验题面（同属 teach 语音内容）
for (const q of QUIZZES) ensure(q.question);

fs.writeFileSync(manifestPath, JSON.stringify(manifest));
fs.writeFileSync(phrasesPath, JSON.stringify(phrases));
console.log(`新增清单条目 ${added}`);
console.log(`manifest 总条数 ${Object.keys(manifest).length}，phrases 总条数 ${Object.keys(phrases).length}`);
