import { Router } from 'express';
import db from '../db.js';
import { AGE_GROUPS } from '../data/english.generated.js';
import { STAGES as MATH_STAGES } from '../data/math.generated.js';

const router = Router();

// 课程总览
router.get('/', (req, res) => {
  res.json({
    modules: [
      { id: 'characters', name: '汉字认知', icon: 'pen', desc: '看图识字，快乐学汉字', levels: 4 },
      { id: 'english', name: '英语启蒙', icon: 'pencil', desc: '趣味单词，开口说英语', levels: 5 },
      { id: 'math', name: '数学思维', icon: 'calculator', desc: '边玩边学，培养数感', levels: 3 },
      { id: 'books', name: '绘本点读', icon: 'book', desc: '点读绘本，爱上阅读', levels: 2 },
      { id: 'chinese-reading', name: '中文阅读', icon: 'bookText', desc: '读短文，练理解', levels: 2 },
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

/* ==================== 英语模块（年龄段 → 主题 → 单词） ====================
 * 新的认知链路专用。老的 GET /courses/words?category= 保持不变（原页面与冒烟测试仍在用）。
 */

// 年龄段列表（附该段的主题数量）
router.get('/english/age-groups', (req, res) => {
  const rows = db
    .prepare('SELECT age_group AS age, COUNT(*) AS category_count FROM english_categories GROUP BY age_group')
    .all();
  const byAge = new Map(rows.map((r) => [r.age, r.category_count]));
  res.json(AGE_GROUPS.map((g) => ({ ...g, category_count: byAge.get(g.key) || 0 })));
});

// 主题分类：按年龄段过滤，带每个主题的单词数
router.get('/english/categories', (req, res) => {
  const age = req.query.age;
  const counts = 'SELECT wc.category_id AS cid, COUNT(*) AS n FROM word_category wc GROUP BY wc.category_id';
  const select = `
    SELECT c.id, c.key, c.age_group AS age, c.name_cn, c.name_en, c.icon, c.sort,
           COALESCE(t.n, 0) AS word_count
    FROM english_categories c
    LEFT JOIN (${counts}) t ON t.cid = c.id
  `;
  const rows = age
    ? db.prepare(`${select} WHERE c.age_group = ? ORDER BY c.sort, c.id`).all(age)
    : db.prepare(`${select} ORDER BY c.age_group, c.sort, c.id`).all();
  res.json(rows);
});

// 某主题下的单词（含中文讲解与例句）。走映射表 JOIN，天然保证同一主题内单词不重复。
router.get('/english/words', (req, res) => {
  const categoryId = Number(req.query.categoryId);
  if (!categoryId) return res.status(400).json({ error: 'categoryId 不能为空' });
  const rows = db
    .prepare(
      `SELECT w.id, w.english, w.chinese, w.emoji, w.meaning, w.example_en, w.example_cn, w.phonetic, w.phonetic_tips
       FROM word_category wc
       JOIN words w ON w.id = wc.word_id
       WHERE wc.category_id = ?
       ORDER BY wc.sort, w.id`
    )
    .all(categoryId);
  res.json(rows);
});

// 数学题（老接口保留兼容）
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

/* ==================== 数学课程体系（学段 → 知识点 → 测验） ==================== */

// 学段/年级列表（统一成长主线）
router.get('/math/stages', (req, res) => {
  res.json(MATH_STAGES);
});

// 某学段的知识点列表：附带解锁/掌握状态（依赖树判定）
router.get('/math/topics', (req, res) => {
  const stage = req.query.stage;
  if (!stage) return res.status(400).json({ error: 'stage 不能为空' });

  const topics = db
    .prepare(
      `SELECT id, key, stage, board, unit, title, subtitle, emoji, level, sort, content, tags, status
       FROM math_topics WHERE stage = ? ORDER BY board, sort`
    )
    .all(stage);

  // 预计算：每个知识点的测验题 id 列表 & 全局掌握情况
  const quizIdsByTopic = {};
  db.prepare('SELECT id, topic_id FROM math_quiz').all().forEach((q) => {
    (quizIdsByTopic[q.topic_id] ||= []).push(q.id);
  });
  const correctByQuiz = {};
  db
    .prepare("SELECT item_id, COUNT(*) c FROM progress WHERE module = 'math' AND correct = 1 GROUP BY item_id")
    .all()
    .forEach((r) => { correctByQuiz[r.item_id] = r.c; });
  const allTopics = db.prepare('SELECT id FROM math_topics').all().map((r) => r.id);
  const masteredSet = new Set();
  for (const tid of allTopics) {
    const qids = quizIdsByTopic[tid] || [];
    if (qids.length > 0 && qids.every((id) => correctByQuiz[id] > 0)) masteredSet.add(tid);
  }
  // 依赖关系
  const prereqMap = {};
  db.prepare('SELECT topic_id, prereq_id FROM topic_prerequisites').all().forEach((r) => {
    (prereqMap[r.topic_id] ||= []).push(r.prereq_id);
  });

  const result = topics.map((t) => {
    const qids = quizIdsByTopic[t.id] || [];
    const mastered = masteredSet.has(t.id);
    const prereqIds = prereqMap[t.id] || [];
    const unlocked = prereqIds.length === 0 || prereqIds.every((pid) => masteredSet.has(pid));
    let content = [];
    try { content = t.content ? JSON.parse(t.content) : []; } catch { content = []; }
    let tags = [];
    try { tags = t.tags ? JSON.parse(t.tags) : []; } catch { tags = []; }
    return {
      ...t,
      content,
      tags,
      mastered,
      unlocked,
      quizCount: qids.length,
    };
  });
  res.json(result);
});

// 单知识点详情（含分步讲解）
router.get('/math/topics/:id', (req, res) => {
  const topic = db.prepare('SELECT * FROM math_topics WHERE id = ?').get(req.params.id);
  if (!topic) return res.status(404).json({ error: '知识点不存在' });
  let content = [];
  try { content = topic.content ? JSON.parse(topic.content) : []; } catch { content = []; }
  let tags = [];
  try { tags = topic.tags ? JSON.parse(topic.tags) : []; } catch { tags = []; }
  res.json({ ...topic, content, tags });
});

// 某知识点的测验题
router.get('/math/topics/:id/quiz', (req, res) => {
  const rows = db
    .prepare('SELECT id, question, options, answer, level, type FROM math_quiz WHERE topic_id = ? ORDER BY id')
    .all(req.params.id);
  const result = rows.map((r) => {
    let options = [];
    try { options = JSON.parse(r.options); } catch { options = []; }
    return { ...r, options };
  });
  res.json(result);
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
