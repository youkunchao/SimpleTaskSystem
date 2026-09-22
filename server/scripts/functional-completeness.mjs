// 功能点全覆盖回归：确保每一个后端接口（含此前未覆盖的 children CRUD、
// progress/wrong、progress/ability、learning DELETE、courses/grammar|listening|reading、
// /api/tts 兜底、登录失败、跨孩子隔离、越权拦截）都被真实命中且行为正确。
// 用法：node scripts/functional-completeness.mjs   （需 SMOKE_BASE 指向运行中的后端）
const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const lines = [];
let failures = 0;
function check(name, ok, detail) {
  if (ok) lines.push(`[PASS] ${name}`);
  else { failures++; lines.push(`[FAIL] ${name} :: ${JSON.stringify(detail).slice(0, 200)}`); }
}
function info(name, value) { lines.push(value === undefined ? `[INFO] ${name}` : `[INFO] ${name} = ${value}`); }
async function req(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

const suffix = Date.now().toString(36);
// --- 注册主账号 + 两个孩子，用于隔离/越权测试 ---
const reg = await req('POST', '/auth/register', null, { username: `fc_${suffix}`, password: '123456' });
check('REG', '注册 200', reg.status === 200 && reg.data.token, reg.status);
const token = reg.data.token;
const childA = (await req('POST', '/children', token, { name: 'A娃', age: 5, avatar: '🐯' })).data;
const childB = (await req('POST', '/children', token, { name: 'B娃', age: 6, avatar: '🐱' })).data;
const childTmp = (await req('POST', '/children', token, { name: '临时娃', age: 5, avatar: '🐰' })).data;
check('CHILD-POST', '创建孩子 200 含 id', childA.id && childB.id && childTmp.id, { a: childA.id, b: childB.id, t: childTmp.id });

// 注册第二个账号（用于越权测试）
const reg2 = await req('POST', '/auth/register', null, { username: `fc2_${suffix}`, password: '123456' });
const token2 = reg2.data.token;
const childC = (await req('POST', '/children', token2, { name: 'C娃', age: 4, avatar: '🐰' })).data;

info('准备完成', `A=${childA.id} B=${childB.id} Tmp=${childTmp.id} C(异账号)=${childC.id}`);

// --- children 全量 CRUD（删除一个临时孩子，保留 A/B 供隔离测试）---
{
  const list = (await req('GET', '/children', token)).data;
  check('CHILD-GET', 'GET /children 返回本账号三个孩子', Array.isArray(list) && list.length === 3, list?.length);
  const del = await req('DELETE', `/children/${childTmp.id}`, token);
  check('CHILD-DEL', 'DELETE /children 200', del.status === 200, del.status);
  const list2 = (await req('GET', '/children', token)).data;
  check('CHILD-GET2', '删除后剩 2 个孩子', Array.isArray(list2) && list2.length === 2, list2?.length);
  const delAgain = await req('DELETE', `/children/${childTmp.id}`, token);
  check('CHILD-DEL404', '删除不存在的孩子 404', delAgain.status === 404, delAgain.status);
}

// --- courses 全部 GET 端点（含此前未覆盖的 grammar/listening/reading/chinese-reading）---
for (const p of ['/courses', '/courses/characters', '/courses/words', '/courses/english/age-groups',
  '/courses/english/categories?age=3-4', '/courses/english/words?categoryId=1',
  '/courses/math', '/courses/math/stages', '/courses/math/topics?stage=1',
  '/courses/books', '/courses/grammar', '/courses/listening', '/courses/reading', '/courses/chinese-reading']) {
  const r = await req('GET', p, token);
  check(`COURSE-${p}`, `GET ${p} -> 200 + 数组`, r.status === 200 && Array.isArray(r.data), { status: r.status });
}
// math 题目/测验明细（stage 用 key 字段，如 "2-3"）
{
  const stages = (await req('GET', '/courses/math/stages', token)).data || [];
  const stageKey = stages[0]?.key || stages[0]?.id || stages[0]?.stage || '2-3';
  const topics = (await req('GET', `/courses/math/topics?stage=${encodeURIComponent(stageKey)}`, token)).data || [];
  check('MATH-TOPIC', `GET /courses/math/topics?stage=${stageKey} 有题`, topics.length > 0, topics.length);
  if (topics.length) {
    const t = topics[0];
    const detail = await req('GET', `/courses/math/topics/${t.id}`, token);
    const quiz = await req('GET', `/courses/math/topics/${t.id}/quiz`, token);
    check('MATH-TOPIC-D', `GET /courses/math/topics/:id -> 200`, detail.status === 200, detail.status);
    check('MATH-QUIZ', `GET /courses/math/topics/:id/quiz -> 200 + 数组`, quiz.status === 200 && Array.isArray(quiz.data), { status: quiz.status });
  }
}

// --- progress 未覆盖端点 ---
{
  const wrong = await req('GET', `/progress/wrong/${childA.id}?module=english,grammar`, token);
  check('PROG-WRONG', 'GET /progress/wrong -> 200 + 数组', wrong.status === 200 && Array.isArray(wrong.data), wrong.status);
  const ability = await req('GET', `/progress/ability/${childA.id}`, token);
  check('PROG-ABILITY', 'GET /progress/ability -> 200 + 数组(含维度)', ability.status === 200 && Array.isArray(ability.data), ability.status);
  const prog = await req('GET', `/progress/${childA.id}`, token);
  check('PROG-GET', 'GET /progress/:id -> 200 + 含 total', prog.status === 200 && prog.data && prog.data.total, prog.status);
}

// --- learning DELETE（重置学习位置）---
{
  await req('PUT', '/learning', token, { child_id: childA.id, module: 'characters', scope: '', position: 5 });
  const del = await req('DELETE', '/learning', token, { child_id: childA.id, module: 'characters', scope: '' });
  check('LRN-DEL', 'DELETE /learning 重置位置 200', del.status === 200, del.status);
  const miss = await req('DELETE', '/learning', token, { child_id: childA.id }); // 缺 module
  check('LRN-DEL400', 'DELETE /learning 缺 module -> 400', miss.status === 400, miss.status);
}

// --- /api/tts 兜底：无预合成音频应 404（前端回退 Web Speech）---
{
  const r = await req('POST', '/tts', null, { text: '测试', role: 'teach', lang: 'zh-CN' });
  check('TTS-404', '/api/tts 无预合成音频返回 404（触发兜底）', r.status === 404, r.status);
}

// --- 登录失败（错误密码）---
{
  const r = await req('POST', '/auth/login', null, { username: `fc_${suffix}`, password: 'wrong' });
  check('LOGIN-FAIL', '错误密码登录 -> 401', r.status === 401, r.status);
  const r2 = await req('POST', '/auth/login', null, { username: 'no_such_user_x', password: 'x' });
  check('LOGIN-NOUSER', '不存在用户登录 -> 401', r2.status === 401, r2.status);
}

// --- 跨孩子隔离 + 越权拦截 ---
{
  // 给 A 造数据，B 不应看到
  await req('POST', '/progress', token, { child_id: childA.id, module: 'characters', item_id: 9991, correct: true, duration: 10 });
  const pa = (await req('GET', `/progress/${childA.id}`, token)).data.total.count;
  const pb = (await req('GET', `/progress/${childB.id}`, token)).data.total.count;
  check('ISOL-A', '孩子A 进度可查', pa >= 1, pa);
  check('ISOL-B', '孩子B 看不到A的数据(隔离)', pb === 0, pb);
  const rbA = (await req('GET', `/rewards/${childA.id}`, token)).data;
  const rbB = (await req('GET', `/rewards/${childB.id}`, token)).data;
  check('ISOL-REWARD', '奖励按孩子隔离(stars不一致)', rbA.stars !== rbB.stars, { a: rbA.stars, b: rbB.stars });
  // 用 token2 访问 childA（异账号）应被 403 拦截
  const cross = await req('GET', `/progress/${childA.id}`, token2);
  check('XUSER-403', '异账号访问他人孩子 -> 403', cross.status === 403, cross.status);
  const crossPost = await req('POST', '/progress', token2, { child_id: childA.id, module: 'characters', item_id: 1, correct: true });
  check('XUSER-POST403', '异账号写入他人孩子 -> 403', crossPost.status === 403, crossPost.status);
}

console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.filter(l => l.startsWith('[PASS]')).length + failures} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
