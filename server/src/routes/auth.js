import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { nowLocal } from '../time.js';

const router = Router();

// 后端必须独立校验账号规则：前端的校验可以被绕过（直接调接口就能注册弱密码账号）
const USERNAME_MAX = 32;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 128;

router.post('/register', (req, res) => {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  if (username.length > USERNAME_MAX) {
    return res.status(400).json({ error: `用户名最长 ${USERNAME_MAX} 个字符` });
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return res.status(400).json({ error: `密码长度需为 ${PASSWORD_MIN}-${PASSWORD_MAX} 位` });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)').run(username, hash, nowLocal());
  const user = db.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.json({ user, token: generateToken(user.id) });
});

// 登录限流：同一 IP 每分钟最多 10 次，防止密码暴力破解
router.post('/login', rateLimit({ windowMs: 60 * 1000, max: 10 }), (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  const safe = { id: user.id, username: user.username, created_at: user.created_at };
  res.json({ user: safe, token: generateToken(user.id) });
});

export default router;
