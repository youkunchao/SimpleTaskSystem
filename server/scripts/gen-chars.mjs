// 由 characters.txt 生成最终汉字数据（拼音/笔画自动填充）
// 运行: cd <含 pinyin-pro、cnchar 的目录> && node gen-chars.mjs
import fs from 'fs';
import { pinyin } from 'pinyin-pro';
import cnchar from 'cnchar';

const SRC = 'd:/幼儿识字启蒙教育平台开发/server/src/data/characters.txt';
const OUT = 'd:/幼儿识字启蒙教育平台开发/server/src/data/characters.generated.js';
const PER_LEVEL = 50;

// 常见具象字的配图，让孩子看图识字
const EMOJI = {
  日:'☀️',月:'🌙',水:'💧',火:'🔥',山:'⛰️',石:'🪨',田:'🌾',土:'🟤',木:'🌳',禾:'🌾',竹:'🎋',米:'🍚',
  花:'🌸',草:'🌿',树:'🌳',叶:'🍃',果:'🍎',云:'☁️',雨:'🌧️',风:'🌬️',雪:'❄️',电:'⚡',星:'⭐',光:'💡',
  牛:'🐄',羊:'🐑',马:'🐴',兔:'🐰',猫:'🐱',狗:'🐶',鸡:'🐔',鸭:'🦆',鸟:'🐦',虫:'🐛',鱼:'🐟',
  家:'🏠',门:'🚪',窗:'🪟',床:'🛏️',书:'📖',笔:'✏️',纸:'📄',画:'🖼️',车:'🚗',船:'🚢',伞:'☂️',
  衣:'👕',鞋:'👟',帽:'🧢',心:'❤️',手:'✋',足:'🦶',目:'👁️',耳:'👂',口:'👄',头:'🙂',牙:'🦷',
  红:'🔴',黄:'🟡',蓝:'🔵',绿:'🟢',白:'⚪',黑:'⚫',笑:'😊',哭:'😢',爱:'❤️',飞:'✈️',走:'🚶',
  跑:'🏃',坐:'🪑',看:'👀',听:'👂',说:'💬',吃:'🍚',喝:'🥤',饭:'🍚',菜:'🥗',茶:'🍵',蛋:'🥚',
  钟:'🕐',球:'⚽',灯:'💡',刀:'🔪',伞2:'',包:'🎒',鞋2:'',帽2:''
};

const raw = fs.readFileSync(SRC, 'utf8');
const seen = new Set();
const out = [];
let dup = 0, bad = 0;

for (const line of raw.split('\n')) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  for (const part of line.split(';')) {
    const seg = part.trim();
    if (!seg) continue;
    const [hanzi, meaning, words, pyOverride] = seg.split('|').map(s => (s || '').trim());
    if (!hanzi || [...hanzi].length !== 1 || !meaning) { bad++; console.log('BAD:', seg); continue; }
    if (seen.has(hanzi)) { dup++; continue; }
    seen.add(hanzi);
    let py = pyOverride;
    if (!py) {
      try { py = pinyin(hanzi, { toneType: 'symbol', type: 'array' })[0]; } catch { py = ''; }
    }
    let stroke = 1;
    try { const s = cnchar.stroke(hanzi); if (typeof s === 'number' && s > 0) stroke = s; } catch {}
    out.push({ hanzi, pinyin: py, meaning, words: words || '', stroke_count: stroke, level: 0, emoji: EMOJI[hanzi] || '' });
  }
}

out.forEach((c, i) => { c.level = Math.floor(i / PER_LEVEL) + 1; });

const body = out.map(c =>
  `  { hanzi: '${c.hanzi}', pinyin: '${c.pinyin}', meaning: '${c.meaning.replace(/'/g, "\\'")}', stroke_count: ${c.stroke_count}, level: ${c.level}, emoji: '${c.emoji}', words: '${c.words.replace(/'/g, "\\'")}' },`
).join('\n');

fs.writeFileSync(OUT,
  `// 自动生成，请勿手改；请修改 characters.txt 后重新运行 gen-chars.mjs\n` +
  `// 数据来源：人教版一年级上册/下册、二年级上册识字表，由易到难排序\n` +
  `export const CHARACTERS = [\n${body}\n];\n`, 'utf8');

console.log('生成成功:', out.length, '字');
console.log('重复跳过:', dup, ' 格式错误:', bad);
const byLevel = {};
out.forEach(c => { byLevel[c.level] = (byLevel[c.level] || 0) + 1; });
console.log('关卡数:', Object.keys(byLevel).length, '每关字数:', JSON.stringify(byLevel));
console.log('样例:', JSON.stringify(out.slice(0, 3), null, 0));
console.log('缺拼音:', out.filter(c => !c.pinyin).map(c => c.hanzi).join('') || '无');
