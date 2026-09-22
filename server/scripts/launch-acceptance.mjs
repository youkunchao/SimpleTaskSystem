// 上线验收测试：对应 docs/QA测试用例与风险清单.md 中
// 安全 / 边界值 / 空数据 / 端到端串联 / 破坏性 等可自动化执行的部分。
// 用法：先启动后端，然后 node scripts/launch-acceptance.mjs
const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const lines = [];
let failures = 0;

async function call(method, pathname, token, body, extraHeaders) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  Object.assign(headers, extraHeaders || {});
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
function check(id, name, ok, detail) {
  if (ok) lines.push(`[PASS] ${id} ${name}`);
  else { failures++; lines.push(`[FAIL] ${id} ${name} :: ${JSON.stringify(detail).slice(0, 240)}`); }
}

const suffix = Date.now().toString(36);
const PW = '123456';
let r;

/* ============ 1. 注册边界（REG-006/007） ============ */
r = await call('POST', '/auth/register', null, { username: `la_${suffix}_1`, password: '123456' });
check('REG-006', '密码恰好 6 位可注册', r.status === 200 && !!r.data.token, r.data);

r = await call('POST', '/auth/register', null, { username: `la_${suffix}_2`, password: '12345' });
check('REG-007', '密码 5 位被拒绝', r.status !== 200 || !r.data.token, r.data);

r = await call('POST', '/auth/register', null, { username: '', password: '' });
check('REG-005', '空字段注册被拒绝', r.status === 400, r.data);

/* ============ 2. 登录与鉴权（LOG / DES） ============ */
const userA = `la_${suffix}_a`;
r = await call('POST', '/auth/register', null, { username: userA, password: PW });
check('LOG-001', '正常注册并拿到 token', r.status === 200 && !!r.data.token, r.data);
const tokenA = r.data.token;

r = await call('POST', '/auth/login', null, { username: userA, password: 'wrongpw' });
check('LOG-004', '密码错误返回 401', r.status === 401, r.data);

r = await call('POST', '/auth/login', null, { username: 'definitely_no_such_user', password: PW });
check('LOG-005', '不存在的用户返回 401', r.status === 401, r.data);

// DES-005：未带 token 访问受保护接口
for (const p of ['/children', `/children`, '/progress/1', '/rewards/1']) {
  r = await call('GET', p);
  check('DES-005', `无 token 访问 ${p} -> 401`, r.status === 401, r.status);
}
r = await call('POST', '/progress', null, { child_id: 1, module: 'characters', item_id: 1, correct: true });
check('DES-005', '无 token 提交进度 -> 401', r.status === 401, r.status);

// DES-006：伪造 token
r = await call('GET', '/children', 'forged.token.value');
check('DES-006', '伪造 token -> 401', r.status === 401, r.status);

/* ============ 3. 孩子与越权（CHD / DES-007 / DES-010） ============ */
r = await call('POST', '/children', tokenA, { name: 'A娃', age: 5, avatar: 'cat' });
const childA = r.data?.id;
check('CHD-001', '添加孩子成功', r.status === 200 && childA > 0, r.data);

// 边界：年龄 3 与 7
r = await call('POST', '/children', tokenA, { name: 'A娃3', age: 3 });
check('CHD-003', '年龄边界 3 可创建', r.status === 200 && r.data?.id > 0, r.data);
r = await call('POST', '/children', tokenA, { name: 'A娃7', age: 7 });
check('CHD-004', '年龄边界 7 可创建', r.status === 200 && r.data?.id > 0, r.data);

// DES-012：XSS 载荷按纯文本存储
const xss = '<img src=x onerror=alert(1)>';
r = await call('POST', '/children', tokenA, { name: xss, age: 5 });
check('DES-012', 'XSS 载荷可作为文本保存（不会执行）', r.status === 200 && r.data?.name === xss, r.data);

// DES-013：登录处 SQL 注入尝试
r = await call('POST', '/auth/login', null, { username: "admin' OR '1'='1", password: PW });
check('DES-013', 'SQL 注入尝试无法通过登录', r.status === 401, r.status);

// 第二个用户，验证越权
const userB = `la_${suffix}_b`;
r = await call('POST', '/auth/register', null, { username: userB, password: PW });
const tokenB = r.data.token;
r = await call('POST', '/children', tokenB, { name: 'B娃', age: 4 });
const childB = r.data?.id;

