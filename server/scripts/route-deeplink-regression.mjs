// 路由深链全量回归：验证「生产模式单服务器托管」下，
// 1) 15 条前端路由直接深链访问都返回 SPA 入口（index.html），不会 404/白屏；
// 2) 每条「数据路由」对应的后端接口可用并返回正确结构；
// 3) 受保护路由在无 token 时仍返回 HTML（SPA 启动后由前端重定向），而非 HTTP 401。
// 前置：npm run start（生产模式，会托管 client/dist）。
// 用法：node scripts/route-deeplink-regression.mjs
const API = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const UI = process.env.UI_BASE || 'http://localhost:3001';
const lines = [];
let failures = 0;

async function req(method, url, token, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ct: res.headers.get('content-type') || '', data };
}
function check(id, name, ok, detail) {
  if (ok) lines.push(`[PASS] ${id} ${name}`);
  else { failures++; lines.push(`[FAIL] ${id} ${name} :: ${JSON.stringify(detail).slice(0, 240)}`); }
}

// 客户端路由（来自 client/src/App.jsx） + 对应的后端数据接口
const ROUTES = [
  { path: '/login' },
  { path: '/register' },
  { path: '/', api: '/children', child: false },
  { path: '/courses' },
  { path: '/children', api: '/children', child: false },
  { path: '/characters', api: '/courses/characters', child: false },
  { path: '/english', api: '/courses/english/age-groups', child: false },
  { path: '/math', api: '/courses/math/stages', child: false },
  { path: '/books', api: '/courses/books', child: false },
  { path: '/chinese-reading', api: '/courses/chinese-reading', child: false },
  { path: '/progress', api: '/progress', child: true },
  { path: '/rewards', api: '/rewards', child: true },
  { path: '/badges', api: '/rewards', child: true, badges: true },
  { path: '/review', api: '/progress/review', child: true },
  { path: '/settings' },
];

// ---- 登录 ----
const suffix = Date.now().toString(36);
const user = `deeplink_${suffix}`;
let r = await req('POST', API + '/auth/register', null, { username: user, password: '123456' });
check('AUTH', '注册成功', r.status === 200 && !!r.data.token, r.status);
const token = r.data.token;
r = await req('POST', API + '/children', token, { name: 'DeepLinkKid', age: 5, avatar: '🐯' });
check('CHILD', '创建孩子', r.status === 200 && r.data.id > 0, r.status);
const childId = r.data.id;

// ---- 1) SPA 深链回退：每条路由 GET 都返回 HTML 入口 ----
for (const rt of ROUTES) {
  const res = await req('GET', UI + rt.path);
  const isHtml = res.status === 200 && /text\/html/i.test(res.ct) && String(res.data).includes('id="root"');
  check(`HTML-${rt.path}`, `深链 ${rt.path} -> 返回 SPA(index.html)`, isHtml, { status: res.status, ct: res.ct });
}

// ---- 2) 受保护路由无 token 仍返回 HTML（前端再重定向），不得 401 ----
for (const rt of ['/progress', '/rewards', '/badges', '/review', '/characters']) {
  const res = await req('GET', UI + rt);
  const ok = res.status === 200 && /text\/html/i.test(res.ct);
  check(`NOAUTH-${rt}`, `无 token 深链 ${rt} 仍返回 HTML（非 401）`, ok, { status: res.status, ct: res.ct });
}

// ---- 3) 数据路由 backing API 可用且结构正确 ----
const apiPath = (rt) => {
  if (!rt.api) return null;
  if (rt.path === '/progress') return `${rt.api}/${childId}`;
  if (rt.path === '/rewards' || rt.path === '/badges') return `${rt.api}/${childId}`;
  if (rt.path === '/review') return `${rt.api}/${childId}`;
  return rt.api;
};
for (const rt of ROUTES) {
  const p = apiPath(rt);
  if (!p) continue;
  const res = await req('GET', API + p, token);
  if (rt.badges) {
    const arr = Array.isArray(res.data?.badges) ? res.data.badges : [];
    check(`API-${rt.path}`, `backing ${p} -> 200 + 徽章数组`, res.status === 200 && arr.length >= 30, { status: res.status, n: arr.length });
  } else if (rt.path === '/progress') {
    check(`API-${rt.path}`, `backing ${p} -> 200 + 统计结构`, res.status === 200 && res.data && typeof res.data === 'object', { status: res.status });
  } else if (rt.path === '/review') {
    // 新孩子零错题 -> 复习队列本就为空数组，接口可达且返回数组即合法
    check(`API-${rt.path}`, `backing ${p} -> 200 + 复习队列(数组,可空)`, res.status === 200 && Array.isArray(res.data), { status: res.status, type: typeof res.data });
  } else {
    const arr = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.items) ? res.data.items : null);
    check(`API-${rt.path}`, `backing ${p} -> 200 + 数据`, res.status === 200 && (Array.isArray(arr) ? true : res.data && typeof res.data === 'object'), { status: res.status });
  }
}

// ---- 4) 非法深链（带扩展名/未知路径）仍回退，不泄露 API ----
{
  const res = await req('GET', UI + '/some/unknown/path');
  check('FALLBACK', '未知深链回退 index.html', res.status === 200 && /text\/html/i.test(res.ct), { status: res.status });
  const res2 = await req('GET', UI + '/api/secret-endpoint');
  check('API404', '未知 API 返回 JSON 404（不回退 HTML）', res2.status === 404 && typeof res2.data === 'object', { status: res2.status });
}

console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.filter(l => l.startsWith('[PASS]')).length + failures} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
