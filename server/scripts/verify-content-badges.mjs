// 验证此前「内容不足不可达」的 4 枚徽章，现在通过真实扩充内容可点亮。
// 数学小天才(100) / 绘本小书虫(5) / 故事大王(12) / 阅读小达人(10)
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const BASE = process.env.SMOKE_BASE || 'http://localhost:3001/api';
const db = new Database('data/kidstar.db');

let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}`, JSON.stringify(extra || {})); }
};

const req = async (method, path, token, body) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
};

const suffix = randomUUID().slice(0, 8);
const reg = await req('POST', '/auth/register', null, { username: `vb_${suffix}`, password: '123456' });
const token = reg.data.token;
check('注册并登录', !!token, { status: reg.status });

const childRes = await req('POST', '/children', token, { name: '徽章验证娃', age: 5, avatar: '🧪' });
const child = childRes.data;
check('创建孩子', !!child.id, { id: child.id });

// 取真实内容 id（来自扩充后的库）
const quizIds = db.prepare('SELECT id FROM math_quiz').all().map(r => r.id);
const bookIds = db.prepare('SELECT id FROM picture_books').all().map(r => r.id);
const readingIds = db.prepare('SELECT id FROM chinese_readings').all().map(r => r.id);
console.log(`  内容量: 数学测验 ${quizIds.length} / 绘本 ${bookIds.length} / 中文阅读 ${readingIds.length}`);

// 1) 数学：答对 100 次（循环使用真实测验 id，贴近真实累加）
for (let i = 0; i < 100; i++) {
  const id = quizIds[i % quizIds.length];
  await req('POST', '/progress', token, { child_id: child.id, module: 'math', item_id: id, correct: true, duration: 2 });
}
// 2) 绘本：读完所有书（13 本，覆盖 5 与 12 阈值）
for (const id of bookIds) {
  await req('POST', '/progress', token, { child_id: child.id, module: 'books', item_id: id, correct: true, duration: 5 });
}
// 3) 中文阅读：完成所有篇（13 篇，覆盖 10 阈值）
for (const id of readingIds) {
  await req('POST', '/progress', token, { child_id: child.id, module: 'chinese-reading', item_id: id, correct: true, duration: 5 });
}

const rw = await req('GET', `/rewards/${child.id}`, token);
const badges = rw.data.badges || [];
const getBadge = (name) => badges.find(b => b.name === name);
const isUnlocked = (name) => { const b = getBadge(name); return b && b.unlocked; };
const statOf = (metric) => (rw.data.stats || {})[metric];

console.log('  stats:', JSON.stringify(rw.data.stats));
check('数学小天才(100) 已点亮', isUnlocked('数学小天才'), { math_correct: statOf('math_correct') });
check('绘本小书虫(5) 已点亮', isUnlocked('绘本小书虫'), { books_read: statOf('books_read') });
check('故事大王(12) 已点亮', isUnlocked('故事大王'), { books_read: statOf('books_read') });
check('阅读小达人(10) 已点亮', isUnlocked('阅读小达人'), { chinese_mastered: statOf('chinese_mastered') });

// 清理：删除验证孩子（连同进度级联），避免污染测试库
await req('DELETE', `/children/${child.id}`, token);

db.close();
console.log(`\nTOTAL ${pass + fail} | PASS ${pass} | FAIL ${fail}`);
process.exit(fail ? 1 : 0);