r = await call('GET', `/progress/${childA}`, tokenB);
check('DES-007', '他人读取进度 -> 403', r.status === 403, r.status);
r = await call('GET', `/rewards/${childA}`, tokenB);
check('DES-007', '他人读取奖励 -> 403', r.status === 403, r.status);
r = await call('DELETE', `/children/${childA}`, tokenB);
check('DES-007', '他人删除孩子 -> 403/404', r.status === 403 || r.status === 404, r.status);
r = await call('PUT', '/learning', tokenB, { child_id: childA, module: 'characters', scope: 'all', position: 9 });
check('DES-007', '他人写入学习位置 -> 403', r.status === 403, r.status);

/* ============ 4. 参数校验（DES-008/014/015/016/011） ============ */
r = await call('GET', '/courses/books/999999');
check('DES-008', '不存在的绘本 -> 404', r.status === 404, r.status);
r = await call('GET', '/courses/math/topics/999999');
check('DES-008', '不存在的数学知识点 -> 404', r.status === 404, r.status);

r = await call('POST', '/progress', tokenA, { module: 'characters', item_id: 1, correct: true });
check('DES-015', '缺 child_id -> 400', r.status === 400, r.status);
r = await call('POST', '/progress', tokenA, { child_id: childA, item_id: 1, correct: true });
check('DES-015', '缺 module -> 400', r.status === 400, r.status);

// 超大 body -> 413
const bigBody = { child_id: childA, module: 'characters', item_id: 1, correct: true, note: 'x'.repeat(120 * 1024) };
r = await call('POST', '/progress', tokenA, bigBody);
check('DES-016', '超过 100kb 的请求体 -> 413', r.status === 413, r.status);

// 超长用户名
r = await call('POST', '/auth/register', null, { username: 'u'.repeat(500), password: PW });
check('DES-011', '超长用户名不导致 500（被拒绝或截断）', r.status !== 500, r.status);

/* ============ 5. 网络安全（NET-006 非法来源） ============ */
r = await call('GET', '/children', tokenA, null, { Origin: 'https://evil.example.com' });
check('NET-006', '非法 Origin -> 403', r.status === 403, r.status);
r = await call('GET', '/children', tokenA, null, { Origin: 'http://localhost:5173' });
check('NET-006', '合法 localhost Origin 放行', r.status === 200, r.status);

/* ============ 6. 空数据（新孩子） ============ */
const empty = await call('GET', `/progress/${childB}`, tokenB);
check('PRG-007', '新孩子统计结构完整', !!empty.data?.total && Array.isArray(empty.data.byModule), empty.data?.total);
check('PRG-007', '新孩子正确率为 0 且在 0-100', empty.data?.total?.accuracy >= 0 && empty.data?.total?.accuracy <= 100, empty.data?.total?.accuracy);
const emptyReview = await call('GET', `/progress/review/${childB}`, tokenB);
check('REV-008', '新孩子复习列表为空', Array.isArray(emptyReview.data) && emptyReview.data.length === 0, emptyReview.data?.length);
const emptyAbility = await call('GET', `/progress/ability/${childB}`, tokenB);
check('PRG-005', '新孩子能力雷达为空数组', Array.isArray(emptyAbility.data), emptyAbility.data);
const emptyBadges = await call('GET', `/rewards/${childB}`, tokenB);
check('BDG-010', '新孩子未解锁任何徽章', emptyBadges.data?.badges?.every(b => !b.unlocked), emptyBadges.data?.badges?.filter(b => b.unlocked).length);

/* ============ 7. 端到端串联（E2E） ============ */
// E2E-003：首次学习自动点亮「初学乍练」
r = await call('POST', '/progress', tokenA, { child_id: childA, module: 'characters', item_id: 11, correct: true, duration: 6 });
check('E2E-003', '提交一次学习成功', r.status === 200 && r.data.success === true, r.data);
const afterOne = await call('GET', `/rewards/${childA}`, tokenA);
const firstBadge = afterOne.data?.badges?.find(b => b.name.includes('初学'));
check('E2E-003', '「初学乍练」自动点亮', !!firstBadge && firstBadge.unlocked === true, firstBadge);
check('E2E-003', '星星数 > 0', afterOne.data?.stars > 0, afterOne.data?.stars);

