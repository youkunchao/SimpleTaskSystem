import express from 'express';
import cors from 'cors';
import './db.js';
import authRoutes from './routes/auth.js';
import childrenRoutes from './routes/children.js';
import coursesRoutes from './routes/courses.js';
import progressRoutes from './routes/progress.js';
import rewardsRoutes from './routes/rewards.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/rewards', rewardsRoutes);

app.listen(PORT, () => {
  console.log(`🚀 启蒙星后端已启动: http://localhost:${PORT}`);
});
