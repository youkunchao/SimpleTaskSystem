import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// 艾宾浩斯五级记忆（天）：陌生/初识/熟悉/熟练/精通
const INTERVALS = [1, 2, 4, 7, 15];
const MEMORY_LEVELS = ['陌生', '初识', '熟悉', '熟练', '精通'];

// 验证孩子归属
function verifyChild(childId, userId) {
  return db.prepare('SELECT * FROM children WHERE id = ? AND user_id = ?').get(childId, userId);
}

// 记录错题
function recordWrongQuestion(childId, module, itemId, question, userAnswer, correctAnswer, explanation) {
  const existing = db.prepare('SELECT * FROM wrong_questions WHERE child_id = ? AND module = ? AND item_id = ?')
    .get(childId, module, itemId);
  if (existing) {
    db.prepare('UPDATE wrong_questions SET wrong_count = wrong_count + 1, last_wrong_at = datetime(\'now\'), user_answer = ?, mastered = 0 WHERE id = ?')
      .run(userAnswer, existing.id);
  } else {
    db.prepare('INSERT INTO wrong_questions (child_id, module, item_id, question, user_answer, correct_answer, explanation) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(childId, module, itemId, question, userAnswer, correctAnswer, explanation || '');
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
  if (!verifyChild(child_id, req.userId)) {
    return res.status(403).json({ error: '无权操作' });
  }
  db.prepare('INSERT INTO progress (child_id, module, item_id, correct, duration) VALUES (?, ?, ?, ?, ?)')
    .run(child_id, module, item_id, correct ? 1 : 0, duration || 0);

  // 更新或创建复习项（五级记忆）
  const existing = db.prepare('SELECT * FROM review_items WHERE child_id = ? AND module = ? AND item_id = ?')
    .get(child_id, module, item_id);

  const today = new Date();
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
    const days = INTERVALS[newLevel];
    const next = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    db.prepare('UPDATE review_items SET interval_level = ?, next_review = ?, last_review = datetime(\'now\') WHERE id = ?')
      .run(newLevel, next.toISOString(), existing.id);
  } else {
    const next = new Date(today.getTime() + INTERVALS[0] * 24 * 60 * 60 * 1000);
    db.prepare('INSERT INTO review_items (child_id, module, item_id, interval_level, next_review, last_review) VALUES (?, ?, ?, 0, ?, datetime(\'now\'))')
      .run(child_id, module, item_id, next.toISOString());
    if (!correct) {
      recordWrongQuestion(child_id, module, item_id, question || '', user_answer || '', correct_answer || '', explanation || '');
    }
  }

  // 更新星星和连续打卡
  const reward = db.prepare('SELECT * FROM rewards WHERE child_id = ?').get(child_id);
  if (reward) {
    const newStars = reward.stars + (correct ? 2 : 1);
    const todayStr = today.toISOString().slice(0, 10);
    const lastDate = reward.last_study_date ? reward.last_study_date.slice(0, 10) : null;
    let newStreak = reward.streak;
    if (lastDate !== todayStr) {
      if (lastDate) {
        const last = new Date(lastDate);
        const diff = Math.round((today - last) / (24 * 60 * 60 * 1000));
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

  const now = new Date().toISOString();
  const items = db.prepare(`
    SELECT * FROM review_items WHERE child_id = ? AND next_review <= ? ORDER BY next_review ASC
  `).all(req.params.child_id, now);

  // 附带内容详情
  const result = items.map(item => {
    let detail = null;
    if (item.module === 'characters') {
      detail = db.prepare('SELECT hanzi, pinyin, emoji FROM characters WHERE id = ?').get(item.item_id);
    } else if (item.module === 'english') {
      detail = db.prepare('SELECT english, chinese, emoji FROM words WHERE id = ?').get(item.item_id);
    } else if (item.module === 'grammar') {
      detail = db.prepare('SELECT question FROM grammar_problems WHERE id = ?').get(item.item_id);
    }
    return { ...item, memory_label: MEMORY_LEVELS[item.interval_level] || '陌生', detail };
  });

  res.json(result);
});

// 错题本
router.get('/wrong/:child_id', (req, res) => {
  const child = verifyChild(req.params.child_id, req.userId);
  if (!child) return res.status(403).json({ error: '无权操作' });

  const module = req.query.module;
  let rows;
  if (module) {
    rows = db.prepare('SELECT * FROM wrong_questions WHERE child_id = ? AND module = ? AND mastered = 0 ORDER BY wrong_count DESC, last_wrong_at DESC')
      .all(req.params.child_id, module);
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
