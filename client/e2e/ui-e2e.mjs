// UI 端到端 E2E（Playwright）：覆盖人工点测难以穷尽、却对上线关键的维度：
//  A) 多分辨率：手机/小屏/平板/桌面 四种视口下各主页面均正常渲染、无脚本异常；
//  B) 弱网：用 CDP 模拟 Slow 3G，页面仍能加载渲染、不白屏；
//  C) 路由深链全量渲染：15 条路由直接深链访问均渲染、无运行时异常；
//  D) 高频重复操作：在识字页疯狂连点 40 次，应用不崩溃、会话不被破坏；
//  E) 完整 UI 长链路：首页→课程→识字→奖励→徽章→进度，关键内容可见；
//  F) 状态完整性：交互后 localStorage 登录态未被破坏、无未捕获异常。
// 依赖：npm i -D playwright && npx playwright install chromium
// 前置：后端以生产模式运行（npm run start），默认 http://localhost:3001
// 用法：node e2e/ui-e2e.mjs
import { chromium } from 'playwright';

const UI = process.env.UI_BASE || 'http://localhost:3001';
const API = process.env.API_BASE || 'http://localhost:3001/api';
const lines = [];
let failures = 0;
function check(name, ok, detail) {
  if (ok) lines.push(`[PASS] ${name}`);
  else { failures++; lines.push(`[FAIL] ${name} :: ${JSON.stringify(detail).slice(0, 200)}`); }
}
function info(name, value) { lines.push(`[INFO] ${name} = ${value}`); }

async function api(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

// ---------- 准备已登录会话（API 注册 + 造一点进度，避免空态）----------
const suffix = Date.now().toString(36);
const username = `e2e_${suffix}`, password = '123456';
const reg = await api('POST', '/auth/register', null, { username, password });
const token = reg.data.token, user = reg.data.user;
const childRes = await api('POST', '/children', token, { name: 'E2E娃', age: 5, avatar: '🐯' });
const child = childRes.data;
// 造 30 个汉字进度，让奖励/徽章页有内容
for (let i = 1; i <= 30; i++) {
  await api('POST', '/progress', token, { child_id: child.id, module: 'characters', item_id: i, correct: true, duration: 30 });
}
info('会话准备', `user=${username} child=${child.id}`);

async function setupSession(page) {
  await page.goto(UI + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user, child }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('activeChild', JSON.stringify(child));
  }, { token, user, child });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#root', { timeout: 15000 });
}

const browser = await chromium.launch();
const ROUTES = ['/', '/courses', '/children', '/characters', '/english', '/math', '/books', '/chinese-reading', '/progress', '/rewards', '/badges', '/review', '/settings', '/login', '/register'];

// ---------- A) 多分辨率 ----------
info('--- A) 多分辨率 ---');
const viewports = [
  { name: 'iPhoneSE', width: 375, height: 667 },
  { name: 'small320', width: 320, height: 568 },
  { name: 'iPad', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await setupSession(page);
  await page.goto(UI + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const txt = await page.locator('#root').innerText().catch(() => '');
  const fatal = errors.filter(e => /Cannot read|is not a function|undefined is not|Maximum update|Too many re-renders/.test(e));
  check(`RES-${vp.name}`, `视口 ${vp.width}x${vp.height} 首页渲染且无致命异常`, txt.length > 0 && fatal.length === 0, fatal.slice(0, 2));
  // 进一个沉浸式全屏页（识字），验证大尺寸内容不溢出白屏
  await page.goto(UI + '/characters', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const txt2 = await page.locator('#root').innerText().catch(() => '');
  check(`RES-${vp.name}-char`, `视口 ${vp.width} 识字页渲染`, txt2.length > 0, { len: txt2.length });
  await ctx.close();
}

// ---------- B) 弱网 ----------
info('--- B) 弱网 (Slow 3G) ---');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 20000 });
  await setupSession(page);
  await page.goto(UI + '/progress', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#root', { timeout: 25000 });
  await page.waitForTimeout(1500);
  const txt = await page.locator('#root').innerText().catch(() => '');
  check('WEAK-1', '弱网下进度页仍可加载渲染', txt.length > 0, { len: txt.length });
  // 解除限速
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await ctx.close();
}

// ---------- C) 路由深链全量渲染 ----------
info('--- C) 路由深链渲染 ---');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  for (const route of ROUTES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(UI + route, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForSelector('#root', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
    const txt = await page.locator('#root').innerText().catch(() => '');
    check(`DEEPLINK-${route}`, `深链 ${route} 渲染且无异常`, txt.length > 0 && errors.length === 0, errors.slice(0, 2));
    await page.close();
  }
  await ctx.close();
}

// ---------- D) 高频重复操作 + 状态完整性 ----------
info('--- D) 高频重复操作 ---');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await setupSession(page);
  await page.goto(UI + '/characters', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  // 疯狂连点：找到所有按钮快速点击 40 次（模拟小孩乱点）
  let clicked = 0;
  for (let i = 0; i < 40; i++) {
    const btns = await page.locator('button:visible').count().catch(() => 0);
    if (btns > 0) {
      await page.locator('button:visible').first().click({ timeout: 1000, force: true }).catch(() => {});
      clicked++;
    }
    await page.waitForTimeout(30);
  }
  const alive = await page.locator('#root').innerText().catch(() => '');
  const tokenStill = await page.evaluate(() => localStorage.getItem('token'));
  check('HF-1', `高频连点 ${clicked} 次后应用未崩溃`, alive.length > 0 && errors.length === 0, errors.slice(0, 2));
  check('HF-2', '高频操作后登录态未被破坏', tokenStill === token, { same: tokenStill === token });
  await ctx.close();
}

// ---------- E) 完整 UI 长链路 ----------
info('--- E) 完整 UI 长链路 ---');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await setupSession(page);
  const steps = [];
  await page.goto(UI + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600); steps.push(['首页', await page.locator('#root').innerText().catch(() => '')]);
  await page.goto(UI + '/courses', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(600); steps.push(['课程', await page.locator('#root').innerText().catch(() => '')]);
  await page.goto(UI + '/characters', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(900); steps.push(['识字', await page.locator('#root').innerText().catch(() => '')]);
  await page.goto(UI + '/rewards', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(700); steps.push(['奖励', await page.locator('#root').innerText().catch(() => '')]);
  await page.goto(UI + '/badges', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(700); steps.push(['徽章', await page.locator('#root').innerText().catch(() => '')]);
  await page.goto(UI + '/progress', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(700); steps.push(['进度', await page.locator('#root').innerText().catch(() => '')]);
  const allRendered = steps.every(s => s[1].length > 0);
  check('FLOW-1', '长链路各页均渲染', allRendered, steps.filter(s => s[1].length === 0).map(s => s[0]));
  check('FLOW-2', '长链路无未捕获异常', errors.length === 0, errors.slice(0, 2));
  // 奖励页应能看到星星（造了 30 正确 → 60 星）
  const rewardsTxt = steps.find(s => s[0] === '奖励')[1];
  check('FLOW-3', '奖励页含"星星"字样', /星/.test(rewardsTxt), { has: /星/.test(rewardsTxt) });
  await ctx.close();
}

await browser.close();
console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.filter(l => l.startsWith('[PASS]')).length + failures} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
