import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { nowLocal } from '../time.js';

const router = Router();
router.use(authMiddleware);

function verifyChild(childId, userId) {
  return db.prepare('SELECT * FROM children WHERE id = ? AND user_id = ?').get(childId, userId);
}

// 获取孩子奖励信息
// 徽章解锁改为「数据驱动」：badges.metric 对应下面 stats 的 key，
// 只要该指标达到 requirement 就自动点亮，以后新增徽章只加数据、不用改代码。
router.get('/:child_id', (req, res) => {
  const child = verifyChild(req.params.child_id, req.userId);
  if (!child) return res.status(403).json({ error: '无权操作' });

  const childId = req.params.child_id;
  const reward = db.prepare('SELECT * FROM rewards WHERE child_id = ?').get(childId) || { stars: 0, streak: 0 };
  const scalar = (sql) => Number(db.prepare(sql).get(childId).c || 0);

  // 各维度实时统计：每枚徽章都能在前端显示"当前/目标、还差多少"
  const stats = {
    study_count: scalar('SELECT COUNT(*) as c FROM progress WHERE child_id = ?'),
    correct_count: scalar('SELECT COUNT(*) as c FROM progress WHERE child_id = ? AND correct = 1'),
    stars: Number(reward.stars || 0),
    streak: Number(reward.streak || 0),
    char_mastered: scalar("SELECT COUNT(DISTINCT item_id) as c FROM progress WHERE child_id = ? AND module = 'characters' AND correct = 1"),
    english_mastered: scalar("SELECT COUNT(DISTINCT item_id) as c FROM progress WHERE child_id = ? AND module = 'english' AND correct = 1"),
    math_correct: scalar("SELECT COUNT(*) as c FROM progress WHERE child_id = ? AND module = 'math' AND correct = 1"),
    books_read: scalar("SELECT COUNT(DISTINCT item_id) as c FROM progress WHERE child_id = ? AND module = 'books'"),
    chinese_mastered: scalar("SELECT COUNT(DISTINCT item_id) as c FROM progress WHERE child_id = ? AND module = 'chinese-reading' AND correct = 1"),
    review_mastered: scalar('SELECT COUNT(*) as c FROM review_items WHERE child_id = ? AND interval_level >= 4'),
    days_active: scalar("SELECT COUNT(DISTINCT date(created_at)) as c FROM progress WHERE child_id = ?"),
    study_minutes: Math.round(scalar('SELECT COALESCE(SUM(duration), 0) as c FROM progress WHERE child_id = ?') / 60),
  };

  const allBadges = db.prepare('SELECT * FROM badges ORDER BY sort, id').all();
  const unlockedIds = new Set(
    db.prepare('SELECT badge_id FROM child_badges WHERE child_id = ?').all(childId).map(r => r.badge_id)
  );
  const grantBadge = db.prepare('INSERT OR IGNORE INTO child_badges (child_id, badge_id, unlocked_at) VALUES (?, ?, ?)');

  const badges = allBadges.map(b => {
    let isUnlocked = unlockedIds.has(b.id);
    if (!isUnlocked && b.metric && Number(stats[b.metric] ?? 0) >= Number(b.requirement || 0)) {
      grantBadge.run(childId, b.id, nowLocal());
      isUnlocked = true;
    }
    return { ...b, unlocked: isUnlocked };
  });

  res.json({
    stars: stats.stars,
    streak: stats.streak,
    badges,
    stats,
    studyCount: stats.study_count,
    charMastered: stats.char_mastered,
  });
});

export default router;
