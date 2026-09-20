import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { nowLocal, todayLocal, addDaysLocal } from '../time.js';

const router = Router();
router.use(authMiddleware);

// 艾宾浩斯五级记忆（天）：陌生/初识/熟悉/熟练/精通
const INTERVALS = [1, 2, 4, 7, 15];
const MEMORY_LEVELS = ['陌生', '初识', '熟悉', '熟练', '精通'];

// 验证孩子归属
function verifyChild(childId, userId) {
  return db.prepare('SELECT * FROM children WHERE id = ? AND user_id = ?').get(childId, userId);
}

// 复习项对应的内容表，用于附带详情
const DETAIL_MAP = {
  characters: { table: 'characters', cols: 'hanzi, pinyin, emoji, meaning' },
  english: { table: 'words', cols: 'english, chinese, emoji' },
  math: { table: 'math_problems', cols: 'question, options' },
  grammar: { table: 'grammar_problems', cols: 'question, options, explanation' },
  listening: { table: 'listening_materials', cols: 'title, content, question' },
  reading: { table: 'reading_materials', cols: 'title, passage, question' },
  'chinese-reading': { table: 'chinese_readings', cols: 'title, content, question' },
  books: { table: 'picture_books', cols: 'title, cover' },
};

function fetchDetail(module, itemId) {
  const conf = DETAIL_MAP[module];
  if (!conf) return null;
  try {
    return db.prepare(`SELECT ${conf.cols} FROM ${conf.table} WHERE id = ?`).get(itemId) || null;
  } catch {
    return null;
  }
}

