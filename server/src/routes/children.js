import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { nowLocal } from '../time.js';

const router = Router();
router.use(authMiddleware);

// 获取当前家长的孩子列表
router.get('/', (req, res) => {
  const children = db.prepare('SELECT * FROM children WHERE user_id = ?').all(req.userId);
  res.json(children);
});

// 创建孩子
router.post('/', (req, res) => {
  const { name, age, avatar } = req.body;
  if (!name || !age) {
    return res.status(400).json({ error: '姓名和年龄必填' });
  }
  const result = db.prepare('INSERT INTO children (user_id, name, age, avatar, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(req.userId, name, age, avatar || '🦊', nowLocal());
  // 初始化奖励记录
  db.prepare('INSERT INTO rewards (child_id, stars, streak) VALUES (?, 0, 0)').run(result.lastInsertRowid);
  const child = db.prepare('SELECT * FROM children WHERE id = ?').get(result.lastInsertRowid);
  res.json(child);
});

// 删除孩子
router.delete('/:id', (req, res) => {
  const child = db.prepare('SELECT * FROM children WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!child) return res.status(404).json({ error: '孩子不存在' });
  db.prepare('DELETE FROM children WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
