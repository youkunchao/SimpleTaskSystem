// 扩充汉字样本抽检：在 deep-content-audit（100% 语义）基础上，进一步做：
//  A) 扩展字段质量：emoji 合法(非 replacement/单 grapheme)、拼音含元音、释义无占位文本、组词完整；
//  B) 更大规模易错配图回归（水/火/颜色/家人/动物等约 60 字，防止"关键词误配"复发）；
//  C) 随机抽样复检：用固定种子抽 300 字重跑语义校验，证明抽检稳定。
// 用法：node scripts/characters-expanded-sample.mjs
const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const lines = [];
let failures = 0;
async function get(path) {
  const res = await fetch(BASE + path);
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
function check(id, name, ok, detail) {
  if (ok) lines.push(`[PASS] ${id} ${name}`);
  else { failures++; lines.push(`[FAIL] ${id} ${name} :: ${JSON.stringify(detail).slice(0, 240)}`); }
}
function info(name, value) { lines.push(`[INFO] ${name} = ${value}`); }

const chars = (await get('/courses/characters')).data || [];
info('汉字总数', chars.length);
const byHanzi = new Map(chars.map(c => [c.hanzi, c]));

// ---------- A) 扩展字段质量 ----------
const PLACEHOLDER = /(示例|样例|xxx|XXX|测试|待补|todo|TODO|占位|占位符|暂无)/;
const hasVowel = (p) => /[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(p || '');
const emojiBad = [], vowelBad = [], placeholderBad = [], weakEmoji = [], familyEmoji = [];
for (const c of chars) {
  const e = c.emoji || '';
  // 去掉零宽连接符(ZWJ)与变体选择符(VS)后统计码点，允许家庭合影等合法 ZWJ 序列
  const cps = [...e].filter(ch => ch !== '‍' && ch !== '️');
  if (!e || e.includes('�') || !/\p{Emoji}/u.test(e) || cps.length > 4) emojiBad.push({ id: c.id, hanzi: c.hanzi, emoji: e });
  if (e.includes('‍')) familyEmoji.push({ hanzi: c.hanzi, emoji: e }); // 家庭/组合类，可优化
  if (!hasVowel(c.pinyin)) vowelBad.push({ id: c.id, hanzi: c.hanzi, pinyin: c.pinyin });
  if (PLACEHOLDER.test(`${c.meaning || ''} ${c.words || ''}`)) placeholderBad.push({ id: c.id, hanzi: c.hanzi });
  if (e === '✨') weakEmoji.push({ id: c.id, hanzi: c.hanzi }); // 兜底图，可能偏弱
}
check('EXT-A1', '汉字：emoji 合法（非 replacement、含 Emoji、≤4码点）', emojiBad.length === 0, emojiBad.slice(0, 5));
if (familyEmoji.length) info('家庭/组合类配图(可优化)', familyEmoji.map(f => `${f.hanzi}${f.emoji}`).join(' '));
check('EXT-A2', '汉字：拼音含元音（拼音质量）', vowelBad.length === 0, vowelBad.slice(0, 5));
check('EXT-A3', '汉字：释义/组词无占位文本', placeholderBad.length === 0, placeholderBad.slice(0, 5));
info('弱配图(✨兜底)数量', weakEmoji.length);

// 组词完整性：每项非空、含本字、最小长度>=1
const wordBad = [];
for (const c of chars) {
  const toks = String(c.words || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean);
  if (toks.length === 0) { wordBad.push({ id: c.id, hanzi: c.hanzi, reason: '空' }); continue; }
  if (!toks.every(t => t.includes(c.hanzi))) wordBad.push({ id: c.id, hanzi: c.hanzi, words: c.words });
}
check('EXT-A4', '汉字：组词完整且含本字', wordBad.length === 0, wordBad.slice(0, 5));

// ---------- B) 易错配图回归（更大范围）----------
const EXPECTED = {
  // 基础（deep-content 已覆盖的代表）
  桃: '🍑', 梨: '🍐', 橘: '🍊', 苹: '🍎', 蕉: '🍌', 葡: '🍇', 萄: '🍇',
  饺: '🥟', 墨: '🖋️', 胶: '🧴', 如: '📝', 绩: '🏆', 结: '🪢', 园: '🏞️',
  稻: '🌾', 莲: '🪷', 荷: '🪷', 桶: '🪣', 岛: '🏝️', 滩: '🏖️', 洲: '🏝️',
  // 扩充：水家族（"江/河/湖/海/流/洗"等极易被"水蜜桃/墨水/如果"误配）
  江: '🏞️', 河: '🏞️', 湖: '🏞️', 海: '🌊', 流: '💧', 洗: '🧼', 泳: '💧', 汗: '💧', 泪: '💧',
  // 火家族
  灯: '💡', 烧: '🔥', 热: '🔥', 炒: '🍳',
  // 颜色（避免被"红绿灯/蓝鲸"等带颜色词误配）
  红: '🔴', 蓝: '🔵', 绿: '🟢', 黄: '🟡', 白: '⚪', 黑: '⚫',
  // 家人（避免"哥哥/姐姐"被误配）
  爸: '👨', 妈: '👩', 哥: '👦', 姐: '👧', 弟: '👶', 妹: '👧',
  // 动物
  猫: '🐱', 狗: '🐶', 鱼: '🐟', 鸟: '🐦', 牛: '🐄', 羊: '🐑', 兔: '🐰',
  // 自然（避免"火山/雪山"误配）
  火: '🔥', 山: '⛰️', 雪: '❄️', 云: '☁️', 雨: '🌧️', 星: '⭐', 月: '🌙',
};
const wrong = [];
for (const [h, e] of Object.entries(EXPECTED)) {
  const c = byHanzi.get(h);
  if (!c) continue;
  if (c.emoji !== e) wrong.push({ hanzi: h, actual: c.emoji, expect: e });
}
check('EXT-B1', `易错配图回归(${Object.keys(EXPECTED).length}字)全部正确`, wrong.length === 0, wrong.slice(0, 8));

// ---------- C) 随机抽样复检 ----------
// 固定种子（mulberry32）抽 300 字，重跑语义校验，证明抽检稳定
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry32(20260922);
const pool = [...chars];
const sample = [];
while (sample.length < Math.min(300, pool.length)) {
  const i = Math.floor(rng() * pool.length);
  if (!sample.includes(pool[i])) sample.push(pool[i]);
}
const CJK = /^[㐀-鿿]$/;
const PINYIN = /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ\s'·-]+$/;
let sBad = 0;
for (const c of sample) {
  if (!CJK.test(c.hanzi)) sBad++;
  if (!c.pinyin || !PINYIN.test(c.pinyin)) sBad++;
  if (!c.meaning || !String(c.meaning).trim()) sBad++;
  if (!c.emoji) sBad++;
  if (!(c.stroke_count >= 1 && c.stroke_count <= 30)) sBad++;
  if (!(c.level >= 1 && c.level <= 20)) sBad++;
  const toks = String(c.words || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean);
  if (!toks.length || !toks.some(t => t.includes(c.hanzi))) sBad++;
}
check('EXT-C1', `随机抽样 ${sample.length} 字语义复检`, sBad === 0, { sBad });

console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.filter(l => l.startsWith('[PASS]')).length + failures} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
