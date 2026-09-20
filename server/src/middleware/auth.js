import jwt from 'jsonwebtoken';

// 密钥解析：生产环境必须显式配置 JWT_SECRET，
// 否则任何人都能用源码里的默认值伪造 token，直接越权访问所有用户数据。
function resolveSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
  }
  console.warn('⚠️  未设置 JWT_SECRET，当前使用开发用密钥，切勿用于生产环境');
  return 'kidstar-dev-only-secret';
}

const JWT_SECRET = resolveSecret();

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
