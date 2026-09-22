import jwt from 'jsonwebtoken';
// 密钥统一由 config.js 解析并在启动期校验：
//  - 生产环境缺失 JWT_SECRET → 直接拒绝启动（不再有任何内置默认密钥）
//  - 开发环境 → 使用本机持久化的随机密钥，而不是源码里的固定常量
import { JWT_SECRET } from '../config.js';

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期' });
  }
}
