import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// 注意 import 顺序即求值顺序：先做安全配置校验，再初始化数据库，
// 保证"生产配置不合规"时立刻失败，而不是跑完耗时的数据初始化才报错。
import { assertProductionConfig } from './config.js';
import './db.js';

// 启动期安全校验：生产环境缺少必要配置直接终止，避免"带着不安全的默认值上线"
assertProductionConfig();
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

// 本机开发时 dev 端口可能被占用而顺延（如 5174/5175），统一放行 localhost / 127.0.0.1 的任意端口
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/;
const isAllowedOrigin = (origin) => !origin || allowedOrigins.includes(origin) || LOCAL_ORIGIN.test(origin);

// 来源校验：非法来源直接拒绝，避免接口被任意站点调用
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: '来源不被允许' });
  }
  next();
});
app.use(cors({ origin: (origin, cb) => cb(null, isAllowedOrigin(origin)) }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/learning', learningRoutes);

// 预合成音频服务：返回离线 MP3（由 python edge-tts 预先批量生成，落盘在 tts-audio/）。
// 前端按 key（lang|role|text）取音频；未预生成的文本（动态内容/绘本/跟读）返回 404，
// 前端即可自动回退 Web Speech，绝不影响使用。
const ttsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tts-audio');
app.post('/api/tts', (req, res) => {
  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const lang = body.lang || 'zh-CN';
  const role = body.role || 'teach';
  if (!text) return res.status(400).json({ error: 'text required' });
  const key = `${lang}|${role}|${text}`;
  let manifest = {};
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(ttsDir, 'manifest.json'), 'utf8'));
  } catch {
    manifest = {};
  }
  const file = manifest[key];
  if (!file) return res.status(404).json({ error: 'no prebuilt audio' });
  const fp = path.join(ttsDir, file);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'audio missing' });
  res.set('Content-Type', 'audio/mpeg');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(fs.readFileSync(fp));
});

// 未匹配的 API 返回 JSON 404，而不是默认的 HTML
app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));

// —— 生产环境托管前端静态产物（单服务器部署：API + 页面同源，免 CORS、免额外静态服务）——
const clientDist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false }));
  // SPA 回退：非 /api 的 GET 请求都返回 index.html（刷新/深链不会 404）
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      const indexPath = path.join(clientDist, 'index.html');
      if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    }
    next();
  });
}

// 统一错误处理：任何未捕获异常都返回 JSON，避免前端拿到 HTML 后白屏
app.use((err, req, res, next) => {
  // 请求体超限 / 格式错误属于"客户端错误"，不能一律报成 500
  // （否则看起来像服务器故障，也便于调用方区分处理方式）
  if (err?.status === 413 || err?.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求内容过大' });
  }
  if (err?.status === 400 && err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '请求格式错误' });
  }
  console.error('[未处理异常]', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🚀 启蒙星后端已启动: http://localhost:${PORT}`);
});
