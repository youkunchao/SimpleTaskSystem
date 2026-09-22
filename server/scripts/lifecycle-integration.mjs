// 完整长业务链路集成测试 + 高频重复操作 + 状态一致性校验。
// 覆盖：注册→创建孩子→(汉字/英语/数学/绘本/中文 学习 + 复习精通训练 + 错题)→
//       奖励/徽章/进度/能力/错题本/复习 全维度读取→高频并发冲击→最终状态一致性。
// 关键点：星星累加是「读-改-写」同步操作，本测试用并发写入验证「不会丢星」(无状态异常)。
// 时间相关徽章(连续打卡/学习天数)无法在单次运行真实触发，会校验它们「正确保持未解锁」。
// 用法：node scripts/lifecycle-integration.mjs
const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const lines = [];
let failures = 0;
async function req(method, path, token, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (e) { return { status: 0, data: String(e), err: true }; }
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}
function check(id, name, ok, detail) {
  if (ok) lines.push(`[PASS] ${id} ${name}`);
  else { failures++; lines.push(`[FAIL] ${id} ${name} :: ${JSON.stringify(detail).slice(0, 220)}`); }
}
function info(name, value) { lines.push(value === undefined ? `[INFO] ${name}` : `[INFO] ${name} = ${value}`); }
// 受限并发批处理
async function batch(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
}

// ---------- 登录 ----------
const suffix = Date.now().toString(36);
const user = `life_${suffix}`;
let r = await req('POST', '/auth/register', null, { username: user, password: '123456' });
check('AUTH', '注册', r.status === 200 && !!r.data.token, r.status);
const token = r.data.token;
r = await req('POST', '/children', token, { name: '长链路娃', age: 6, avatar: '🦊' });
check('CHILD', '创建孩子', r.status === 200 && r.data.id > 0, r.status);
const child = r.data.id;

// ---------- 拉取真实内容 id ----------
const chars = (await req('GET', '/courses/characters', token)).data || [];
const charIds = chars.slice(0, 100).map(c => c.id);
info('汉字样本', charIds.length);

// 英语：遍历 age-groups→categories→words 收集 id
const enAge = (await req('GET', '/courses/english/age-groups', token)).data || [];
const enIds = [];
for (const g of enAge) {
  const cats = (await req('GET', `/courses/english/categories?age=${encodeURIComponent(g.key)}`, token)).data || [];
  for (const c of cats) {
    const ws = (await req('GET', `/courses/english/words?categoryId=${c.id}`, token)).data || [];
    ws.forEach(w => enIds.push(w.id));
  }
}
const enCorrectIds = enIds.slice(0, 80);
const enWrongIds = enIds.slice(80, 90);
info('英语可用/正确/错误样本', `${enIds.length}/${enCorrectIds.length}/${enWrongIds.length}`);

const mathAll = (await req('GET', '/courses/math', token)).data || [];
const mathIds = mathAll.slice(0, 100).map(m => m.id);
info('数学题样本', mathIds.length);

const books = (await req('GET', '/courses/books', token)).data || [];
const bookIds = books.map(b => b.id);
info('绘本数量', bookIds.length);

const chinese = (await req('GET', '/courses/chinese-reading', token)).data || [];
const chineseIds = chinese.slice(0, 10).map(c => c.id);
info('中文阅读样本', chineseIds.length);

// ---------- 计数器 ----------
let correctCount = 0, studyCount = 0, durationSum = 0;
async function learn(module, itemId, correct, duration = 60) {
  const body = { child_id: child, module, item_id: itemId, correct, duration };
  if (!correct) { body.question = 'q'; body.user_answer = 'A'; body.correct_answer = 'B'; body.explanation = 'e'; }
  const res = await req('POST', '/progress', token, body);
  if (res.status === 200) {
    studyCount++;
    if (correct) correctCount++;
    durationSum += duration;
  } else {
    check(`POST-${module}-${itemId}`, `进度写入 ${module}#${itemId}`, false, res.status);
  }
  return res;
}