// 记录错题
function recordWrongQuestion(childId, module, itemId, question, userAnswer, correctAnswer, explanation) {
  const existing = db.prepare('SELECT * FROM wrong_questions WHERE child_id = ? AND module = ? AND item_id = ?')
    .get(childId, module, itemId);
  if (existing) {
    db.prepare('UPDATE wrong_questions SET wrong_count = wrong_count + 1, last_wrong_at = ?, user_answer = ?, mastered = 0 WHERE id = ?')
      .run(nowLocal(), userAnswer, existing.id);
  } else {
    db.prepare('INSERT INTO wrong_questions (child_id, module, item_id, question, user_answer, correct_answer, explanation, created_at, last_wrong_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(childId, module, itemId, question, userAnswer, correctAnswer, explanation || '', nowLocal(), nowLocal());
  }
}

// 标记错题已掌握
function markWrongMastered(childId, module, itemId) {
  db.prepare('UPDATE wrong_questions SET mastered = 1 WHERE child_id = ? AND module = ? AND item_id = ?')
    .run(childId, module, itemId);
}

// 记录学习进度
router.post('/', (req, res) => {
  const { child_id, module, item_id, correct, duration, question, user_answer, correct_answer, explanation } = req.body;
  // 显式校验参数：缺失时返回 400，而不是流到 SQL 绑定阶段变成 500
  if (!child_id || !module || item_id === undefined || item_id === null) {
    return res.status(400).json({ error: 'child_id、module、item_id 不能为空' });
  }
  if (!verifyChild(child_id, req.userId)) {
    return res.status(403).json({ error: '无权操作' });
  }
  db.prepare('INSERT INTO progress (child_id, module, item_id, correct, duration, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(child_id, module, item_id, correct ? 1 : 0, duration || 0, nowLocal());

  // 更新或创建复习项（五级记忆）
  const existing = db.prepare('SELECT * FROM review_items WHERE child_id = ? AND module = ? AND item_id = ?')
    .get(child_id, module, item_id);

  const now = nowLocal();
  if (existing) {
    let newLevel = existing.interval_level;
    if (correct) {
      newLevel = Math.min(existing.interval_level + 1, INTERVALS.length - 1);
      // 答对则标记对应错题已掌握
      markWrongMastered(child_id, module, item_id);
    } else {
      newLevel = 0; // 答错重置为陌生
      recordWrongQuestion(child_id, module, item_id, question || '', user_answer || '', correct_answer || '', explanation || '');
    }
    // 答错立刻回到复习队列（趁热打铁），答对才按间隔递增
    const nextReview = correct ? addDaysLocal(INTERVALS[newLevel]) : now;
    db.prepare('UPDATE review_items SET interval_level = ?, next_review = ?, last_review = ? WHERE id = ?')
      .run(newLevel, nextReview, now, existing.id);
  } else {
    const nextReview = correct ? addDaysLocal(INTERVALS[0]) : now;
    db.prepare('INSERT INTO review_items (child_id, module, item_id, interval_level, next_review, last_review) VALUES (?, ?, ?, 0, ?, ?)')
      .run(child_id, module, item_id, nextReview, now);
    if (!correct) {
      recordWrongQuestion(child_id, module, item_id, question || '', user_answer || '', correct_answer || '', explanation || '');
    }
  }

  // 更新星星和连续打卡
  const reward = db.prepare('SELECT * FROM rewards WHERE child_id = ?').get(child_id);
  if (reward) {
    // 只有答对才奖励星星，避免孩子乱点也能攒星星
    const newStars = reward.stars + (correct ? 2 : 0);
    const todayStr = todayLocal();
    const lastDate = reward.last_study_date ? String(reward.last_study_date).slice(0, 10) : null;
    let newStreak = reward.streak;
    if (lastDate !== todayStr) {
      if (lastDate) {
        // 以本地日期零点做差，避免 UTC 解析造成的天数偏移
        const last = new Date(`${lastDate}T00:00:00`);
        const today0 = new Date(`${todayStr}T00:00:00`);
        const diff = Math.round((today0 - last) / (24 * 60 * 60 * 1000));
        newStreak = diff === 1 ? reward.streak + 1 : 1;
      } else {
        newStreak = 1;
      }
      db.prepare('UPDATE rewards SET stars = ?, streak = ?, last_study_date = ? WHERE child_id = ?')
        .run(newStars, newStreak, todayStr, child_id);
    } else {
      db.prepare('UPDATE rewards SET stars = ? WHERE child_id = ?').run(newStars, child_id);
    }
  }

  res.json({ success: true, memory_level: correct ? (existing ? Math.min(existing.interval_level + 1, 4) : 0) : 0 });
});

// 今日待复习
router.get('/review/:child_id', (req, res) => {
  const child = verifyChild(req.params.child_id, req.userId);
  if (!child) return res.status(403).json({ error: '无权操作' });

  const now = nowLocal();
  const items = db.prepare(`
    SELECT * FROM review_items WHERE child_id = ? AND next_review <= ? ORDER BY next_review ASC
  `).all(req.params.child_id, now);

  // 附带内容详情；内容已被删除的孤儿复习项不再下发，避免前端渲染出错
  const result = items
    .map(item => ({ ...item, memory_label: MEMORY_LEVELS[item.interval_level] || '陌生', detail: fetchDetail(item.module, item.item_id) }))
    .filter(item => item.detail !== null);

  res.json(result);
});

// 错题本
router.get('/wrong/:child_id', (req, res) => {
  const child = verifyChild(req.params.child_id, req.userId);
  if (!child) return res.status(403).json({ error: '无权操作' });

  // module 支持逗号分隔多个值，例如 english,grammar,listening,reading
  const modules = req.query.module
    ? String(req.query.module).split(',').map(s => s.trim()).filter(Boolean)
    : [];
  let rows;
  if (modules.length) {
    const placeholders = modules.map(() => '?').join(',');
    rows = db.prepare(`
      SELECT * FROM wrong_questions
      WHERE child_id = ? AND module IN (${placeholders}) AND mastered = 0
      ORDER BY wrong_count DESC, last_wrong_at DESC
    `).all(req.params.child_id, ...modules);
  } else {
    rows = db.prepare('SELECT * FROM wrong_questions WHERE child_id = ? AND mastered = 0 ORDER BY wrong_count DESC, last_wrong_at DESC')
      .all(req.params.child_id);
  }
  res.json(rows);
});

// 获取进度统计（注意：此路由须放在 /review 和 /wrong 之后，避免参数冲突）
router.get('/:child_id', (req, res) => {
  const child = verifyChild(req.params.child_id, req.userId);
  if (!child) return res.status(403).json({ error: '无权操作' });

  const total = db.prepare('SELECT COUNT(*) as c, SUM(correct) as correct, SUM(duration) as duration FROM progress WHERE child_id = ?')
    .get(req.params.child_id);
  const byModule = db.prepare(`
    SELECT module, COUNT(*) as count, SUM(correct) as correct, SUM(duration) as duration
    FROM progress WHERE child_id = ? GROUP BY module
  `).all(req.params.child_id);
  const byDay = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count, SUM(correct) as correct
    FROM progress WHERE child_id = ? GROUP BY date(created_at) ORDER BY day DESC LIMIT 14
  `).all(req.params.child_id);

  // 错题统计
  const wrongStats = db.prepare(`
    SELECT module, COUNT(*) as count FROM wrong_questions
    WHERE child_id = ? AND mastered = 0 GROUP BY module
  `).all(req.params.child_id);

  // 五级记忆分布
  const memoryDist = db.prepare(`
    SELECT interval_level, COUNT(*) as count FROM review_items
    WHERE child_id = ? GROUP BY interval_level
  `).all(req.params.child_id);
  const memoryDistribution = MEMORY_LEVELS.map((label, i) => ({
    level: i,
    label,
    count: memoryDist.find(d => d.interval_level === i)?.count || 0,
  }));

  res.json({
    total: {
      count: total.c || 0,
      correct: total.correct || 0,
      accuracy: total.c ? Math.round((total.correct / total.c) * 100) : 0,
      duration: total.duration || 0,
    },
    byModule,
    byDay,
    wrongStats,
    memoryDistribution,
  });
});

export default router;
