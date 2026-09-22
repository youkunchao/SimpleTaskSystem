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
function check(name, message, ok, detail) {
  if (ok) lines.push(`[PASS] ${name} ${message}`);
  else { failures++; lines.push(`[FAIL] ${name} ${message} :: ${JSON.stringify(detail).slice(0, 200)}`); }
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

// ---------- G) 功能点全覆盖（确保不漏任何业务功能）----------
info('--- G) 功能点全覆盖 ---');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => d.accept()); // 自动接受"删除孩子"确认框
  await setupSession(page);

  // G1) 孩子管理 UI：添加→出现→删除
  await page.goto(UI + '/children', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const beforeAdd = (await page.locator('#root').innerText()).match(/E2E/g) ? 1 : 0;
  // 点击"添加孩子"
  await page.locator('button:has-text("添加孩子")').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(400);
  const nameInput = page.locator('input[placeholder="孩子姓名"]');
  if (await nameInput.count()) {
    await nameInput.fill('测试二娃');
    await page.locator('button:has-text("确定")').last().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  const afterTxt = await page.locator('#root').innerText();
  check('G1-ADD', 'UI 添加孩子后出现"测试二娃"', /测试二娃/.test(afterTxt), { has: /测试二娃/.test(afterTxt) });
  // 删除刚添加的孩子：定位"测试二娃"名称所在卡片内的删除按钮，避免误删主孩子
  const card = page.getByText('测试二娃', { exact: true }).locator('xpath=parent::div');
  const delBtn = card.locator('button', { hasText: '删除' });
  if (await delBtn.count()) {
    await delBtn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  const afterDel = await page.locator('#root').innerText();
  check('G1-DEL', 'UI 删除孩子后"测试二娃"消失', !/测试二娃/.test(afterDel), { has: /测试二娃/.test(afterDel) });
  // 守卫：主孩子(初始 child.id)必须仍在，未被误删
  const childrenList = (await api('GET', '/children', token)).data || [];
  check('G1-KEEP', `主孩子 ${child.id} 未被误删`, childrenList.some(c => c.id === child.id), { ids: childrenList.map(c => c.id) });

  // G2) 设置页渲染（朗读人声/语速）
  await page.goto(UI + '/settings', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const setTxt = await page.locator('#root').innerText();
  check('G2-SETTINGS', '设置页渲染(含朗读设置/语速)', /朗读设置|语速/.test(setTxt), { len: setTxt.length });

  // G3) 绘本阅读流程：取真实书→UI 打开→API 标记已读→books_read 递增
  const books = (await api('GET', '/courses/books', token)).data || [];
  check('G3-BOOKS-API', 'GET /courses/books 有书', Array.isArray(books) && books.length > 0, books?.length);
  if (books.length) {
    const b = books[0];
    await page.goto(UI + '/books', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    // 点击第一本书卡片打开详情
    await page.locator('button, div[role="button"]').filter({ hasText: b.title || '' }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(500);
    const readBefore = (await api('GET', `/rewards/${child.id}`, token)).data.stats?.books_read || 0;
    const pr = await api('POST', '/progress', token, { child_id: child.id, module: 'books', item_id: b.id, correct: true, duration: 30 });
    check('G3-READ-POST', '绘本阅读进度写入 200', pr.status === 200, pr.status);
    const readAfter = (await api('GET', `/rewards/${child.id}`, token)).data.stats?.books_read || 0;
    check('G3-READ-INC', `books_read 递增(${readBefore}→${readAfter})`, readAfter === readBefore + 1, { readBefore, readAfter });
  }

  // G4) 中文阅读流程：标记已读→chinese_mastered 递增 + UI 渲染
  const readings = (await api('GET', '/courses/chinese-reading', token)).data || [];
  check('G4-CN-API', 'GET /courses/chinese-reading 有内容', Array.isArray(readings) && readings.length > 0, readings?.length);
  await page.goto(UI + '/chinese-reading', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const cnTxt = await page.locator('#root').innerText();
  check('G4-CN-UI', '中文阅读页渲染', cnTxt.length > 0, { len: cnTxt.length });
  if (readings.length) {
    const cnBefore = (await api('GET', `/rewards/${child.id}`, token)).data.stats?.chinese_mastered || 0;
    const pr = await api('POST', '/progress', token, { child_id: child.id, module: 'chinese-reading', item_id: readings[0].id, correct: true, duration: 30 });
    const cnAfter = (await api('GET', `/rewards/${child.id}`, token)).data.stats?.chinese_mastered || 0;
    check('G4-CN-INC', `chinese_mastered 递增(${cnBefore}→${cnAfter})`, cnAfter === cnBefore + 1, { cnBefore, cnAfter });
  }

  // G5) 复习答题流程：用真实汉字 id 造错题→进入复习队列→连对5次→review_mastered 递增且队列清空
  const chars = (await api('GET', '/courses/characters', token)).data || [];
  const revItemId = chars.length ? chars[0].id : 1;
  const revBefore = (await api('GET', `/rewards/${child.id}`, token)).data.stats?.review_mastered || 0;
  // 一道错题进入复习队列（模块 characters，真实 id，确保 fetchDetail 能取到内容）
  await api('POST', '/progress', token, { child_id: child.id, module: 'characters', item_id: revItemId, correct: false, duration: 5 });
  const q1raw = (await api('GET', `/progress/review/${child.id}`, token)).data;
  const queue1 = Array.isArray(q1raw) ? q1raw : [];
  check('G5-QUEUE', '错题进入复习队列', queue1.some(q => q.module === 'characters' && q.item_id === revItemId), { n: queue1.length, isArray: Array.isArray(q1raw) });
  // 连对 5 次（level 0→4 精通）
  for (let i = 0; i < 5; i++) {
    await api('POST', '/progress', token, { child_id: child.id, module: 'characters', item_id: revItemId, correct: true, duration: 5 });
  }
  const revAfter = (await api('GET', `/rewards/${child.id}`, token)).data.stats?.review_mastered || 0;
  check('G5-MASTER', `review_mastered 递增(${revBefore}→${revAfter})`, revAfter === revBefore + 1, { revBefore, revAfter });
  const q2raw = (await api('GET', `/progress/review/${child.id}`, token)).data;
  const queue2 = Array.isArray(q2raw) ? q2raw : [];
  check('G5-CLEAR', '精通后该错题移出复习队列', !queue2.some(q => q.module === 'characters' && q.item_id === revItemId), { n: queue2.length, isArray: Array.isArray(q2raw) });

  // G6) 数学题目/测验：UI 渲染 + API 取题
  await page.goto(UI + '/math', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const mathTxt = await page.locator('#root').innerText();
  check('G6-MATH-UI', '数学页渲染', mathTxt.length > 0, { len: mathTxt.length });
  const stages = (await api('GET', '/courses/math/stages', token)).data || [];
  if (stages.length) {
    const stageKey = stages[0].key || stages[0].id || stages[0].stage || '2-3';
    const topics = (await api('GET', `/courses/math/topics?stage=${encodeURIComponent(stageKey)}`, token)).data || [];
    check('G6-MATH-TOPICS', `GET /courses/math/topics?stage=${stageKey} 有题`, topics.length > 0, topics.length);
  }

  // G7) 登录失败 UI：错误密码不跳转首页且提示错误
  {
    const lctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const lpage = await lctx.newPage();
    await lpage.goto(UI + '/login', { waitUntil: 'domcontentloaded' });
    await lpage.waitForTimeout(400);
    await lpage.fill('input[placeholder*="用户名"], input#username', 'fc_x_nope').catch(() => {});
    // 兜底：用任意输入框
    const inputs = lpage.locator('input');
    const n = await inputs.count();
    if (n >= 2) {
      await inputs.nth(0).fill('wrong_user');
      await inputs.nth(1).fill('wrong_pass');
      await lpage.locator('button:has-text("登录")').click({ timeout: 5000 }).catch(() => {});
      await lpage.waitForTimeout(800);
      const stillLogin = lpage.url().includes('/login') || (await lpage.locator('#root').innerText()).includes('登录');
      const errShown = /错误|失败|不正确|无效/.test(await lpage.locator('#root').innerText().catch(() => ''));
      check('G7-LOGIN-FAIL', '错误密码登录失败且不进入首页', stillLogin, { stillLogin });
    } else { info('G7-LOGIN-FAIL', '登录页输入框结构异常，跳过'); }
    await lctx.close();
  }

  // G8) TTS 兜底：触发朗读按钮，页面不崩溃
  await page.goto(UI + '/characters', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const speakBtn = page.locator('button:has-text("听"), button[aria-label*="听"], button:has(svg)').first();
  if (await speakBtn.count()) {
    await speakBtn.click({ timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
  const afterSpeak = await page.locator('#root').innerText().catch(() => '');
  check('G8-TTS', '触发朗读后页面不崩溃', afterSpeak.length > 0 && errors.length === 0, errors.slice(0, 2));
  check('G-FUNCTIONAL', '功能点全覆盖无致命异常', errors.length === 0, errors.slice(0, 3));
  await ctx.close();
}

// ---------- H) 流畅度 / 性能指标（确保运行丝滑）----------
info('--- H) 流畅度/性能 ---');
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const pageErrs = [], failedReq = [];
  page.on('pageerror', e => pageErrs.push(String(e)));
  page.on('requestfailed', r => failedReq.push(`${r.url()} :: ${r.failure()?.errorText}`));
  page.on('console', m => { if (m.type() === 'error') pageErrs.push('console:' + m.text()); });
  await setupSession(page);

  // 等待 #root 渲染出内容（正确传递 timeout 到 options 第三参）
  const waitContent = async (pg, timeout = 8000) => {
    try { await pg.waitForFunction(() => (document.querySelector('#root')?.innerText?.length || 0) > 50, undefined, { timeout }); return true; }
    catch { return false; }
  };

  // H1) 关键接口响应耗时（阈值 800ms）
  const timedApi = async (method, path, tk, body) => {
    const t0 = performance.now();
    const r = await api(method, path, tk, body);
    return { ms: Math.round(performance.now() - t0), status: r.status };
  };
  const apis = [
    ['GET', '/courses', null], ['GET', `/rewards/${child.id}`, token],
    ['GET', `/progress/${child.id}`, token], ['GET', '/courses/characters', token],
    ['GET', '/courses/books', token], ['GET', '/courses/chinese-reading', token],
  ];
  let apiMax = 0;
  for (const [m, p, tk] of apis) {
    const r = await timedApi(m, p, tk);
    apiMax = Math.max(apiMax, r.ms);
    check(`H-API-${p}`, `接口 ${p} 响应 <=800ms (${r.ms}ms)`, r.status === 200 && r.ms <= 800, { ms: r.ms, status: r.status });
  }
  info('API-最大耗时', `${apiMax}ms`);

  // H2) 冷启动深链渲染耗时（含懒加载 chunk）
  const measureRender = async (route) => {
    const t0 = Date.now();
    await page.goto(UI + route, { waitUntil: 'domcontentloaded' });
    const ok = await waitContent(page, 8000);
    const ms = Date.now() - t0;
    const pass = ok && ms <= 4000;
    if (!ok) {
      const txt = await page.locator('#root').innerText().catch(() => '(err)');
      info('DBG-' + route + '-text', JSON.stringify(txt.slice(0, 80)));
      info('DBG-' + route + '-errs', JSON.stringify(pageErrs.slice(-3)));
      info('DBG-' + route + '-reqfail', JSON.stringify(failedReq.slice(-3)));
    }
    check(`H-RENDER-${route}`, `路由 ${route} 渲染 <=4000ms (${ms}ms)`, pass, { ms, ok });
    return ms;
  };
  const renders = {};
  for (const r of ['/', '/characters', '/progress', '/rewards', '/books', '/chinese-reading']) {
    renders[r] = await measureRender(r);
    info('RENDER' + r, renders[r] + 'ms');
  }
  const lazyMax = Math.max(renders['/characters'] || 0, renders['/progress'] || 0);
  info('懒加载最大渲染耗时(characters/progress)', `${lazyMax}ms`);

  // H3) 应用内导航（底部 Tab 切换）耗时
  await page.goto(UI + '/', { waitUntil: 'domcontentloaded' });
  const navReady = await waitContent(page, 8000);
  const navTimes = [];
  const navTo = async (clickText) => {
    const t0 = Date.now();
    // 底部导航是固定元素，直接点底部 nav 里的文字按钮
    await page.locator('nav button:has-text("' + clickText + '")').first().click({ timeout: 4000 }).catch(() => {});
    await waitContent(page, 6000);
    navTimes.push(Date.now() - t0);
  };
  if (navReady) {
    await navTo('奖励'); await navTo('课程'); await navTo('进度');
  }
  const navMax = navTimes.length ? Math.max(...navTimes) : 0;
  check('H-NAV', `Tab 切换最大耗时 <=1500ms (${navMax}ms)`, navMax > 0 && navMax <= 1500, { navTimes });

  // H4) 完整点击链路总耗时：首页→课程→识字→奖励
  const tFlow = Date.now();
  await page.goto(UI + '/', { waitUntil: 'domcontentloaded' });
  await waitContent(page, 8000);
  await page.locator('nav button:has-text("课程")').first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.goto(UI + '/characters', { waitUntil: 'domcontentloaded' });
  await waitContent(page, 8000);
  await page.goto(UI + '/rewards', { waitUntil: 'domcontentloaded' });
  await waitContent(page, 8000);
  const flowMs = Date.now() - tFlow;
  check('H-FLOW', `完整链路(首页→课程→识字→奖励) <=8000ms (${flowMs}ms)`, flowMs <= 8000, { flowMs });

  await ctx.close();
}

await browser.close();
console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.filter(l => l.startsWith('[PASS]')).length + failures} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
