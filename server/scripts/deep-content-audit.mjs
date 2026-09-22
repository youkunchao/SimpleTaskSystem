// 深度内容审计：逐字 / 逐词 / 逐题校验「内容本身的正确性」，而非仅字段非空。
// 与 full-course-test.mjs 的区别：
//   - full-course-test：结构性校验（字段齐全、选项数量、下标合法、接口可用）
//   - deep-content-audit：语义级校验（组词是否含该字、算式答案是否正确、
//     比大小/识图形的答案键是否对得上、例句是否真的用到该单词…）
// 用法：node scripts/deep-content-audit.mjs
const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const lines = [];
let failures = 0;

async function get(pathname) {
  const res = await fetch(BASE + pathname);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
function check(id, name, ok, detail) {
  if (ok) lines.push(`[PASS] ${id} ${name}`);
  else { failures++; lines.push(`[FAIL] ${id} ${name} :: ${JSON.stringify(detail).slice(0, 300)}`); }
}
function info(name, value) { lines.push(`[INFO] ${name} = ${value}`); }

/* ==================== A. 汉字（逐字） ==================== */
const chars = (await get('/courses/characters')).data || [];
info('汉字总数', chars.length);

const CJK = /^[㐀-鿿]$/;
const PINYIN = /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹḿ\s'·-]+$/;

const badHanzi = [], badPinyin = [], badMeaning = [], badWords = [], wordsNoChar = [];
const badEmoji = [], badStroke = [], badLevel = [];
for (const c of chars) {
  if (!CJK.test(c.hanzi)) badHanzi.push({ id: c.id, hanzi: c.hanzi });
  if (!c.pinyin || !PINYIN.test(c.pinyin)) badPinyin.push({ id: c.id, hanzi: c.hanzi, pinyin: c.pinyin });
  if (!c.meaning || !String(c.meaning).trim()) badMeaning.push({ id: c.id, hanzi: c.hanzi });
  if (!c.emoji) badEmoji.push({ id: c.id, hanzi: c.hanzi });
  if (!(c.stroke_count >= 1 && c.stroke_count <= 30)) badStroke.push({ id: c.id, hanzi: c.hanzi, n: c.stroke_count });
  if (!(c.level >= 1 && c.level <= 20)) badLevel.push({ id: c.id, hanzi: c.hanzi, level: c.level });

  // 组词：非空、每项非空，且至少一项包含该汉字（否则是错配的组词）
  const raw = String(c.words || '').trim();
  if (!raw) { badWords.push({ id: c.id, hanzi: c.hanzi, reason: '组词为空' }); continue; }
  const tokens = raw.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
  if (tokens.length === 0) { badWords.push({ id: c.id, hanzi: c.hanzi, reason: '组词解析为空' }); continue; }
  if (!tokens.some(t => t.includes(c.hanzi))) {
    wordsNoChar.push({ id: c.id, hanzi: c.hanzi, words: raw });
  }
}
check('CHR-A1', '汉字：每个都是单个汉字', badHanzi.length === 0, badHanzi.slice(0, 3));
check('CHR-A2', '汉字：拼音合法（字母+声调符号）', badPinyin.length === 0, badPinyin.slice(0, 3));
check('CHR-A3', '汉字：释义非空', badMeaning.length === 0, badMeaning.slice(0, 3));
check('CHR-A4', '汉字：组词非空且可解析', badWords.length === 0, badWords.slice(0, 3));
check('CHR-A5', '汉字：组词中至少含该汉字（防错配）', wordsNoChar.length === 0, wordsNoChar.slice(0, 5));
check('CHR-A6', '汉字：配图 emoji 齐全（100%）', badEmoji.length === 0, badEmoji.slice(0, 3));
check('CHR-A7', '汉字：笔画数 1-30', badStroke.length === 0, badStroke.slice(0, 3));
check('CHR-A8', '汉字：关卡等级 1-20', badLevel.length === 0, badLevel.slice(0, 3));
check('CHR-A9', '汉字：无重复字', new Set(chars.map(c => c.hanzi)).size === chars.length, chars.length - new Set(chars.map(c => c.hanzi)).size);

// A10：曾被关键词误配的字做定点回归（水蜜桃→水滴、墨水→水滴、如果→植物 等典型错配）
const EXPECTED_EMOJI = {
  桃: '🍑', 梨: '🍐', 橘: '🍊', 苹: '🍎', 蕉: '🍌', 葡: '🍇', 萄: '🍇',
  饺: '🥟', 墨: '🖋️', 胶: '🧴', 如: '📝', 绩: '🏆', 结: '🪢', 园: '🏞️',
  稻: '🌾', 莲: '🪷', 荷: '🪷', 桶: '🪣', 岛: '🏝️', 滩: '🏖️', 洲: '🏝️',
};
const byHanzi = new Map(chars.map(c => [c.hanzi, c]));
const wrongFixed = [];
for (const [h, e] of Object.entries(EXPECTED_EMOJI)) {
  const c = byHanzi.get(h);
  if (!c) continue;
  if (c.emoji !== e) wrongFixed.push({ hanzi: h, actual: c.emoji, expect: e });
}
check('CHR-A10', '汉字：易错配图的字配图正确（桃🍑/梨🍐/饺🥟/墨🖋️ 等）', wrongFixed.length === 0, wrongFixed);

/* ==================== B. 英语单词（逐词） ==================== */
const ageGroups = (await get('/courses/english/age-groups')).data || [];
const allWords = [];
const dupInCategory = [];
for (const g of ageGroups) {
  const cats = (await get(`/courses/english/categories?age=${encodeURIComponent(g.key)}`)).data || [];
  for (const c of cats) {
    const ws = (await get(`/courses/english/words?categoryId=${c.id}`)).data || [];
    const names = ws.map(w => String(w.english).toLowerCase());
    if (new Set(names).size !== names.length) dupInCategory.push({ cat: c.name_cn });
    ws.forEach(w => allWords.push({ ...w, _cat: `${g.key}/${c.name_cn}` }));
  }
}
info('英语单词总数', allWords.length);

const EN_WORD = /^[A-Za-z][A-Za-z\s'\-]*$/;
const badEn = [], badCn = [], badPh = [], badEx = [], badExCn = [], badMeaningEn = [], badWordEmoji = [];
const exNotContain = [];
for (const w of allWords) {
  const en = String(w.english || '').trim();
  if (!EN_WORD.test(en)) badEn.push({ id: w.id, en });
  if (!w.chinese || !String(w.chinese).trim()) badCn.push({ id: w.id, en });
  if (!w.meaning || !String(w.meaning).trim()) badMeaningEn.push({ id: w.id, en });
  if (!w.example_en || !String(w.example_en).trim()) badEx.push({ id: w.id, en });
  if (!w.example_cn || !String(w.example_cn).trim()) badExCn.push({ id: w.id, en });
  if (!w.emoji) badWordEmoji.push({ id: w.id, en });
  // 音标：非空且必须含至少一个音标字母（不能只剩 // 或空格）
  const ph = String(w.phonetic || '').trim();
  if (!ph || !/[a-zA-Zɐɑɒɔəɜɝɪʊʌæʒʃθðŋɡɹɚɜˌˈː]/.test(ph)) badPh.push({ id: w.id, en, phonetic: ph });
  // 例句应真的用到该单词（否则孩子学不到用法）——作为体检项报告
  const ex = String(w.example_en || '').toLowerCase();
  if (ex && en && !ex.includes(en.toLowerCase())) exNotContain.push({ id: w.id, en, ex: String(w.example_en).slice(0, 40) });
}
check('ENG-B1', '单词：英文拼写合法', badEn.length === 0, badEn.slice(0, 3));
check('ENG-B2', '单词：中文释义非空', badCn.length === 0, badCn.slice(0, 3));
check('ENG-B3', '单词：讲解(meaning)非空', badMeaningEn.length === 0, badMeaningEn.slice(0, 3));
check('ENG-B4', '单词：音标非空且含音标字符', badPh.length === 0, badPh.slice(0, 3));
check('ENG-B5', '单词：英文例句非空', badEx.length === 0, badEx.slice(0, 3));
check('ENG-B6', '单词：中文例句非空', badExCn.length === 0, badExCn.slice(0, 3));
check('ENG-B7', '单词：配图 emoji 齐全', badWordEmoji.length === 0, badWordEmoji.slice(0, 3));
check('ENG-B8', '单词：同主题内无重复', dupInCategory.length === 0, dupInCategory.slice(0, 3));
info('例句未包含该单词的数量', exNotContain.length);
if (exNotContain.length) info('  示例', JSON.stringify(exNotContain.slice(0, 3)));

/* ==================== C. 数学（逐题语义校验） ==================== */
const stages = (await get('/courses/math/stages')).data || [];
const mathIssues = [], mathSemantic = [];
let mathQ = 0, mathSemChecked = 0;
const topicsNoQuiz = [], topicsBadStep = [];

// 识图形：题目提到的图形 -> 允许的正确 emoji
const SHAPE_EMOJI = {
  圆形: ['🔵', '⚪', '⭕', '🟠', '🔴', '🟡', '🟢'],
  三角形: ['🔺', '🔻', '🔼', '🔽'],
  正方形: ['🟦', '🔲', '⬜', '🔳', '🟥'],
  方形: ['🟦', '🔲', '⬜', '🔳', '🟥'],
  长方形: ['▭', '🟥', '🟫'],
  五角星: ['⭐', '🌟'],
};

for (const st of stages) {
  const topics = (await get(`/courses/math/topics?stage=${encodeURIComponent(st.key)}`)).data || [];
  for (const t of topics) {
    const quiz = (await get(`/courses/math/topics/${t.id}/quiz`)).data || [];
    if (t.status !== 'placeholder') {
      if (quiz.length === 0) topicsNoQuiz.push({ stage: st.key, title: t.title });
      // 讲题步骤质量
      const steps = Array.isArray(t.content) ? t.content : [];
      if (steps.length === 0) topicsBadStep.push({ title: t.title, reason: '无讲题步骤' });
      for (const s of steps) {
        if (!s.text || !String(s.text).trim()) topicsBadStep.push({ title: t.title, reason: '步骤文本为空' });
        if (!s.emoji) topicsBadStep.push({ title: t.title, reason: '步骤缺配图' });
      }
    }

    for (const q of quiz) {
      mathQ++;
      const opts = Array.isArray(q.options) ? q.options : [];
      if (!q.question || !String(q.question).trim()) mathIssues.push({ id: q.id, reason: '题干为空' });
      if (opts.length < 2) { mathIssues.push({ id: q.id, reason: '选项不足' }); continue; }
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= opts.length) {
        mathIssues.push({ id: q.id, reason: '答案下标越界' }); continue;
      }
      if (new Set(opts.map(String)).size !== opts.length) mathIssues.push({ id: q.id, reason: '选项重复', opts });

      const correct = String(opts[q.answer]).trim();
      const text = String(q.question);

      // C1 算式题：a op b = ? —— 直接算出结果核对
      const arith = text.match(/(-?\d+(?:\.\d+)?)\s*([+\-＋－×✕x*÷\/])\s*(-?\d+(?:\.\d+)?)\s*=/);
      if (arith) {
        mathSemChecked++;
        const a = Number(arith[1]), b = Number(arith[3]);
        const op = arith[2];
        let expect;
        if (op === '+' || op === '＋') expect = a + b;
        else if (op === '-' || op === '－') expect = a - b;
        else if (op === '×' || op === '✕' || op === 'x' || op === '*') expect = a * b;
        else if (op === '÷' || op === '/') expect = b === 0 ? null : a / b;
        if (expect !== null && Number(correct) !== expect) {
          mathSemantic.push({ id: q.id, q: text, correct, expect, type: 'arith' });
        }
        continue;
      }

      // C2 比大小：更大/最大 -> 正确答案应为最大值；更小/最小 -> 最小值
      if (/更大|最大|较多|最多/.test(text)) {
        const nums = opts.map(o => Number(String(o).trim())).filter(n => !Number.isNaN(n));
        if (nums.length === opts.length) {
          mathSemChecked++;
          const max = Math.max(...nums);
          if (Number(correct) !== max) mathSemantic.push({ id: q.id, q: text, correct, expect: max, type: 'max' });
        }
        continue;
      }
      if (/更小|最小|较少|最少/.test(text)) {
        const nums = opts.map(o => Number(String(o).trim())).filter(n => !Number.isNaN(n));
        if (nums.length === opts.length) {
          mathSemChecked++;
          const min = Math.min(...nums);
          if (Number(correct) !== min) mathSemantic.push({ id: q.id, q: text, correct, expect: min, type: 'min' });
        }
        continue;
      }

      // 统一的"期望值"比对助手
      const checkEq = (expect, type) => {
        mathSemChecked++;
        if (Number(correct) !== expect) mathSemantic.push({ id: q.id, q: text, correct, expect, type });
      };

      // C3a 数字规律：2、4、6、8、？ 按等差推导下一项
      const seq = text.match(/((?:\d+\s*[、,，]\s*){2,}\d+)\s*[、,，]?\s*[？?]/);
      if (seq) {
        const nums = seq[1].split(/[、,，]/).map(s => Number(s.trim())).filter(n => !Number.isNaN(n));
        if (nums.length >= 3) {
          const diffs = [];
          for (let i = 1; i < nums.length; i++) diffs.push(nums[i] - nums[i - 1]);
          if (diffs.every(d => d === diffs[0])) {
            checkEq(nums[nums.length - 1] + diffs[0], 'seq');
            continue;
          }
        }
      }

      // C3b 数的分解：6可以分成2和几 / 8 = 5 + ？
      const split = text.match(/(\d+)\s*可以分成\s*(\d+)\s*和/) || text.match(/(\d+)\s*=\s*(\d+)\s*\+\s*[？?]/);
      if (split) { checkEq(Number(split[1]) - Number(split[2]), 'split'); continue; }

      // C3c 相邻数与序数：X的下一个数 / 比X大Y的数 / 第N个数
      let nb = text.match(/(\d+)\s*的下一个数/);
      if (nb) { checkEq(Number(nb[1]) + 1, 'next'); continue; }
      nb = text.match(/比\s*(\d+)\s*大\s*(\d+)\s*的数是/);
      if (nb) { checkEq(Number(nb[1]) + Number(nb[2]), 'bigger'); continue; }
      nb = text.match(/第\s*(\d+)\s*个数是/);
      if (nb) { checkEq(Number(nb[1]), 'nth'); continue; }

      // C3d 位值概念：4个十和6个一 / 35里有几个十
      let pl = text.match(/(\d+)\s*个十和\s*(\d+)\s*个一/);
      if (pl) { checkEq(Number(pl[1]) * 10 + Number(pl[2]), 'place'); continue; }
      pl = text.match(/(\d+)\s*里有几个十/);
      if (pl) { checkEq(Math.floor(Number(pl[1]) / 10), 'tens'); continue; }

      // C3 计数题：「…有几个？」——按题目提到的图形数对应 emoji；
      //             若题目里是同一 emoji 重复出现，则直接数它的个数
      const isCounting = /几个|多少个|数量|共有|一共/.test(text);
      if (isCounting) {
        let target = null;
        for (const name of Object.keys(SHAPE_EMOJI)) {
          if (text.includes(name)) { target = name; break; }
        }
        if (target) {
          const allow = SHAPE_EMOJI[target];
          let count = 0;
          for (const ch of text) if (allow.includes(ch)) count++;
          mathSemChecked++;
          if (Number(correct) !== count) {
            mathSemantic.push({ id: q.id, q: text, correct, expect: count, target, type: 'countShape' });
          }
          continue;
        }
        const pictos = [...text].filter(ch => /\p{Extended_Pictographic}/u.test(ch));
        if (pictos.length >= 2 && new Set(pictos).size === 1) {
          mathSemChecked++;
          if (Number(correct) !== pictos.length) {
            mathSemantic.push({ id: q.id, q: text, correct, expect: pictos.length, type: 'countEmoji' });
          }
          continue;
        }
        // 无法判定计数目标，跳过（不计入已校验数量）
        continue;
      }

      // C4 识图形：题目问"哪个是X形"，正确项应是对应 emoji（计数题已在上一步处理）
      for (const [name, allow] of Object.entries(SHAPE_EMOJI)) {
        if (text.includes(name)) {
          mathSemChecked++;
          if (!allow.includes(correct)) {
            mathSemantic.push({ id: q.id, q: text, correct, expect: name, type: 'shape' });
          }
          break;
        }
      }
    }
  }
}
info('数学测验题总数', mathQ);
info('其中已做语义校验的题数', mathSemChecked);
check('MAT-C1', '数学：题目结构合法（题干/选项/下标/无重复）', mathIssues.length === 0, mathIssues.slice(0, 4));
check('MAT-C2', '数学：答案键语义正确（算式/比大小/识图形）', mathSemantic.length === 0, mathSemantic.slice(0, 5));
check('MAT-C3', '数学：非占位知识点均有测验题', topicsNoQuiz.length === 0, topicsNoQuiz.slice(0, 3));
check('MAT-C4', '数学：讲题步骤文本与配图完整', topicsBadStep.length === 0, topicsBadStep.slice(0, 3));

/* ==================== D. 绘本 / 阅读 / 语法 / 听力 ==================== */
const books = (await get('/courses/books')).data || [];
const bookBad = [];
for (const b of books) {
  const d = (await get(`/courses/books/${b.id}`)).data;
  const pages = Array.isArray(d.pages) ? d.pages : [];
  if (!pages.length) bookBad.push({ id: b.id, reason: '无内页' });
  pages.forEach((p, i) => {
    if (!p.text || !String(p.text).trim()) bookBad.push({ id: b.id, page: i, reason: '文本为空' });
    if (!p.img) bookBad.push({ id: b.id, page: i, reason: '配图为空' });
  });
}
check('BOK-D1', '绘本：每页文本与配图完整', bookBad.length === 0, bookBad.slice(0, 3));

for (const mod of ['chinese-reading', 'grammar', 'listening', 'reading']) {
  const items = (await get(`/courses/${mod}`)).data || [];
  const bad = [];
  for (const it of items) {
    let opts = it.options;
    if (typeof opts === 'string') { try { opts = JSON.parse(opts); } catch { bad.push({ id: it.id, reason: '选项非JSON' }); continue; } }
    if (!Array.isArray(opts) || opts.length < 2) { bad.push({ id: it.id, reason: '选项不足' }); continue; }
    if (typeof it.answer !== 'number' || it.answer < 0 || it.answer >= opts.length) bad.push({ id: it.id, reason: '答案越界' });
    if (new Set(opts.map(String)).size !== opts.length) bad.push({ id: it.id, reason: '选项重复' });
  }
  check(`${mod.toUpperCase()}-D`, `${mod}：题目合法（${items.length} 题）`, bad.length === 0, bad.slice(0, 3));
}

console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.length} checks, ${failures} failed`);
if (failures) process.exitCode = 1;
