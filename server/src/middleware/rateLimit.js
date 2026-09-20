// 简易内存限流：按 IP 统计单位时间内的请求次数
// 用于登录/注册等接口，防止密码暴力破解（单机部署足够，多实例需换成 Redis）

const buckets = new Map();

export function rateLimit({ windowMs = 60 * 1000, max = 10 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();

    // 避免 buckets 无限增长
    if (buckets.size > 1000) {
      for (const [k, v] of buckets) {
        if (now > v.resetAt) buckets.delete(k);
      }
    }

    const bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (bucket.count >= max) {
      return res.status(429).json({ error: '操作过于频繁，请稍后再试' });
    }
    bucket.count += 1;
    next();
  };
}
