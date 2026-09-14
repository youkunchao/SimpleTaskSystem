import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'kidstar.db');

// 确保 data 目录存在
const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==================== Schema ====================
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  avatar TEXT DEFAULT '🦊',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hanzi TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  meaning TEXT NOT NULL,
  stroke_count INTEGER,
  level INTEGER NOT NULL,
  emoji TEXT,
  words TEXT
);

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  english TEXT NOT NULL,
  chinese TEXT NOT NULL,
  category TEXT NOT NULL,
  emoji TEXT
);

CREATE TABLE IF NOT EXISTS math_problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT,
  answer INTEGER NOT NULL,
  level INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS picture_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  level INTEGER NOT NULL,
  cover TEXT,
  pages TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  module TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  duration INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  module TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  interval_level INTEGER DEFAULT 0,
  next_review TEXT NOT NULL,
  last_review TEXT,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL UNIQUE,
  stars INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  last_study_date TEXT,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  requirement INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS child_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  unlocked_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  UNIQUE(child_id, badge_id)
);
`);

// ==================== Seed Data ====================
function seed() {
  // 检查是否已有种子数据
  const charCount = db.prepare('SELECT COUNT(*) as c FROM characters').get().c;
  if (charCount > 0) return;

  // --- 汉字（4级，每级10个）---
  const hanziData = [
    // L1 入门 - 简单象形字
    { hanzi: '人', pinyin: 'rén', meaning: '人类', emoji: '🧑', words: '人们,大人,好人' },
    { hanzi: '口', pinyin: 'kǒu', meaning: '嘴巴', emoji: '👄', words: '口水,开口,门口' },
    { hanzi: '日', pinyin: 'rì', meaning: '太阳', emoji: '☀️', words: '日出,日子,今日' },
    { hanzi: '月', pinyin: 'yuè', meaning: '月亮', emoji: '🌙', words: '月亮,月光,明月' },
    { hanzi: '山', pinyin: 'shān', meaning: '山峰', emoji: '⛰️', words: '山水,高山,上山' },
    { hanzi: '水', pinyin: 'shuǐ', meaning: '水', emoji: '💧', words: '水果,喝水,河水' },
    { hanzi: '火', pinyin: 'huǒ', meaning: '火焰', emoji: '🔥', words: '火车,大火,火苗' },
    { hanzi: '木', pinyin: 'mù', meaning: '树木', emoji: '🌳', words: '木头,树木,草木' },
    { hanzi: '土', pinyin: 'tǔ', meaning: '泥土', emoji: '🌱', words: '土地,泥土,黄土' },
    { hanzi: '石', pinyin: 'shí', meaning: '石头', emoji: '🪨', words: '石头,岩石,宝石' },
    // L2 基础
    { hanzi: '大', pinyin: 'dà', meaning: '大的', emoji: '🐘', words: '大人,大家,大地' },
    { hanzi: '小', pinyin: 'xiǎo', meaning: '小的', emoji: '🐭', words: '小鸟,小心,大小' },
    { hanzi: '上', pinyin: 'shàng', meaning: '上面', emoji: '⬆️', words: '上下,上学,上面' },
    { hanzi: '下', pinyin: 'xià', meaning: '下面', emoji: '⬇️', words: '下雨,下面,坐下' },
    { hanzi: '中', pinyin: 'zhōng', meaning: '中间', emoji: '🎯', words: '中国,中间,中心' },
    { hanzi: '天', pinyin: 'tiān', meaning: '天空', emoji: '🌤️', words: '天空,今天,天气' },
    { hanzi: '地', pinyin: 'dì', meaning: '地面', emoji: '🌍', words: '地球,土地,地方' },
    { hanzi: '花', pinyin: 'huā', meaning: '花朵', emoji: '🌸', words: '花朵,花园,开花' },
    { hanzi: '草', pinyin: 'cǎo', meaning: '草', emoji: '🌿', words: '草地,青草,小草' },
    { hanzi: '树', pinyin: 'shù', meaning: '树木', emoji: '🌲', words: '树林,大树,树叶' },
    // L3 进阶
    { hanzi: '爸', pinyin: 'bà', meaning: '爸爸', emoji: '👨', words: '爸爸,爸妈' },
    { hanzi: '妈', pinyin: 'mā', meaning: '妈妈', emoji: '👩', words: '妈妈,妈咪' },
    { hanzi: '哥', pinyin: 'gē', meaning: '哥哥', emoji: '👦', words: '哥哥,大哥' },
    { hanzi: '姐', pinyin: 'jiě', meaning: '姐姐', emoji: '👧', words: '姐姐,大姐' },
    { hanzi: '弟', pinyin: 'dì', meaning: '弟弟', emoji: '🧒', words: '弟弟,兄弟' },
    { hanzi: '妹', pinyin: 'mèi', meaning: '妹妹', emoji: '👧', words: '妹妹,姐妹' },
    { hanzi: '家', pinyin: 'jiā', meaning: '家庭', emoji: '🏠', words: '家人,回家,大家' },
    { hanzi: '友', pinyin: 'yǒu', meaning: '朋友', emoji: '🤝', words: '朋友,好友,友谊' },
    { hanzi: '爱', pinyin: 'ài', meaning: '喜爱', emoji: '❤️', words: '爱心,喜爱,爱国' },
    { hanzi: '笑', pinyin: 'xiào', meaning: '微笑', emoji: '😊', words: '笑容,大笑,笑话' },
    // L4 提高
    { hanzi: '学', pinyin: 'xué', meaning: '学习', emoji: '📚', words: '学习,学生,上学' },
    { hanzi: '书', pinyin: 'shū', meaning: '书本', emoji: '📖', words: '书本,读书,图书' },
    { hanzi: '笔', pinyin: 'bǐ', meaning: '笔', emoji: '✏️', words: '铅笔,毛笔,画笔' },
    { hanzi: '纸', pinyin: 'zhǐ', meaning: '纸张', emoji: '📄', words: '白纸,纸张,报纸' },
    { hanzi: '数', pinyin: 'shù', meaning: '数字', emoji: '🔢', words: '数学,数字,计数' },
    { hanzi: '字', pinyin: 'zì', meaning: '文字', emoji: '🔤', words: '汉字,文字,写字' },
    { hanzi: '语', pinyin: 'yǔ', meaning: '语言', emoji: '💬', words: '语文,语言,英语' },
    { hanzi: '画', pinyin: 'huà', meaning: '绘画', emoji: '🎨', words: '画画,图画,画家' },
    { hanzi: '乐', pinyin: 'lè', meaning: '快乐', emoji: '😄', words: '快乐,音乐,欢乐' },
    { hanzi: '游', pinyin: 'yóu', meaning: '游戏', emoji: '🎮', words: '游戏,游泳,旅游' },
  ];

  const insertChar = db.prepare('INSERT INTO characters (hanzi, pinyin, meaning, stroke_count, level, emoji, words) VALUES (?, ?, ?, ?, ?, ?, ?)');
  hanziData.forEach((c, i) => {
    const level = Math.floor(i / 10) + 1;
    insertChar.run(c.hanzi, c.pinyin, c.meaning, c.hanzi.length, level, c.emoji, c.words);
  });

  // --- 英语单词（5类）---
  const wordData = [
    // 动物
    { english: 'cat', chinese: '猫', category: '动物', emoji: '🐱' },
    { english: 'dog', chinese: '狗', category: '动物', emoji: '🐶' },
    { english: 'bird', chinese: '鸟', category: '动物', emoji: '🐦' },
    { english: 'fish', chinese: '鱼', category: '动物', emoji: '🐟' },
    { english: 'rabbit', chinese: '兔子', category: '动物', emoji: '🐰' },
    { english: 'lion', chinese: '狮子', category: '动物', emoji: '🦁' },
    { english: 'tiger', chinese: '老虎', category: '动物', emoji: '🐯' },
    { english: 'monkey', chinese: '猴子', category: '动物', emoji: '🐵' },
    // 食物
    { english: 'apple', chinese: '苹果', category: '食物', emoji: '🍎' },
    { english: 'banana', chinese: '香蕉', category: '食物', emoji: '🍌' },
    { english: 'bread', chinese: '面包', category: '食物', emoji: '🍞' },
    { english: 'milk', chinese: '牛奶', category: '食物', emoji: '🥛' },
    { english: 'egg', chinese: '鸡蛋', category: '食物', emoji: '🥚' },
    { english: 'cake', chinese: '蛋糕', category: '食物', emoji: '🍰' },
    { english: 'rice', chinese: '米饭', category: '食物', emoji: '🍚' },
    { english: 'water', chinese: '水', category: '食物', emoji: '💧' },
    // 颜色
    { english: 'red', chinese: '红色', category: '颜色', emoji: '🔴' },
    { english: 'blue', chinese: '蓝色', category: '颜色', emoji: '🔵' },
    { english: 'yellow', chinese: '黄色', category: '颜色', emoji: '🟡' },
    { english: 'green', chinese: '绿色', category: '颜色', emoji: '🟢' },
    { english: 'black', chinese: '黑色', category: '颜色', emoji: '⚫' },
    { english: 'white', chinese: '白色', category: '颜色', emoji: '⚪' },
    // 数字
    { english: 'one', chinese: '一', category: '数字', emoji: '1️⃣' },
    { english: 'two', chinese: '二', category: '数字', emoji: '2️⃣' },
    { english: 'three', chinese: '三', category: '数字', emoji: '3️⃣' },
    { english: 'four', chinese: '四', category: '数字', emoji: '4️⃣' },
    { english: 'five', chinese: '五', category: '数字', emoji: '5️⃣' },
    { english: 'six', chinese: '六', category: '数字', emoji: '6️⃣' },
    { english: 'seven', chinese: '七', category: '数字', emoji: '7️⃣' },
    { english: 'eight', chinese: '八', category: '数字', emoji: '8️⃣' },
    // 家庭
    { english: 'father', chinese: '爸爸', category: '家庭', emoji: '👨' },
    { english: 'mother', chinese: '妈妈', category: '家庭', emoji: '👩' },
    { english: 'brother', chinese: '兄弟', category: '家庭', emoji: '👦' },
    { english: 'sister', chinese: '姐妹', category: '家庭', emoji: '👧' },
    { english: 'grandpa', chinese: '爷爷', category: '家庭', emoji: '👴' },
    { english: 'grandma', chinese: '奶奶', category: '家庭', emoji: '👵' },
  ];

  const insertWord = db.prepare('INSERT INTO words (english, chinese, category, emoji) VALUES (?, ?, ?, ?)');
  wordData.forEach(w => insertWord.run(w.english, w.chinese, w.category, w.emoji));

  // --- 数学题 ---
  const mathData = [];
  // 比大小
  for (let i = 0; i < 15; i++) {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const answer = a > b ? 1 : (a < b ? 2 : 0);
    if (answer !== 0) {
      mathData.push({ type: 'compare', question: `${a} ? ${b}`, options: JSON.stringify(['>', '<']), answer, level: 1 });
    }
  }
  // 加减法
  for (let i = 0; i < 20; i++) {
    const op = Math.random() > 0.5 ? '+' : '-';
    let a, b, ans;
    if (op === '+') {
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      ans = a + b;
    } else {
      a = Math.floor(Math.random() * 10) + 5;
      b = Math.floor(Math.random() * a) + 1;
      ans = a - b;
    }
    const wrong1 = ans + Math.floor(Math.random() * 3) + 1;
    const wrong2 = ans - Math.floor(Math.random() * 3) - 1;
    const options = [ans, wrong1, Math.max(0, wrong2)].sort(() => Math.random() - 0.5);
    mathData.push({ type: 'arithmetic', question: `${a} ${op} ${b} = ?`, options: JSON.stringify(options), answer: options.indexOf(ans), level: 2 });
  }
  // 图形识别
  const shapes = [
    { q: '⭕ 这是什么形状？', options: ['圆形', '方形', '三角形'], answer: 0 },
    { q: '⬜ 这是什么形状？', options: ['圆形', '方形', '三角形'], answer: 1 },
    { q: '🔺 这是什么形状？', options: ['圆形', '方形', '三角形'], answer: 2 },
    { q: '⭐ 这是什么形状？', options: ['五角星', '心形', '菱形'], answer: 0 },
    { q: '❤️ 这是什么形状？', options: ['五角星', '心形', '菱形'], answer: 1 },
  ];
  shapes.forEach(s => {
    mathData.push({ type: 'shape', question: s.q, options: JSON.stringify(s.options), answer: s.answer, level: 1 });
  });

  const insertMath = db.prepare('INSERT INTO math_problems (type, question, options, answer, level) VALUES (?, ?, ?, ?, ?)');
  mathData.forEach(m => insertMath.run(m.type, m.question, m.options, m.answer, m.level));

  // --- 绘本 ---
  const books = [
    {
      title: '小兔子的一天',
      level: 1,
      cover: '🐰',
      pages: JSON.stringify([
        { text: '早晨，太阳升起来了。小兔子醒来了。', img: '🌅🐰' },
        { text: '小兔子刷牙、洗脸，吃早饭。', img: '🪥🥕' },
        { text: '小兔子和朋友一起去公园玩。', img: '🌳🎈' },
        { text: '他们看到了美丽的花朵和蝴蝶。', img: '🌸🦋' },
        { text: '晚上，小兔子回家睡觉了。晚安！', img: '🌙💤' },
      ]),
    },
    {
      title: '小熊找朋友',
      level: 2,
      cover: '🐻',
      pages: JSON.stringify([
        { text: '小熊一个人在家，觉得很孤单。', img: '🏠🐻' },
        { text: '他决定出门去找好朋友。', img: '🚶🐻' },
        { text: '路上遇到了小松鼠，他们一起玩耍。', img: '🐿️🎈' },
        { text: '又遇到了小鹿，大家一起唱歌跳舞。', img: '🦌🎶' },
        { text: '小熊找到了很多朋友，开心极了！', img: '🎉❤️' },
      ]),
    },
  ];

  const insertBook = db.prepare('INSERT INTO picture_books (title, level, cover, pages) VALUES (?, ?, ?, ?)');
  books.forEach(b => insertBook.run(b.title, b.level, b.cover, b.pages));

  // --- 徽章 ---
  const badges = [
    { name: '初学乍练', description: '完成第一次学习', icon: '🌱', requirement: 1 },
    { name: '勤学不辍', description: '累计学习10次', icon: '📖', requirement: 10 },
    { name: '博学多才', description: '累计学习50次', icon: '🎓', requirement: 50 },
    { name: '星星收藏家', description: '获得50颗星星', icon: '⭐', requirement: 50 },
    { name: '坚持小达人', description: '连续打卡7天', icon: '🔥', requirement: 7 },
    { name: '识字小能手', description: '掌握20个汉字', icon: '✍️', requirement: 20 },
  ];
  const insertBadge = db.prepare('INSERT INTO badges (name, description, icon, requirement) VALUES (?, ?, ?, ?)');
  badges.forEach(b => insertBadge.run(b.name, b.description, b.icon, b.requirement));

  console.log('✅ 种子数据插入完成');
}

seed();

export default db;
