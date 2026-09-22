// 课程全量校验：逐模块、逐主题、逐题检查内容完整性与合法性
// 用法：先启动后端，然后 node scripts/full-course-test.mjs
// 覆盖：英语（年龄段→主题→单词）、数学（学段→知识点→测验题）、绘本、中文阅读、
//       语法/听力/阅读、汉字字库、TTS 音频覆盖、徽章指标、断点续学
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const lines = [];
let failures = 0;

async function call(method, pathname, token, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + pathname, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function check(name, ok, detail) {
  if (ok) lines.push(`[PASS] ${name}`);
  else { failures++; lines.push(`[FAIL] ${name} :: ${JSON.stringify(detail).slice(0, 300)}`); }
}
function info(name, value) { lines.push(`[INFO] ${name} = ${value}`); }

// 与前端 utils/mathContent.js stripForSpeech 保持一致（去掉 TTS 读不出来的符号）
const stripForSpeech = (text) =>
  String(text || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

// 统一校验一道题：题干 + 选项 + 答案下标
function validateQuestion(q, label, bucket) {
  if (!q.question || !String(q.question).trim()) bucket.push({ label, id: q.id, reason: '题干为空' });
  let opts = q.options;
  if (typeof opts === 'string') {
    try { opts = JSON.parse(opts); } catch { bucket.push({ label, id: q.id, reason: '选项非 JSON' }); return; }
  }
  if (!Array.isArray(opts) || opts.length < 2) {
    bucket.push({ label, id: q.id, reason: '选项数量不足', options: opts });
    return;
  }
  if (opts.some(o => o === undefined || o === null || String(o).trim() === '')) {
    bucket.push({ label, id: q.id, reason: '存在空选项', options: opts });
  }
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= opts.length) {
    bucket.push({ label, id: q.id, reason: '答案下标越界', answer: q.answer, options: opts });
  }
  if (new Set(opts.map(String)).size !== opts.length) {
    bucket.push({ label, id: q.id, reason: '选项重复', options: opts });
  }
}

// ---------- 准备账号 ----------
const suffix = Date.now().toString(36);
const user = `ft_${suffix}`;
let r = await call('POST', '/auth/register', null, { username: user, password: '123456' });
check('register test user', r.status === 200 && !!r.data.token, r.data);
const token = r.data.token;
r = await call('POST', '/children', token, { name: '测试娃', age: 5, avatar: 'cat' });
const childId = r.data?.id;

/* ==================== 1. 汉字字库 ==================== */
r = await call('GET', '/courses/characters');
const chars = Array.isArray(r.data) ? r.data : [];
info('汉字总数', chars.length);
const charBad = chars.filter(c => !c.hanzi || !c.pinyin || !c.meaning || !c.words);
check('汉字：每字都有 字/拼音/释义/组词', charBad.length === 0, charBad.slice(0, 3));
const charNoEmoji = chars.filter(c => !c.emoji);
check('汉字：每字都有配图 emoji（学习页要用）', charNoEmoji.length === 0, charNoEmoji.slice(0, 3));

/* ==================== 2. 英语模块 ==================== */
r = await call('GET', '/courses/english/age-groups');
const ageGroups = Array.isArray(r.data) ? r.data : [];
check('英语：年龄段非空', ageGroups.length > 0, ageGroups.length);
const agBad = ageGroups.filter(g => !g.key || !g.label);
check('英语：每个年龄段有 key/label', agBad.length === 0, agBad.slice(0, 3));
const agNoCat = ageGroups.filter(g => !g.category_count);
check('英语：每个年龄段都有主题', agNoCat.length === 0, agNoCat.slice(0, 3));

let totalCats = 0;
let totalWords = 0;
const wordBad = [];
const wordMissingField = { meaning: 0, example_en: 0, example_cn: 0, phonetic: 0 };
for (const g of ageGroups) {
  r = await call('GET', `/courses/english/categories?age=${encodeURIComponent(g.key)}`);
  const cats = Array.isArray(r.data) ? r.data : [];
  check(`英语[${g.key}]：主题非空`, cats.length > 0, cats.length);
  totalCats += cats.length;
  const catBad = cats.filter(c => !c.id || !c.name_cn || !c.icon);
  check(`英语[${g.key}]：主题字段齐全(id/名称/图标)`, catBad.length === 0, catBad.slice(0, 2));

  for (const c of cats) {
    r = await call('GET', `/courses/english/words?categoryId=${c.id}`);
    const words = Array.isArray(r.data) ? r.data : [];
    totalWords += words.length;
    check(`英语[${g.key}/${c.name_cn}]：单词非空`, words.length > 0, { catId: c.id, n: words.length });

    for (const w of words) {
      if (!w.english || !w.chinese) wordBad.push({ cat: c.name_cn, id: w.id, reason: '缺英文或中文', w });
      if (!w.meaning) wordMissingField.meaning++;
      if (!w.example_en) wordMissingField.example_en++;
      if (!w.example_cn) wordMissingField.example_cn++;
      if (!w.phonetic) wordMissingField.phonetic++;
      if (!w.emoji) wordBad.push({ cat: c.name_cn, id: w.id, reason: '缺配图 emoji', english: w.english });
    }
    // 同主题内单词不重复（选项生成依赖：重复会导致两个一样的选项）
    const names = words.map(w => String(w.english).toLowerCase());
    if (new Set(names).size !== names.length) {
      wordBad.push({ cat: c.name_cn, reason: '同主题内单词重复' });
    }
  }
}
info('英语主题总数', totalCats);
info('英语单词总数', totalWords);
check('英语：所有单词都有英文+中文+配图', wordBad.length === 0, wordBad.slice(0, 3));
info('英语缺讲解(meaning)', wordMissingField.meaning);
info('英语缺英文例句(example_en)', wordMissingField.example_en);
info('英语缺中文例句(example_cn)', wordMissingField.example_cn);
info('英语缺音标(phonetic)', wordMissingField.phonetic);

/* ==================== 3. 数学模块 ==================== */
r = await call('GET', '/courses/math/stages');
const stages = Array.isArray(r.data) ? r.data : [];
check('数学：学段非空', stages.length > 0, stages.length);
const stBad = stages.filter(s => !s.key || !s.label);
check('数学：每个学段有 key/label', stBad.length === 0, stBad.slice(0, 2));

let totalTopics = 0;
let totalQuiz = 0;
const quizBad = [];
const topicBad = [];
const mathTexts = []; // 收集讲题文本，用于 TTS 覆盖率检查

for (const st of stages) {
  r = await call('GET', `/courses/math/topics?stage=${encodeURIComponent(st.key)}`);
  const topics = Array.isArray(r.data) ? r.data : [];
  check(`数学[${st.key}]：知识点非空`, topics.length > 0, topics.length);
  totalTopics += topics.length;

  const tBad = topics.filter(t => !t.id || !t.title || !t.emoji);
  if (tBad.length) topicBad.push({ stage: st.key, sample: tBad.slice(0, 2) });
  const noFirst = topics.filter(t => t.unlocked === undefined);
  if (noFirst.length) topicBad.push({ stage: st.key, reason: '缺少 unlocked 状态', n: noFirst.length });

  for (const t of topics) {
    // 知识点详情（含分步讲解）
    const rd = await call('GET', `/courses/math/topics/${t.id}`);
    if (rd.status !== 200) { topicBad.push({ stage: st.key, id: t.id, reason: '详情接口失败', status: rd.status }); continue; }
    const detail = rd.data;
    const steps = Array.isArray(detail.content) ? detail.content : [];
    if (t.status !== 'placeholder') {
      if (steps.length === 0) topicBad.push({ stage: st.key, id: t.id, title: t.title, reason: '讲题步骤为空' });
      for (const s of steps) {
        if (!s.text || !String(s.text).trim()) {
          topicBad.push({ stage: st.key, id: t.id, reason: '讲题步骤文本为空', step: s });
        }
        mathTexts.push({ topic: t.title, text: stripForSpeech(s.text) });
      }
    }

    // 测验：逐题校验
    const rq = await call('GET', `/courses/math/topics/${t.id}/quiz`);
    const quiz = Array.isArray(rq.data) ? rq.data : [];
    if (t.status !== 'placeholder') {
      if (quiz.length === 0) topicBad.push({ stage: st.key, id: t.id, title: t.title, reason: '测验题为空' });
    }
    totalQuiz += quiz.length;
    for (const q of quiz) validateQuestion(q, `math/${st.key}/${t.title}`, quizBad);
  }
}
info('数学知识点总数', totalTopics);
info('数学测验题总数', totalQuiz);
check('数学：知识点字段齐全 + 讲题步骤非空（非占位）', topicBad.length === 0, topicBad.slice(0, 3));
check('数学：所有测验题题干/选项/答案合法且无重复选项', quizBad.length === 0, quizBad.slice(0, 4));

/* ==================== 4. 绘本 ==================== */
r = await call('GET', '/courses/books');
const books = Array.isArray(r.data) ? r.data : [];
check('绘本：列表非空', books.length > 0, books.length);
const bookBad = [];
for (const b of books) {
  const rd = await call('GET', `/courses/books/${b.id}`);
  if (rd.status !== 200) { bookBad.push({ id: b.id, reason: '详情失败', status: rd.status }); continue; }
  if (!rd.data.title || !rd.data.cover) bookBad.push({ id: b.id, reason: '缺标题或封面' });
  const pages = Array.isArray(rd.data.pages) ? rd.data.pages : [];
  if (pages.length === 0) bookBad.push({ id: b.id, reason: '无内页' });
  pages.forEach((p, i) => {
    if (!p.text || !String(p.text).trim()) bookBad.push({ id: b.id, page: i, reason: '内页文本为空' });
    if (!p.img) bookBad.push({ id: b.id, page: i, reason: '内页配图为空' });
  });
}
info('绘本总数', books.length);
check('绘本：每页都有文本与配图', bookBad.length === 0, bookBad.slice(0, 3));

/* ==================== 5. 中文阅读 / 语法 / 听力 / 阅读 ==================== */
for (const mod of ['chinese-reading', 'grammar', 'listening', 'reading']) {
  r = await call('GET', `/courses/${mod}`);
  const items = Array.isArray(r.data) ? r.data : [];
  check(`${mod}：列表非空`, items.length > 0, items.length);
  const bad = [];
  for (const it of items) validateQuestion(it, mod, bad);
  info(`${mod} 题目数`, items.length);
  check(`${mod}：所有题目合法`, bad.length === 0, bad.slice(0, 3));
}

// 中文阅读还要有可读材料（passage/content）
r = await call('GET', '/courses/chinese-reading');
const crItems = Array.isArray(r.data) ? r.data : [];
const crNoMaterial = crItems.filter(i => !i.passage && !i.content);
check('中文阅读：每篇都有阅读材料', crNoMaterial.length === 0, crNoMaterial.slice(0, 2));

/* ==================== 6. TTS 音频 ==================== */
const ttsDir = path.resolve(__dirname, '..', 'tts-audio');
let manifest = {};
try {
  manifest = JSON.parse(fs.readFileSync(path.join(ttsDir, 'manifest.json'), 'utf8'));
} catch (e) {
  check('TTS：manifest.json 可读', false, String(e.message));
}
const mKeys = Object.keys(manifest);
info('TTS 预合成音频条数', mKeys.length);
check('TTS：manifest 非空', mKeys.length > 0, mKeys.length);

const missingFiles = [];
for (const k of mKeys.slice(0, 300)) {
  if (!fs.existsSync(path.join(ttsDir, manifest[k]))) missingFiles.push(k);
}
check('TTS：manifest 指向的音频文件存在（抽样300）', missingFiles.length === 0, missingFiles.slice(0, 3));

// 真实调用 /api/tts：取一条 manifest 记录还原 lang/role/text 请求
if (mKeys.length > 0) {
  const [lang, role, ...rest] = mKeys[0].split('|');
  const text = rest.join('|');
  const rt = await call('POST', '/tts', token, { lang, role, text });
  check('TTS：POST /api/tts 返回 200', rt.status === 200, rt.status);
  const rMissing = await call('POST', '/tts', token, { lang: 'zh-CN', role: 'teach', text: '这句话肯定没有预合成过xyz' });
  check('TTS：未预合成文本返回 404（前端据此回退）', rMissing.status === 404, rMissing.status);
}

// 数学讲题文本的语音覆盖率（孩子能否听到"讲解"）
if (mathTexts.length && mKeys.length) {
  const hit = mathTexts.filter(t => manifest[`zh-CN|teach|${t.text}`]).length;
  const pct = Math.round((hit / mathTexts.length) * 100);
  info('数学讲题语音覆盖率', `${hit}/${mathTexts.length} (${pct}%)`);
  check('数学讲题语音覆盖率 >= 80%', pct >= 80, { hit, total: mathTexts.length, pct });
}

/* ==================== 7. 徽章指标完整性 ==================== */
r = await call('GET', `/rewards/${childId}`, token);
const badges = Array.isArray(r.data?.badges) ? r.data.badges : [];
info('徽章总数', badges.length);
check('徽章：数量 >= 30', badges.length >= 30, badges.length);
const noMetric = badges.filter(b => !b.metric);
check('徽章：每枚都有 metric（否则无法算进度）', noMetric.length === 0, noMetric.slice(0, 3));
const badReq = badges.filter(b => !Number.isFinite(Number(b.requirement)) || Number(b.requirement) <= 0);
check('徽章：每枚都有合法的 requirement', badReq.length === 0, badReq.slice(0, 3));
const stats = r.data?.stats || {};
const usedMetrics = [...new Set(badges.map(b => b.metric))];
const lackStats = usedMetrics.filter(m => stats[m] === undefined);
check('徽章：stats 覆盖所有用到的指标', lackStats.length === 0, { lackStats, statsKeys: Object.keys(stats) });
const noIconOrDesc = badges.filter(b => !b.icon || !b.description);
check('徽章：每枚都有图标与说明', noIconOrDesc.length === 0, noIconOrDesc.slice(0, 3));

/* ==================== 8. 断点续学（各模块） ==================== */
for (const [module, scope] of [['characters', 'all'], ['english', 'CAT:1'], ['math', 'TOPIC:1']]) {
  r = await call('PUT', '/learning', token, { child_id: childId, module, scope, position: 4 });
  check(`断点续学[${module}]：保存成功`, r.status === 200 && r.data.success === true, r.data);
  const rg = await call('GET', `/learning/${childId}?module=${module}&scope=${encodeURIComponent(scope)}`, token);
  check(`断点续学[${module}]：读回 position=4`, rg.data?.position === 4, rg.data);
}

/* ==================== 9. 进度与能力雷达 ==================== */
r = await call('POST', '/progress', token, { child_id: childId, module: 'math', item_id: 1, correct: true, duration: 8 });
check('进度：记录数学答题', r.status === 200 && r.data.success === true, r.data);
r = await call('GET', `/progress/ability/${childId}`, token);
check('能力雷达：返回数组', r.status === 200 && Array.isArray(r.data), r.data);
r = await call('GET', `/progress/${childId}`, token);
check('统计：结构完整', !!r.data?.total && Array.isArray(r.data.byModule) && Array.isArray(r.data.memoryDistribution), r.data?.total);

/* ==================== 10. 复习队列 ==================== */
r = await call('POST', '/progress', token, { child_id: childId, module: 'english', item_id: 1, correct: false, question: 'q', user_answer: 'A', correct_answer: 'B' });
r = await call('GET', `/progress/review/${childId}`, token);
const reviewItems = Array.isArray(r.data) ? r.data : [];
check('复习：答错后进入复习队列', reviewItems.length > 0, reviewItems.length);
const noDetail = reviewItems.filter(i => !i.detail);
check('复习：每条都有详情（否则复习页空白）', noDetail.length === 0, noDetail.slice(0, 2));

console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.length} checks, ${failures} failed`);
if (failures) process.exitCode = 1;
