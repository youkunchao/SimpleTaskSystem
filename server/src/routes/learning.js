import { Router } from 'express';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { nowLocal } from '../time.js';

const router = Router();
router.use(authMiddleware);

function verifyChild(childId, userId) {
  return db.prepare('SELECT id FROM children WHERE id = ? AND user_id = ?').get(childId, userId);
}

// 读取学习位置（断点续学）
router.get('/:child_id', (req, res) => {
  const { module, scope } = req.query;
  if (!verifyChild(req.params.child_id, req.userId)) {
    return res.status(403).json({ error: '无权操作' });
  }
  if (!module) {
    return res.status(400).json({ error: 'module 不能为空' });
  }
  const row = db.prepare('SELECT position FROM learning_state WHERE child_id = ? AND module = ? AND scope = ?')
    .get(req.params.child_id, String(module), String(scope || ''));
  res.json({ position: row ? row.position : 0 });
});

// 保存学习位置
router.put('/', (req, res) => {
  const { child_id, module, scope, position } = req.body;
  if (!child_id || !module || typeof position !== 'number') {
    return res.status(400).json({ error: 'child_id、module、position 不能为空' });
  }
  if (!verifyChild(child_id, req.userId)) {
    return res.status(403).json({ error: '无权操作' });
  }
  db.prepare(`
    INSERT INTO learning_state (child_id, module, scope, position, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(child_id, module, scope)
    DO UPDATE SET position = excluded.position, updated_at = excluded.updated_at
  `).run(child_id, String(module), String(scope || ''), Math.max(0, position), nowLocal());
  res.json({ success: true });
});

// 重新从第一个开始
router.delete('/', (req, res) => {
  const { child_id, module, scope } = req.body;
  if (!child_id || !module) {
    return res.status(400).json({ error: 'child_id、module 不能为空' });
  }
  if (!verifyChild(child_id, req.userId)) {
    return res.status(403).json({ error: '无权操作' });
  }
  db.prepare('UPDATE learning_state SET position = 0, updated_at = ? WHERE child_id = ? AND module = ? AND scope = ?')
    .run(nowLocal(), child_id, String(module), String(scope || ''));
  res.json({ success: true });
});

export default router;