// 阶段1：学习主链路
info('--- 阶段1：学习主链路 ---');
await batch(charIds, 10, id => learn('characters', id, true));
await batch(enCorrectIds, 10, id => learn('english', id, true));
await batch(mathIds, 10, id => learn('math', id, true));
await batch(bookIds, 10, id => learn('books', id, true));
await batch(chineseIds, 10, id => learn('chinese-reading', id, true));
// 阶段1b：错题（英语 81-90），用于错题本/复习队列
await batch(enWrongIds, 5, id => learn('english', id, false, 0));
// 阶段1c：复习精通训练（20 个汉字各再答对 4 次 → interval_level 达 4）
const drillIds = charIds.slice(0, 20);
for (let round = 0; round < 4; round++) {
  await batch(drillIds, 10, id => learn('characters', id, true));
}
info('累计正确/总学习/时长(秒)', `${correctCount}/${studyCount}/${durationSum}`);

// ---------- 阶段2：状态一致性 ----------
info('--- 阶段2：状态一致性 ---');
r = await req('GET', `/rewards/${child}`, token);
const rw = r.data || {};
const stats = rw.stats || {};
const badges = Array.isArray(rw.badges) ? rw.badges : [];
check('RW-1', '奖励接口 200 + 结构', r.status === 200 && rw && stats && Array.isArray(badges), r.status);
// 原子性：星星=2×正确数（并发也不会丢）
check('RW-2', `星星精确=${2 * correctCount}(无丢星)`, rw.stars === 2 * correctCount, { stars: rw.stars, expect: 2 * correctCount });
check('RW-3', `correct_count=${correctCount}`, stats.correct_count === correctCount, { got: stats.correct_count, expect: correctCount });
check('RW-4', `study_count=${studyCount}`, stats.study_count === studyCount, { got: stats.study_count, expect: studyCount });
check('RW-5', `char_mastered=${charIds.length}`, stats.char_mastered === charIds.length, stats.char_mastered);
check('RW-6', `english_mastered=${enCorrectIds.length}`, stats.english_mastered === enCorrectIds.length, stats.english_mastered);
check('RW-7', `math_correct=${mathIds.length}(题库上限)`, stats.math_correct === mathIds.length, stats.math_correct);
check('RW-8', `books_read=${bookIds.length}(绘本上限)`, stats.books_read === bookIds.length, stats.books_read);
check('RW-9', `chinese_mastered=${chineseIds.length}(中文阅读上限)`, stats.chinese_mastered === chineseIds.length, stats.chinese_mastered);
check('RW-10', 'review_mastered=20', stats.review_mastered === 20, stats.review_mastered);
check('RW-11', `study_minutes>=300(=${Math.round(durationSum / 60)})`, Math.round(durationSum / 60) >= 300, Math.round(durationSum / 60));

// 徽章数据驱动一致性：每枚徽章 unlocked === (stat>=requirement)
let badgeConsistent = true, inconsistent = [];
for (const b of badges) {
  const v = Number(stats[b.metric] ?? 0);
  const should = v >= Number(b.requirement);
  if (b.unlocked !== should) { badgeConsistent = false; inconsistent.push({ name: b.name, metric: b.metric, v, req: b.requirement, unlocked: b.unlocked, should }); }
}
check('BADGE-1', '每枚徽章 unlocked 与统计阈值严格一致', badgeConsistent, inconsistent.slice(0, 5));
// 时间相关徽章必须保持未解锁
const timeBadges = badges.filter(b => b.metric === 'streak' || b.metric === 'days_active');
check('BADGE-2', `时间相关徽章(${timeBadges.length}枚)全部未解锁`, timeBadges.every(b => !b.unlocked), timeBadges.map(b => b.name));
// 解锁总数按当前统计动态推导（容纳内容不足导致的不可达徽章）
const expectUnlocked = badges.filter(b => Number(stats[b.metric] ?? 0) >= Number(b.requirement)).length;
check('BADGE-3', `已解锁=${badges.filter(b => b.unlocked).length}（期望 ${expectUnlocked}）`, badges.filter(b => b.unlocked).length === expectUnlocked, { got: badges.filter(b => b.unlocked).length, expect: expectUnlocked });
// 上报：因内容不足而不可达的徽章（非时间相关）
const contentLimited = badges.filter(b => b.unlocked === false && b.metric !== 'streak' && b.metric !== 'days_active' && Number(stats[b.metric] ?? 0) < Number(b.requirement));
if (contentLimited.length) info('内容不足不可达徽章', contentLimited.map(b => `${b.name}(${b.metric}>=${b.requirement},实际${stats[b.metric] ?? 0})`).join(' / '));

