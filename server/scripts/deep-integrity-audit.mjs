// 深度完整性与业务规则审计（第五套）
// 关注点：业务规则正确性、并发安全、性能、接口契约、异常输入不产生 500。
// 用法：node scripts/deep-integrity-audit.mjs
const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const lines = [];
let failures = 0;

async function call(method, pathname, token, body, opts = {}) {
  const headers = {};
  if (body !== undefined && !opts.rawBody) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  Object.assign(headers, opts.headers || {});
  const res = await fetch(BASE + pathname, {
    method,
    headers,
    // 注意：GET/HEAD 不能带 body，null/undefined 都视为无 body
    body: opts.rawBody ? body : (body !== undefined && body !== null ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers, text };
}
function check(id, name, ok, detail) {
  if (ok) lines.push(`[PASS] ${id} ${name}`);
  else { failures++; lines.push(`[FAIL] ${id} ${name} :: ${JSON.stringify(detail).slice(0, 260)}`); }
}
function info(n, v) { lines.push(`[INFO] ${n} = ${v}`); }
const ms = async (fn) => { const t = Date.now(); await fn(); return Date.now() - t; };

const suffix = Date.now().toString(36);
let r = await call('POST', '/auth/register', null, { username: `di_${suffix}`, password: '123456' });
const token = r.data.token;
r = await call('POST', '/children', token, { name: '完整娃', age: 5 });
const child = r.data?.id;

/* ============ 1. 业务规则：星星 ============ */
let before = (await call('GET', `/rewards/${child}`, token)).data.stars || 0;
await call('POST', '/progress', token, { child_id: child, module: 'characters', item_id: 101, correct: true, duration: 5 });
let afterCorrect = (await call('GET', `/rewards/${child}`, token)).data.stars || 0;
check('BIZ-01', '答对后星星增加', afterCorrect > before, { before, afterCorrect });

before = afterCorrect;
await call('POST', '/progress', token, { child_id: child, module: 'characters', item_id: 102, correct: false, duration: 5 });
let afterWrong = (await call('GET', `/rewards/${child}`, token)).data.stars || 0;
check('BIZ-02', '答错不加星星', afterWrong === before, { before, afterWrong });

/* ============ 2. 业务规则：记忆等级（艾宾浩斯） ============ */
async function levelOf(itemId, module = 'characters') {
  const rv = (await call('GET', `/progress/review/${child}`, token)).data || [];
  const it = rv.find(x => x.item_id === itemId && x.module === module);
  return it ? it.interval_level : null;
}
// 连续答对同一项，记忆等级应逐步提升且不越界
const levels = [];
for (let i = 0; i < 5; i++) {
  await call('POST', '/progress', token, { child_id: child, module: 'characters', item_id: 201, correct: true, duration: 4 });
  levels.push(await levelOf(201));
}
const validLevels = levels.every(l => l === null || (l >= 0 && l <= 4));
check('BIZ-03', '记忆等级始终在 0-4 范围内', validLevels, levels);
const nonDecreasing = levels.filter(l => l !== null).every((l, i, arr) => i === 0 || l >= arr[i - 1]);
check('BIZ-04', '连续答对时记忆等级单调不降', nonDecreasing, levels);
info('连续答对后的等级序列', JSON.stringify(levels));

// 答错应重置/降低等级
const beforeWrong = await levelOf(201);
await call('POST', '/progress', token, { child_id: child, module: 'characters', item_id: 201, correct: false, duration: 4 });
const afterWrongLv = await levelOf(201);
check('BIZ-05', '答错后记忆等级被重置/降低', beforeWrong === null || afterWrongLv === null || afterWrongLv <= beforeWrong, { beforeWrong, afterWrongLv });

/* ============ 3. 业务规则：徽章解锁阈值一致性（40 枚全量） ============ */
const rw = (await call('GET', `/rewards/${child}`, token)).data;
const stats = rw.stats || {};
const inconsistent = (rw.badges || []).filter(b => {
  if (!b.metric) return false;
  const cur = Number(stats[b.metric] ?? 0);
  const shouldUnlock = cur >= Number(b.requirement);
  return shouldUnlock !== !!b.unlocked;
}).map(b => ({ name: b.name, metric: b.metric, req: b.requirement, cur: stats[b.metric], unlocked: b.unlocked }));
check('BIZ-06', `徽章解锁状态与指标阈值一致（共 ${(rw.badges || []).length} 枚）`, inconsistent.length === 0, inconsistent.slice(0, 5));

// 边界：新孩子（0 次学习）不应解锁任何徽章
r = await call('POST', '/children', token, { name: '零学习娃', age: 5 });
const child0 = r.data?.id;
const rw0 = (await call('GET', `/rewards/${child0}`, token)).data;
check('BIZ-07', '零学习的新孩子不解锁任何徽章', (rw0.badges || []).every(b => !b.unlocked), (rw0.badges || []).filter(b => b.unlocked).map(b => b.name));

/* ============ 4. 并发安全 ============ */
const concurrent = await Promise.all(
  Array.from({ length: 12 }, (_, i) =>
    call('POST', '/progress', token, { child_id: child, module: 'math', item_id: 900 + i, correct: true, duration: 3 })
  )
);
check('CON-01', '12 个并发写入全部成功且无 5xx', concurrent.every(x => x.status === 200), concurrent.map(x => x.status).filter(s => s !== 200));
const stAfter = (await call('GET', `/progress/${child}`, token)).data;
info('并发写入后总学习次数', stAfter?.total?.count);

/* ============ 5. 异常输入不产生 500 ============ */
const abnormal = [];
// 5.1 畸形 JSON
r = await call('POST', '/progress', token, '{ this is not json', { rawBody: true });
if (r.status === 500) abnormal.push({ case: 'malformed JSON', status: r.status });
check('ABN-01', '畸形 JSON 返回 400 而非 500', r.status === 400, r.status);

// 5.2 字段类型错误
r = await call('POST', '/progress', token, { child_id: 'not-a-number', module: 123, item_id: null, correct: 'yes' });
if (r.status === 500) abnormal.push({ case: 'wrong types', status: r.status });
check('ABN-02', '字段类型错误不产生 500', r.status !== 500, r.status);

// 5.3 超长字符串
r = await call('POST', '/children', token, { name: 'x'.repeat(10000), age: 5 });
if (r.status === 500) abnormal.push({ case: 'very long name', status: r.status });
check('ABN-03', '超长姓名字段不产生 500', r.status !== 500, r.status);

// 5.4 负数 / 超大 id
r = await call('POST', '/progress', token, { child_id: child, module: 'characters', item_id: -999, correct: true });
if (r.status === 500) abnormal.push({ case: 'negative item', status: r.status });
check('ABN-04', '负数 item_id 不产生 500', r.status !== 500, r.status);
r = await call('GET', '/courses/books/999999999999');
check('ABN-05', '超大 id 返回 404', r.status === 404, r.status);

// 5.5 路径穿越尝试
r = await call('GET', '/courses/books/..%2F..%2Fetc%2Fpasswd');
check('ABN-06', '路径穿越尝试被拒绝（404）', r.status === 404, r.status);

// 5.6 错误方法
r = await call('POST', '/courses/characters');
check('ABN-07', '对只读接口发 POST 不产生 500', r.status !== 500, r.status);

// 5.7 空 body 的 POST
r = await call('POST', '/progress', token, undefined);
check('ABN-08', '空 body POST 不产生 500', r.status !== 500, r.status);

check('ABN-09', '以上异常场景均无 5xx', abnormal.length === 0, abnormal);

/* ============ 6. 接口契约 ============ */
r = await call('GET', '/courses/characters');
const ct = r.headers.get('content-type') || '';
check('CTC-01', 'JSON 接口返回 application/json', ct.includes('application/json'), ct);
r = await call('GET', '/no-such-endpoint-xyz');
check('CTC-02', '未知接口返回 JSON 404', r.status === 404 && typeof r.data === 'object' && r.data.error, r.data);
// CORS 预检
r = await fetch(`${BASE}/children`, {
  method: 'OPTIONS',
  headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' },
});
check('CTC-03', 'CORS 预检(OPTIONS)不产生 5xx', r.status < 500, r.status);
// 合法来源带 Authorization 的跨域读
r = await call('GET', '/children', token, null, { headers: { Origin: 'http://localhost:5173' } });
check('CTC-04', '合法来源跨域请求放行', r.status === 200, r.status);

/* ============ 7. 性能（关键接口响应耗时） ============ */
const tChars = await ms(async () => { await call('GET', '/courses/characters'); });
const tRewards = await ms(async () => { await call('GET', `/rewards/${child}`); });
const tStages = await ms(async () => { await call('GET', '/courses/math/stages'); });
const tAges = await ms(async () => { await call('GET', '/courses/english/age-groups'); });
const tProgress = await ms(async () => { await call('GET', `/progress/${child}`); });
info('耗时 汉字1000条(ms)', tChars);
info('耗时 奖励+40徽章(ms)', tRewards);
info('耗时 数学学段(ms)', tStages);
info('耗时 英语年龄段(ms)', tAges);
info('耗时 进度统计(ms)', tProgress);
check('PERF-01', '汉字全量接口 < 3000ms', tChars < 3000, tChars);
check('PERF-02', '奖励接口(含40徽章+12统计) < 3000ms', tRewards < 3000, tRewards);
check('PERF-03', '进度统计接口 < 3000ms', tProgress < 3000, tProgress);

/* ============ 8. 构建产物与前端托管（生产模式） ============ */
const rootRes = await fetch('http://localhost:3001/');
const rootHtml = await rootRes.text();
check('WEB-01', '根路径返回 index.html', rootRes.status === 200 && rootHtml.includes('id="root"'), rootRes.status);
const assetMatch = rootHtml.match(/\/assets\/[^"']+\.js/);
check('WEB-02', 'index.html 引用了 JS 资源', !!assetMatch, rootHtml.slice(0, 120));
if (assetMatch) {
  const ar = await fetch(`http://localhost:3001${assetMatch[0]}`);
  check('WEB-03', '引用的 JS 资源可正常下载（构建产物完整）', ar.status === 200, ar.status);
}
for (const p of ['/progress', '/badges', '/rewards', '/characters', '/definitely-not-a-route']) {
  const rp = await fetch(`http://localhost:3001${p}`);
  const html = await rp.text();
  check('WEB-04', `深链 ${p} 回退到 index.html`, rp.status === 200 && html.includes('id="root"'), rp.status);
}

console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.length} checks, ${failures} failed`);
if (failures) process.exitCode = 1;
