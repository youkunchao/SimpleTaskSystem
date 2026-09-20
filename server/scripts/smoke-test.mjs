// 端到端冒烟测试：需先启动后端（默认 http://localhost:3001）
// 用法：npm run test:smoke      或   SMOKE_BASE=http://localhost:3002/api node scripts/smoke-test.mjs
const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const lines = [];
let failures = 0;

async function call(method, path, token, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function check(name, ok, detail) {
  if (ok) lines.push(`[PASS] ${name}`);
  else { failures++; lines.push(`[FAIL] ${name} :: ${JSON.stringify(detail).slice(0, 260)}`); }
}

const suffix = Date.now().toString(36);
const userA = `t_${suffix}_a`;
const userB = `t_${suffix}_b`;
const PW = '123456';
let r;

// ---------- health ----------
r = await call('GET', '/health');
check('health -> ok', r.status === 200 && r.data.status === 'ok', r.data);

// ---------- auth ----------
r = await call('POST', '/auth/register', null, { username: userA, password: PW });
check('register -> 200 + token', r.status === 200 && typeof r.data.token === 'string', r.data);
const tokenA = r.data.token;

r = await call('POST', '/auth/register', null, { username: userA, password: PW });
check('duplicate username -> 409', r.status === 409, r.data);

r = await call('POST', '/auth/register', null, { username: '', password: '' });
check('register empty fields -> 400', r.status === 400, r.data);

r = await call('POST', '/auth/login', null, { username: userA, password: PW });
check('login correct -> 200', r.status === 200 && !!r.data.token, r.data);

r = await call('POST', '/auth/login', null, { username: userA, password: 'wrong' });
check('login wrong password -> 401', r.status === 401, r.data);

r = await call('POST', '/auth/login', null, { username: 'no_such_user_xyz', password: PW });
check('login unknown user -> 401', r.status === 401, r.data);

// ---------- auth guard ----------
r = await call('GET', '/children');
check('no token -> 401', r.status === 401, r.data);

r = await call('GET', '/children', 'invalid.token.xxx');
check('invalid token -> 401', r.status === 401, r.data);

// ---------- children ----------
r = await call('GET', '/children', tokenA);
check('new user children -> empty', r.status === 200 && r.data.length === 0, r.data);

r = await call('POST', '/children', tokenA, { age: 5 });
check('create child without name -> 400', r.status === 400, r.data);

r = await call('POST', '/children', tokenA, { name: 'KidA', age: 5, avatar: '\u{1F98A}' });
check('create child -> 200 + id', r.status === 200 && r.data.id > 0, r.data);
const child1 = r.data.id;

r = await call('POST', '/children', tokenA, { name: 'KidB', age: 4 });
const child2 = r.data.id;

r = await call('GET', '/children', tokenA);
check('children list -> 2', r.status === 200 && r.data.length === 2, r.data && r.data.length);

// ---------- cross-user isolation ----------
r = await call('POST', '/auth/register', null, { username: userB, password: PW });
const tokenB = r.data.token;

r = await call('GET', `/progress/${child1}`, tokenB);
check("other user read progress -> 403", r.status === 403, r.data);

r = await call('GET', `/rewards/${child1}`, tokenB);
check("other user read rewards -> 403", r.status === 403, r.data);

r = await call('POST', '/progress', tokenB, { child_id: child1, module: 'characters', item_id: 1, correct: true });
check("other user post progress -> 403", r.status === 403, r.data);

r = await call('DELETE', `/children/${child1}`, tokenB);
check("other user delete child -> 403/404", r.status === 403 || r.status === 404, r.data);

// ---------- courses ----------
r = await call('GET', '/courses');
check('courses -> 4 modules', r.status === 200 && r.data.modules.length === 4, r.data);

for (let lv = 1; lv <= 20; lv++) {
  r = await call('GET', `/courses/characters?level=${lv}`);
  check(`characters level ${lv} -> 50 items`, r.status === 200 && r.data.length === 50, r.data && r.data.length);
}

r = await call('GET', '/courses/characters');
const allChars = r.data;
check('characters all -> 1000 items', allChars.length === 1000, allChars.length);
check('characters 无重复汉字', new Set(allChars.map(c => c.hanzi)).size === allChars.length, new Set(allChars.map(c => c.hanzi)).size);
check('characters 每字有拼音+释义+组词', allChars.every(c => c.pinyin && c.meaning && c.words), allChars.find(c => !c.pinyin || !c.meaning || !c.words));
check('characters 笔画数合法(1-30)', allChars.every(c => c.stroke_count >= 1 && c.stroke_count <= 30), allChars.find(c => !(c.stroke_count >= 1 && c.stroke_count <= 30)));
check('characters stroke_count not all 1', !allChars.every(c => c.stroke_count === 1), { sample: allChars[0] });
check('characters every item has pinyin+meaning', allChars.every(c => c.pinyin && c.meaning), allChars.find(c => !c.pinyin || !c.meaning));

r = await call('GET', '/courses/words');
check('words -> non empty', Array.isArray(r.data) && r.data.length > 0, r.data && r.data.length);
const cats = [...new Set(r.data.map(w => w.category))];
for (const c of cats) {
  r = await call('GET', `/courses/words?category=${encodeURIComponent(c)}`);
  check(`words category "${c}" -> non empty`, r.data.length > 0, r.data.length);
}

r = await call('GET', '/courses/math');
const mathAll = r.data;
check('math -> non empty', mathAll.length > 0, mathAll.length);
const mathBad = [];
const mathDup = [];
for (const m of mathAll) {
  let opts;
  try { opts = JSON.parse(m.options); } catch { mathBad.push({ id: m.id, reason: 'options not JSON' }); continue; }
  if (!Array.isArray(opts)) { mathBad.push({ id: m.id, reason: 'options not array' }); continue; }
  if (typeof m.answer !== 'number' || m.answer < 0 || m.answer >= opts.length) {
    mathBad.push({ id: m.id, reason: 'answer out of range', answer: m.answer, opts });
  }
  if (new Set(opts).size !== opts.length) mathDup.push({ id: m.id, opts });
}
check('math options parse + answer in range', mathBad.length === 0, mathBad.slice(0, 3));
check('math no duplicate options', mathDup.length === 0, mathDup.slice(0, 2));

r = await call('GET', '/courses/books');
check('books list -> non empty', r.status === 200 && r.data.length > 0, r.data);
const bookId = r.data[0].id;
r = await call('GET', `/courses/books/${bookId}`);
check('book detail pages parsed -> array', r.status === 200 && Array.isArray(r.data.pages) && r.data.pages.length > 0, r.data);
r = await call('GET', '/courses/books/99999');
check('missing book -> 404', r.status === 404, r.data);

for (const p of ['/courses/grammar', '/courses/listening', '/courses/reading', '/courses/chinese-reading']) {
  r = await call('GET', p);
  check(`${p} -> non empty`, Array.isArray(r.data) && r.data.length > 0, r.data && r.data.length);
}

r = await call('GET', '/courses/grammar');
const gbad = r.data.filter(g => {
  try {
    const o = JSON.parse(g.options);
    return !(Array.isArray(o) && g.answer >= 0 && g.answer < o.length);
  } catch { return true; }
});
check('grammar options parse + answer in range', gbad.length === 0, gbad.slice(0, 2));

r = await call('GET', '/courses/listening');
const lbad = r.data.filter(g => {
  try {
    const o = JSON.parse(g.options);
    return !(Array.isArray(o) && g.answer >= 0 && g.answer < o.length);
  } catch { return true; }
});
check('listening options parse + answer in range', lbad.length === 0, lbad.slice(0, 2));

r = await call('GET', '/courses/chinese-reading');
const cbad = r.data.filter(g => {
  try {
    const o = JSON.parse(g.options);
    return !(Array.isArray(o) && g.answer >= 0 && g.answer < o.length);
  } catch { return true; }
});
check('chinese-reading options parse + answer in range', cbad.length === 0, cbad.slice(0, 2));

// ---------- progress ----------
r = await call('POST', '/progress', tokenA, { child_id: child1, module: 'characters', item_id: 1, correct: true, duration: 5 });
check('progress correct -> success', r.status === 200 && r.data.success === true, r.data);

r = await call('POST', '/progress', tokenA, { child_id: child1, module: 'characters', item_id: 2, correct: false, duration: 5, question: 'x', user_answer: 'A', correct_answer: 'B' });
check('progress wrong -> success', r.status === 200 && r.data.success === true, r.data);

r = await call('POST', '/progress', tokenA, { module: 'characters', item_id: 1, correct: true });
check('progress missing child_id -> 400', r.status === 400, { status: r.status, data: r.data });

r = await call('POST', '/progress', tokenA, { child_id: 999999, module: 'characters', item_id: 1, correct: true });
check('progress unknown child -> 403', r.status === 403, r.data);

r = await call('POST', '/progress', tokenA, { child_id: child1, module: 'math', item_id: 1, correct: true });
check('progress math module accepted', r.status === 200, r.data);

r = await call('POST', '/progress', tokenA, { child_id: child1, module: 'books', item_id: 1, correct: true });
check('progress books module accepted', r.status === 200, r.data);

// 各模块答错 -> 应立即进入复习队列，用于验证复习详情是否齐全
for (const m of ['math', 'books', 'listening', 'reading', 'chinese-reading', 'grammar', 'english']) {
  r = await call('POST', '/progress', tokenA, { child_id: child1, module: m, item_id: 1, correct: false, duration: 4, question: 'q', user_answer: 'A', correct_answer: 'B' });
  check(`progress wrong on "${m}" accepted`, r.status === 200, r.data);
}

r = await call('GET', '/api-not-exist');
check('unknown api -> JSON 404', r.status === 404 && typeof r.data === 'object' && r.data.error, { status: r.status, data: String(r.data).slice(0, 60) });

// ---------- review ----------
r = await call('GET', `/progress/review/${child1}`, tokenA);
check('review list -> non empty', r.status === 200 && r.data.length > 0, r.data);
const nullDetail = (r.data || []).filter(i => i.detail === null || i.detail === undefined);
check('review items all have detail', nullDetail.length === 0, { count: nullDetail.length, sample: nullDetail[0] });
const reviewModules = [...new Set((r.data || []).map(i => i.module))].sort();
check('review covers multiple modules', reviewModules.length >= 5, reviewModules);
const noLabel = (r.data || []).filter(i => !i.memory_label);
check('review items have memory_label', noLabel.length === 0, noLabel.slice(0, 2));

// ---------- wrong book ----------
r = await call('GET', `/progress/wrong/${child1}`, tokenA);
check('wrong book contains wrong item', r.status === 200 && r.data.some(w => w.item_id === 2), r.data);

r = await call('GET', `/progress/wrong/${child1}?module=characters`, tokenA);
check('wrong book filter by module', r.status === 200 && r.data.every(w => w.module === 'characters'), r.data);

r = await call('POST', '/progress', tokenA, { child_id: child1, module: 'characters', item_id: 2, correct: true, duration: 5 });
r = await call('GET', `/progress/wrong/${child1}`, tokenA);
check('wrong item cleared after correct answer', !r.data.some(w => w.item_id === 2), r.data);

// ---------- stats ----------
r = await call('GET', `/progress/${child1}`, tokenA);
check('stats shape ok', r.status === 200 && r.data.total && Array.isArray(r.data.byModule) && Array.isArray(r.data.byDay) && Array.isArray(r.data.memoryDistribution), r.data);
check('accuracy 0-100', typeof r.data.total.accuracy === 'number' && r.data.total.accuracy >= 0 && r.data.total.accuracy <= 100, r.data.total);
check('memoryDistribution has 5 levels', r.data.memoryDistribution.length === 5, r.data.memoryDistribution);

// ---------- rewards ----------
r = await call('GET', `/rewards/${child1}`, tokenA);
check('rewards stars > 0', r.status === 200 && r.data.stars > 0, r.data);
check('rewards badges non empty', Array.isArray(r.data.badges) && r.data.badges.length > 0, r.data.badges);
check('badge unlocked after first study', r.data.badges.some(b => b.unlocked === true), r.data.badges.map(b => ({ n: b.name, u: b.unlocked })));
check('streak >= 1', r.data.streak >= 1, r.data.streak);

// ---------- streak integrity ----------
r = await call('GET', `/rewards/${child1}`, tokenA);
const starsBefore = r.data.stars;
r = await call('POST', '/progress', tokenA, { child_id: child1, module: 'characters', item_id: 3, correct: false, duration: 3, question: 'q', user_answer: 'A', correct_answer: 'B' });
r = await call('GET', `/rewards/${child1}`, tokenA);
check('wrong answer should not add stars (or should it)', r.data.stars === starsBefore, { before: starsBefore, after: r.data.stars });

// ---------- timezone ----------
r = await call('GET', '/children', tokenA);
const created = r.data[0].created_at;
const utcHour = Number(String(created).slice(11, 13));
const localHour = new Date().getHours();
check('children.created_at uses local time (timezone)', utcHour === localHour, { created, utcHour, localHour, tzOffsetMin: new Date().getTimezoneOffset() });

// ---------- 学习位置（断点续学） ----------
r = await call('GET', `/learning/${child1}?module=characters&scope=1`, tokenA);
check('learning position default 0', r.status === 200 && r.data.position === 0, r.data);

r = await call('PUT', '/learning', tokenA, { child_id: child1, module: 'characters', scope: '1', position: 3 });
check('learning position save -> success', r.status === 200 && r.data.success === true, r.data);

r = await call('GET', `/learning/${child1}?module=characters&scope=1`, tokenA);
check('learning position restored to 3', r.data.position === 3, r.data);

r = await call('GET', `/learning/${child1}?module=characters&scope=2`, tokenA);
check('learning position isolated by scope', r.data.position === 0, r.data);

r = await call('PUT', '/learning', tokenB, { child_id: child1, module: 'characters', scope: '1', position: 5 });
check("other user save learning -> 403", r.status === 403, r.data);

r = await call('PUT', '/learning', tokenA, { module: 'characters', position: 1 });
check('learning missing child_id -> 400', r.status === 400, r.data);

r = await call('GET', `/learning/${child1}`, tokenA);
check('learning missing module -> 400', r.status === 400, r.data);

// ---------- delete cascade ----------
r = await call('DELETE', `/children/${child2}`, tokenA);
check('delete child -> success', r.status === 200 && r.data.success, r.data);

r = await call('GET', '/children', tokenA);
check('children list -> 1 after delete', r.data.length === 1, r.data.length);

r = await call('GET', `/rewards/${child2}`, tokenA);
check('deleted child rewards -> 403', r.status === 403, r.data);

r = await call('DELETE', `/children/${child2}`, tokenA);
check('delete same child again -> 404', r.status === 404, r.data);

console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.length} checks, ${failures} failed`);
