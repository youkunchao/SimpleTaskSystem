import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// 艾宾浩斯间隔（天）
const INTERVALS = [1, 2, 4, 7, 15];

// 验证孩子归属
function verifyChild(childId, userId) {
  return db.prepare('SELECT * FROM children WHERE id = ? AND user_id = ?').get(childId, userId);
}

// 记录学习进度
router.post('/', (req, res) => {
  const { child_id, module, item_id, correct, duration } = req.body;
  if (!verifyChild(child_id, req.userId)) {
    return res.status(403).json({ error: '无权操作' });
  }
  db.prepare('INSERT INTO progress (child_id, module, item_id, correct, duration) VALUES (?, ?, ?, ?, ?)')
    .run(child_id, module, item_id, correct ? 1 : 0, duration || 0);

  // 更新或创建复习项
  const existing = db.prepare('SELECT * FROM review_items WHERE child_id = ? AND module = ? AND item_id = ?')
    .get(child_id, module, item_id);

  const today = new Date();
  if (existing) {
    let newLevel = existing.interval_level;
    if (correct) {
      newLevel = Math.min(existing.interval_level + 1, INTERVALS.length - 1);
    } else {
      newLevel = 0;
    }
    const days = INTERVALS[newLevel];
    const next = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    db.prepare('UPDATE review_items SET interval_level = ?, next_review = ?, last_review = datetime(\'now\') WHERE id = ?')
      .run(newLevel, next.toISOString(), existing.id);
  } else {
    const next = new Date(today.getTime() + INTERVALS[0] * 24 * 60 * 60 * 1000);
    db.prepare('INSERT INTO review_items (child_id, module, item_id, interval_level, next_review, last_review) VALUES (?, ?, ?, 0, ?, datetime(\'now\'))')
      .run(child_id, module, item_id, next.toISOString());
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

  res.json({ success: true });
});

// 获取进度统计
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

  res.json({
    total: {
      count: total.c || 0,
      correct: total.correct || 0,
      accuracy: total.c ? Math.round((total.correct / total.c) * 100) : 0,
      duration: total.duration || 0,
    },
    byModule,
    byDay,
  });
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
    }
    return { ...item, detail };
  });

  res.json(result);
});

export default router;