// 其他维度读取
r = await req('GET', `/progress/${child}`, token);
check('PRG', '进度统计接口 200', r.status === 200, r.status);
r = await req('GET', `/progress/wrong/${child}`, token);
const wrongRows = Array.isArray(r.data) ? r.data : [];
check('WRONG', `错题本非空(=${wrongRows.length})`, r.status === 200 && wrongRows.length === enWrongIds.length, { got: wrongRows.length, expect: enWrongIds.length });
r = await req('GET', `/progress/ability/${child}`, token);
check('ABILITY', '能力雷达接口 200 + 维度', r.status === 200 && r.data && typeof r.data === 'object', r.status);
r = await req('GET', `/progress/review/${child}`, token);
const reviewRows = Array.isArray(r.data) ? r.data : [];
check('REVIEW', `今日复习队列含错题(=${reviewRows.length})`, r.status === 200 && reviewRows.length >= enWrongIds.length, { got: reviewRows.length });
// 断点续学：保存位置→读取应返回该位置
r = await req('PUT', '/learning', token, { child_id: child, module: 'characters', scope: '', position: 7 });
check('LRN-SAVE', '断点续学 保存位置 200', r.status === 200, r.status);
r = await req('GET', `/learning/${child}?module=characters&scope=`, token);
check('LRN-GET', '断点续学 读取位置=7', r.status === 200 && r.data && r.data.position === 7, r.data);

// ---------- 阶段3：高频重复操作冲击 ----------
info('--- 阶段3：高频并发冲击 ---');
let beforeStars = rw.stars, beforeCorrect = correctCount;
// 并发混合：60 次读 + 40 次写（复用已掌握项继续答对，模拟疯狂连点）
const reads = Array.from({ length: 60 }, (_, i) => {
  const p = [ `/rewards/${child}`, `/progress/${child}`, `/progress/review/${child}` ][i % 3];
  return req('GET', p, token);
});
const writes = Array.from({ length: 40 }, (_, i) => learn('characters', drillIds[i % drillIds.length], true, 0));
const writesRes = await Promise.all(writes);
const burst = await Promise.all(reads);
const fiveXX = [...writesRes, ...burst].filter(b => b.status >= 500).length;
check('HF-1', '高频冲击无 5xx', fiveXX === 0, { fiveXX });
check('HF-2', '高频写入全部 200', writesRes.every(w => w && w.status === 200), writesRes.filter(w => !(w && w.status === 200)).map(w => w && w.status));
// 冲击后状态仍精确
r = await req('GET', `/rewards/${child}`, token);
const rw2 = r.data || {};
check('HF-3', `冲击后星星精确=${2 * correctCount}(仍无丢星)`, rw2.stars === 2 * correctCount, { stars: rw2.stars, expect: 2 * correctCount });
check('HF-4', '冲击后徽章解锁数不变', (rw2.badges || []).filter(b => b.unlocked).length === expectUnlocked, (rw2.badges || []).filter(b => b.unlocked).length);

// ---------- 阶段4：最终一致性复核 + 隔离 ----------
info('--- 阶段4：最终复核 ---');
r = await req('GET', `/rewards/${child}`, token);
const rw3 = r.data || {};
let finalOk = rw3.stars === 2 * correctCount && rw3.stats.correct_count === correctCount && rw3.stats.study_count === studyCount;
check('FINAL-1', '最终星星/正确/学习数一致', finalOk, { stars: rw3.stars, cc: rw3.stats.correct_count, sc: rw3.stats.study_count });
// 跨用户隔离仍成立
const u2 = `life2_${suffix}`;
const t2 = (await req('POST', '/auth/register', null, { username: u2, password: '123456' })).data.token;
const cross = await req('GET', `/rewards/${child}`, t2);
check('ISOLATION', '其他用户读他人奖励=403', cross.status === 403, cross.status);

console.log(lines.join('\n'));
console.log(`\nTOTAL: ${lines.filter(l => l.startsWith('[PASS]')).length + failures} checks, ${failures} failed`);
process.exit(failures ? 1 : 0);
