import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function verifyChild(childId, userId) {
  return db.prepare('SELECT * FROM children WHERE id = ? AND user_id = ?').get(childId, userId);
}

// 获取孩子奖励信息
router.get('/:child_id', (req, res) => {
  const child = verifyChild(req.params.child_id, req.userId);
  if (!child) return res.status(403).json({ error: '无权操作' });

  const reward = db.prepare('SELECT * FROM rewards WHERE child_id = ?').get(req.params.child_id) || { stars: 0, streak: 0 };

  // 计算已解锁徽章
  const allBadges = db.prepare('SELECT * FROM badges').all();
  const unlocked = db.prepare('SELECT badge_id FROM child_badges WHERE child_id = ?').all(req.params.child_id).map(r => r.badge_id);

  // 统计学习次数、汉字掌握数
  const studyCount = db.prepare('SELECT COUNT(*) as c FROM progress WHERE child_id = ?').get(req.params.child_id).c;
  const charMastered = db.prepare(`
    SELECT COUNT(DISTINCT item_id) as c FROM progress
    WHERE child_id = ? AND module = 'characters' AND correct = 1
  `).get(req.params.child_id).c;

  const badges = allBadges.map(b => {
    let isUnlocked = unlocked.includes(b.id);
    // 自动解锁判断
    if (!isUnlocked) {
      let achieved = false;
      if (b.name.includes('初学') && studyCount >= 1) achieved = true;
      if (b.name.includes('勤学') && studyCount >= 10) achieved = true;
      if (b.name.includes('博学') && studyCount >= 50) achieved = true;
      if (b.name.includes('星星') && reward.stars >= 50) achieved = true;
      if (b.name.includes('坚持') && reward.streak >= 7) achieved = true;
      if (b.name.includes('识字') && charMastered >= 20) achieved = true;
      if (achieved) {
        db.prepare('INSERT OR IGNORE INTO child_badges (child_id, badge_id) VALUES (?, ?)').run(req.params.child_id, b.id);
        isUnlocked = true;
      }
    }
    return { ...b, unlocked: isUnlocked };
  });

  res.json({
    stars: reward.stars || 0,
    streak: reward.streak || 0,
    badges,
    studyCount,
    charMastered,
  });
});

export default router;
