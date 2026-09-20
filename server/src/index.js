import express from 'express';
import cors from 'cors';
import './db.js';
import authRoutes from './routes/auth.js';
import childrenRoutes from './routes/children.js';
import coursesRoutes from './routes/courses.js';
import progressRoutes from './routes/progress.js';
import rewardsRoutes from './routes/rewards.js';
import learningRoutes from './routes/learning.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 只允许前端来源访问，避免接口被任意站点调用
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173,http://localhost:3000')
  .split(',').map(s => s.trim()).filter(Boolean);

// 来源校验：非法来源直接拒绝，避免接口被任意站点调用
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: '来源不被允许' });
  }
  next();
});
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/learning', learningRoutes);

// 未匹配的 API 返回 JSON 404，而不是默认的 HTML
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));

// 统一错误处理：任何未捕获异常都返回 JSON，避免前端拿到 HTML 后白屏
app.use((err, req, res, next) => {
  console.error('[未处理异常]', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🚀 启蒙星后端已启动: http://localhost:${PORT}`);
});