// E2E-002：答错 -> 进入复习队列且详情完整
r = await call('POST', '/progress', tokenA, { child_id: childA, module: 'characters', item_id: 12, correct: false, duration: 5, question: 'q', user_answer: 'A', correct_answer: 'B' });
check('E2E-002', '答错提交成功', r.status === 200, r.data);
const rv = await call('GET', `/progress/review/${childA}`, tokenA);
check('REV-011', '答错项进入复习队列', (rv.data || []).length > 0, rv.data?.length);
check('REV-009', '复习项均有 detail（不出现空白卡）', (rv.data || []).every(i => !!i.detail), (rv.data || []).filter(i => !i.detail).slice(0, 2));

// E2E-014：多模块徽章按各自指标点亮
for (const [mod, item] of [['math', 1], ['english', 1], ['books', 1], ['chinese-reading', 1]]) {
  r = await call('POST', '/progress', tokenA, { child_id: childA, module: mod, item_id: item, correct: true, duration: 7 });
  check('E2E-014', `模块 ${mod} 答题记录成功`, r.status === 200 && r.data.success === true, r.data);
}
const afterModules = await call('GET', `/rewards/${childA}`, tokenA);
const metricsOk = afterModules.data?.badges?.every(b => b.metric && Number(b.requirement) > 0);
check('BDG-017', '所有徽章都有 metric 与合法 requirement', metricsOk, afterModules.data?.badges?.filter(b => !b.metric).slice(0, 3));
const statsCover = Object.keys(afterModules.data?.stats || {}).length >= 12;
check('BDG-017', 'stats 覆盖 12 项指标', statsCover, Object.keys(afterModules.data?.stats || {}).length);

// E2E-018：断点续学保存与恢复
r = await call('PUT', '/learning', tokenA, { child_id: childA, module: 'characters', scope: 'all', position: 7 });
check('E2E-018', '保存学习位置成功', r.status === 200 && r.data.success === true, r.data);
r = await call('GET', `/learning/${childA}?module=characters&scope=all`, tokenA);
check('E2E-018', '恢复学习位置为 7', r.data?.position === 7, r.data);

// E2E-009：多孩子数据隔离
const aStats = await call('GET', `/progress/${childA}`, tokenA);
const bStats = await call('GET', `/progress/${childB}`, tokenB);
check('E2E-009', '两个孩子统计互相隔离', aStats.data?.total?.count > 0 && bStats.data?.total?.count === 0, { a: aStats.data?.total?.count, b: bStats.data?.total?.count });

/* ============ 8. 破坏性（DES-001 重复提交） ============ */
// 连续重复提交同一条进度，不应产生异常（仅校验不 500）
let dupOk = true;
for (let i = 0; i < 3; i++) {
  r = await call('POST', '/progress', tokenA, { child_id: childA, module: 'characters', item_id: 20, correct: true, duration: 3 });
  if (r.status !== 200) dupOk = false;
}
check('DES-001', '快速重复提交进度不报错', dupOk, dupOk);

// 删除孩子后访问其数据 -> 403（DES-010）
r = await call('POST', '/children', tokenA, { name: '待删娃', age: 5 });
const tmpChild = r.data?.id;
r = await call('DELETE', `/children/${tmpChild}`, tokenA);
check('CHD-010', '删除孩子成功', r.status === 200 && r.data.success === true, r.data);
r = await call('GET', `/rewards/${tmpChild}`, tokenA);
check('DES-010', '删除后访问其奖励 -> 403', r.status === 403, r.status);
r = await call('DELETE', `/children/${tmpChild}`, tokenA);
check('DES-010', '重复删除 -> 404', r.status === 404, r.status);

/* ============ 9. 登录限流（LOG-010，放最后避免影响其它用例） ============ */
let limited = false;
for (let i = 0; i < 12; i++) {
  const rr = await call('POST', '/auth/login', null, { username: userB, password: 'definitely_wrong' });
  if (rr.status === 429) { limited = true; break; }
}
check('LOG-010', '登录失败达上限后被限流（429）', limited, limited);

console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.length} checks, ${failures} failed`);
if (failures) process.exitCode = 1;
