import { Router } from 'express';
import db from '../db.js';

const router = Router();

// 课程总览
router.get('/', (req, res) => {
  res.json({
    modules: [
      { id: 'characters', name: '汉字认知', icon: '✍️', desc: '看图识字，快乐学汉字', levels: 4 },
      { id: 'english', name: '英语启蒙', icon: '🔤', desc: '趣味单词，开口说英语', levels: 5 },
      { id: 'math', name: '数学思维', icon: '🔢', desc: '边玩边学，培养数感', levels: 3 },
      { id: 'books', name: '绘本点读', icon: '📚', desc: '点读绘本，爱上阅读', levels: 2 },
    ],
  });
});

// 汉字
router.get('/characters', (req, res) => {
  const level = req.query.level;
  let rows;
  if (level) {
    rows = db.prepare('SELECT * FROM characters WHERE level = ?').all(level);
  } else {
    rows = db.prepare('SELECT * FROM characters ORDER BY level, id').all();
  }
  res.json(rows);
});

// 英语单词
router.get('/words', (req, res) => {
  const category = req.query.category;
  let rows;
  if (category) {
    rows = db.prepare('SELECT * FROM words WHERE category = ?').all(category);
  } else {
    rows = db.prepare('SELECT * FROM words ORDER BY category, id').all();
  }
  res.json(rows);
});

// 数学题
router.get('/math', (req, res) => {
  const type = req.query.type;
  let rows;
  if (type) {
    rows = db.prepare('SELECT * FROM math_problems WHERE type = ?').all(type);
  } else {
    rows = db.prepare('SELECT * FROM math_problems').all();
  }
  res.json(rows);
});

// 绘本
router.get('/books', (req, res) => {
  const rows = db.prepare('SELECT id, title, level, cover FROM picture_books').all();
  res.json(rows);
});

router.get('/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM picture_books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: '绘本不存在' });
  book.pages = JSON.parse(book.pages);
  res.json(book);
});

// 英语语法题
router.get('/grammar', (req, res) => {
  const type = req.query.type;
  let rows;
  if (type) {
    rows = db.prepare('SELECT * FROM grammar_problems WHERE type = ?').all(type);
  } else {
    rows = db.prepare('SELECT * FROM grammar_problems').all();
  }
  res.json(rows);
});

// 英语听力
router.get('/listening', (req, res) => {
  const category = req.query.category;
  let rows;
  if (category) {
    rows = db.prepare('SELECT * FROM listening_materials WHERE category = ?').all(category);
  } else {
    rows = db.prepare('SELECT * FROM listening_materials').all();
  }
  res.json(rows);
});

// 英语阅读
router.get('/reading', (req, res) => {
  const category = req.query.category;
  let rows;
  if (category) {
    rows = db.prepare('SELECT * FROM reading_materials WHERE category = ?').all(category);
  } else {
    rows = db.prepare('SELECT * FROM reading_materials').all();
  }
  res.json(rows);
});

// 中文阅读
router.get('/chinese-reading', (req, res) => {
  const rows = db.prepare('SELECT * FROM chinese_readings').all();
  res.json(rows);
});

export default router;
