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

CREATE TABLE IF NOT EXISTS grammar_problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT,
  answer INTEGER NOT NULL,
  explanation TEXT,
  knowledge_point TEXT,
  level INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS listening_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT,
  answer INTEGER NOT NULL,
  category TEXT NOT NULL,
  level INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reading_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  passage TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT,
  answer INTEGER NOT NULL,
  category TEXT NOT NULL,
  level INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS wrong_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  module TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  user_answer TEXT,
  correct_answer TEXT,
  explanation TEXT,
  wrong_count INTEGER DEFAULT 1,
  mastered INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  last_wrong_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  UNIQUE(child_id, module, item_id)
);

CREATE TABLE IF NOT EXISTS chinese_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT,
  answer INTEGER NOT NULL,
  level INTEGER DEFAULT 1
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

// ==================== 新模块种子数据（语法/听力/阅读）====================
function seedNewModules() {
  const gCount = db.prepare('SELECT COUNT(*) as c FROM grammar_problems').get().c;
  if (gCount > 0) return;

  // --- 英语语法题 ---
  const grammarData = [
    { type: 'noun', question: 'I have two ___ (apple).', options: JSON.stringify(['apple', 'apples', 'appleses', 'applees']), answer: 1, explanation: 'two 后面跟可数名词复数，apple 直接加 s。', knowledge_point: '名词复数', level: 1 },
    { type: 'noun', question: 'There are many ___ (child) in the park.', options: JSON.stringify(['child', 'childs', 'children', 'childes']), answer: 2, explanation: 'child 的复数是不规则变化 children。', knowledge_point: '名词复数', level: 1 },
    { type: 'pronoun', question: '___ is my friend. (He/She/It)', options: JSON.stringify(['He', 'Him', 'His', 'He\'s']), answer: 0, explanation: '主语位置用主格 He。', knowledge_point: '代词主格', level: 1 },
    { type: 'pronoun', question: 'This book is ___ (我的).', options: JSON.stringify(['I', 'me', 'my', 'mine']), answer: 3, explanation: '名词性物主代词 mine = my book。', knowledge_point: '物主代词', level: 1 },
    { type: 'tense', question: 'She ___ to school every day. (go)', options: JSON.stringify(['go', 'goes', 'going', 'went']), answer: 1, explanation: '一般现在时，主语 she 是第三人称单数，动词加 es。', knowledge_point: '一般现在时', level: 2 },
    { type: 'tense', question: 'Yesterday I ___ a movie. (watch)', options: JSON.stringify(['watch', 'watches', 'watched', 'watching']), answer: 2, explanation: 'yesterday 表示过去，用一般过去时 watched。', knowledge_point: '一般过去时', level: 2 },
    { type: 'tense', question: 'Look! The cat ___ (sleep) on the sofa.', options: JSON.stringify(['sleep', 'sleeps', 'is sleeping', 'slept']), answer: 2, explanation: 'Look! 提示现在进行时，用 is sleeping。', knowledge_point: '现在进行时', level: 2 },
    { type: 'article', question: 'I see ___ elephant in the zoo.', options: JSON.stringify(['a', 'an', 'the', '/']), answer: 1, explanation: 'elephant 以元音音素开头，用 an。', knowledge_point: '冠词', level: 1 },
    { type: 'prep', question: 'The book is ___ the table. (在...上)', options: JSON.stringify(['in', 'on', 'under', 'at']), answer: 1, explanation: '在桌子上面用 on。', knowledge_point: '介词', level: 1 },
    { type: 'adj', question: 'This apple is ___ than that one. (big)', options: JSON.stringify(['big', 'bigger', 'biggest', 'more big']), answer: 1, explanation: 'than 前面用比较级，big 双写 g 加 er。', knowledge_point: '形容词比较级', level: 2 },
    { type: 'question', question: '___ are you? - I am fine.', options: JSON.stringify(['What', 'Who', 'How', 'Where']), answer: 2, explanation: '问身体状况用 How are you?', knowledge_point: '疑问词', level: 1 },
    { type: 'question', question: '___ is your name? - My name is Tom.', options: JSON.stringify(['What', 'How', 'Who', 'Where']), answer: 0, explanation: '问名字用 What is your name?', knowledge_point: '疑问词', level: 1 },
  ];
  const insertGrammar = db.prepare('INSERT INTO grammar_problems (type, question, options, answer, explanation, knowledge_point, level) VALUES (?, ?, ?, ?, ?, ?, ?)');
  grammarData.forEach(g => insertGrammar.run(g.type, g.question, g.options, g.answer, g.explanation, g.knowledge_point, g.level));

  // --- 听力素材 ---
  const listeningData = [
    { title: '自我介绍', content: 'Hello, my name is Tom. I am six years old. I like apples.', question: 'How old is Tom?', options: JSON.stringify(['5岁', '6岁', '7岁', '8岁']), answer: 1, category: '自我介绍', level: 1 },
    { title: '自我介绍', content: 'Hello, my name is Tom. I am six years old. I like apples.', question: 'What does Tom like?', options: JSON.stringify(['banana', 'apple', 'orange', 'grape']), answer: 1, category: '自我介绍', level: 1 },
    { title: '日常对话', content: 'Good morning! How are you today? I am fine, thank you.', question: 'How is the person?', options: JSON.stringify(['sad', 'fine', 'tired', 'hungry']), answer: 1, category: '日常对话', level: 1 },
    { title: '购物', content: 'I want to buy a red apple. How much is it? It is two yuan.', question: 'What color is the apple?', options: JSON.stringify(['green', 'yellow', 'red', 'blue']), answer: 2, category: '购物', level: 2 },
    { title: '购物', content: 'I want to buy a red apple. How much is it? It is two yuan.', question: 'How much is the apple?', options: JSON.stringify(['1元', '2元', '3元', '4元']), answer: 1, category: '购物', level: 2 },
    { title: '动物', content: 'The cat is small. The dog is big. They are good friends.', question: 'Which animal is small?', options: JSON.stringify(['dog', 'cat', 'bird', 'fish']), answer: 1, category: '动物', level: 1 },
    { title: '天气', content: 'Today is sunny. The sky is blue. We can play outside.', question: 'How is the weather today?', options: JSON.stringify(['rainy', 'cloudy', 'sunny', 'snowy']), answer: 2, category: '天气', level: 2 },
    { title: '颜色', content: 'I have a blue pen and a yellow ruler. They are on the desk.', question: 'What color is the ruler?', options: JSON.stringify(['blue', 'red', 'green', 'yellow']), answer: 3, category: '颜色', level: 1 },
  ];
  const insertListening = db.prepare('INSERT INTO listening_materials (title, content, question, options, answer, category, level) VALUES (?, ?, ?, ?, ?, ?, ?)');
  listeningData.forEach(l => insertListening.run(l.title, l.content, l.question, l.options, l.answer, l.category, l.level));

  // --- 英语阅读理解 ---
  const readingData = [
    { title: '我的家庭', passage: 'I have a happy family. There are four people: my father, my mother, my sister and me. My father is tall. My mother is kind. My sister is young. I love my family.', question: 'How many people are there in the family?', options: JSON.stringify(['3', '4', '5', '6']), answer: 1, category: '家庭', level: 1 },
    { title: '我的家庭', passage: 'I have a happy family. There are four people: my father, my mother, my sister and me. My father is tall. My mother is kind. My sister is young. I love my family.', question: 'Who is tall?', options: JSON.stringify(['mother', 'sister', 'father', 'me']), answer: 2, category: '家庭', level: 1 },
    { title: '我的一天', passage: 'I get up at seven. I have breakfast at seven thirty. I go to school at eight. I have lunch at twelve. I go home at five.', question: 'When does the writer go to school?', options: JSON.stringify(['7:00', '7:30', '8:00', '12:00']), answer: 2, category: '日常', level: 2 },
    { title: '我的一天', passage: 'I get up at seven. I have breakfast at seven thirty. I go to school at eight. I have lunch at twelve. I go home at five.', question: 'What does the writer do at twelve?', options: JSON.stringify(['get up', 'breakfast', 'lunch', 'go home']), answer: 2, category: '日常', level: 2 },
    { title: '动物园', passage: 'Today I go to the zoo. I see many animals. The elephants are big. The monkeys are clever. The pandas are cute. I have a good time.', question: 'How are the monkeys?', options: JSON.stringify(['big', 'cute', 'clever', 'small']), answer: 2, category: '动物', level: 2 },
    { title: '动物园', passage: 'Today I go to the zoo. I see many animals. The elephants are big. The monkeys are clever. The pandas are cute. I have a good time.', question: 'Which animal is cute?', options: JSON.stringify(['elephants', 'monkeys', 'pandas', 'tigers']), answer: 2, category: '动物', level: 2 },
    { title: '我的爱好', passage: 'I like reading books. I read every day. I also like drawing pictures. Drawing makes me happy. My favorite color is blue.', question: 'What does the writer like?', options: JSON.stringify(['reading only', 'drawing only', 'reading and drawing', 'singing']), answer: 2, category: '爱好', level: 1 },
    { title: '季节', passage: 'There are four seasons in a year. Spring is warm. Summer is hot. Autumn is cool. Winter is cold. I like spring best.', question: 'Which season does the writer like best?', options: JSON.stringify(['spring', 'summer', 'autumn', 'winter']), answer: 0, category: '自然', level: 2 },
  ];
  const insertReading = db.prepare('INSERT INTO reading_materials (title, passage, question, options, answer, category, level) VALUES (?, ?, ?, ?, ?, ?, ?)');
  readingData.forEach(r => insertReading.run(r.title, r.passage, r.question, r.options, r.answer, r.category, r.level));

  // --- 中文阅读理解 ---
  const chineseReadingData = [
    { title: '春天来了', content: '春天来了，天气变暖了。小草从地里钻出来，花儿开了。小鸟在树上唱歌，小朋友们在草地上玩耍。春天真美丽！', question: '春天天气怎么样？', options: JSON.stringify(['变冷了', '变暖了', '下雨了', '下雪了']), answer: 1, level: 1 },
    { title: '春天来了', content: '春天来了，天气变暖了。小草从地里钻出来，花儿开了。小鸟在树上唱歌，小朋友们在草地上玩耍。春天真美丽！', question: '谁在树上唱歌？', options: JSON.stringify(['小朋友', '小草', '小鸟', '花儿']), answer: 2, level: 1 },
    { title: '小兔子', content: '小兔子有长长的耳朵，红红的眼睛。它喜欢吃胡萝卜和青菜。它跑起来很快，一跳一跳的，真可爱。', question: '小兔子喜欢吃什么？', options: JSON.stringify(['鱼', '肉', '胡萝卜和青菜', '米饭']), answer: 2, level: 1 },
    { title: '小兔子', content: '小兔子有长长的耳朵，红红的眼睛。它喜欢吃胡萝卜和青菜。它跑起来很快，一跳一跳的，真可爱。', question: '小兔子的眼睛是什么颜色？', options: JSON.stringify(['蓝色', '绿色', '红色', '黑色']), answer: 2, level: 1 },
    { title: '助人为乐', content: '小明在上学的路上，看到一位老奶奶提着很多东西。小明跑过去帮老奶奶提东西。老奶奶笑着说："谢谢你，好孩子！"小明心里甜甜的。', question: '小明帮谁提东西？', options: JSON.stringify(['老爷爷', '老奶奶', '小朋友', '老师']), answer: 1, level: 2 },
    { title: '助人为乐', content: '小明在上学的路上，看到一位老奶奶提着很多东西。小明跑过去帮老奶奶提东西。老奶奶笑着说："谢谢你，好孩子！"小明心里甜甜的。', question: '老奶奶怎么说？', options: JSON.stringify(['再见', '谢谢你，好孩子', '你好', '快走吧']), answer: 1, level: 2 },
  ];
  const insertChineseReading = db.prepare('INSERT INTO chinese_readings (title, content, question, options, answer, level) VALUES (?, ?, ?, ?, ?, ?)');
  chineseReadingData.forEach(r => insertChineseReading.run(r.title, r.content, r.question, r.options, r.answer, r.level));

  console.log('✅ 新模块种子数据插入完成');
}

// ==================== 扩充单词分类（水果/家具/球类/交通/衣物）====================
function seedMoreWords() {
  const fruitCount = db.prepare("SELECT COUNT(*) as c FROM words WHERE category = '水果'").get().c;
  if (fruitCount > 0) return;

  const moreWords = [
    // 水果
    { english: 'apple', chinese: '苹果', category: '水果', emoji: '🍎' },
    { english: 'banana', chinese: '香蕉', category: '水果', emoji: '🍌' },
    { english: 'orange', chinese: '橙子', category: '水果', emoji: '🍊' },
    { english: 'grape', chinese: '葡萄', category: '水果', emoji: '🍇' },
    { english: 'watermelon', chinese: '西瓜', category: '水果', emoji: '🍉' },
    { english: 'strawberry', chinese: '草莓', category: '水果', emoji: '🍓' },
    { english: 'pear', chinese: '梨', category: '水果', emoji: '🍐' },
    { english: 'peach', chinese: '桃子', category: '水果', emoji: '🍑' },
    // 家具
    { english: 'bed', chinese: '床', category: '家具', emoji: '🛏️' },
    { english: 'chair', chinese: '椅子', category: '家具', emoji: '🪑' },
    { english: 'table', chinese: '桌子', category: '家具', emoji: '🪵' },
    { english: 'sofa', chinese: '沙发', category: '家具', emoji: '🛋️' },
    { english: 'desk', chinese: '书桌', category: '家具', emoji: '🗄️' },
    { english: 'door', chinese: '门', category: '家具', emoji: '🚪' },
    { english: 'window', chinese: '窗户', category: '家具', emoji: '🪟' },
    { english: 'lamp', chinese: '灯', category: '家具', emoji: '💡' },
    // 球类
    { english: 'ball', chinese: '球', category: '球类', emoji: '⚽' },
    { english: 'football', chinese: '足球', category: '球类', emoji: '⚽' },
    { english: 'basketball', chinese: '篮球', category: '球类', emoji: '🏀' },
    { english: 'tennis', chinese: '网球', category: '球类', emoji: '🎾' },
    { english: 'volleyball', chinese: '排球', category: '球类', emoji: '🏐' },
    { english: 'ping-pong', chinese: '乒乓球', category: '球类', emoji: '🏓' },
    { english: 'baseball', chinese: '棒球', category: '球类', emoji: '⚾' },
    // 交通工具
    { english: 'car', chinese: '汽车', category: '交通', emoji: '🚗' },
    { english: 'bus', chinese: '公交车', category: '交通', emoji: '🚌' },
    { english: 'bike', chinese: '自行车', category: '交通', emoji: '🚲' },
    { english: 'train', chinese: '火车', category: '交通', emoji: '🚆' },
    { english: 'plane', chinese: '飞机', category: '交通', emoji: '✈️' },
    { english: 'ship', chinese: '轮船', category: '交通', emoji: '🚢' },
    { english: 'taxi', chinese: '出租车', category: '交通', emoji: '🚕' },
    { english: 'boat', chinese: '小船', category: '交通', emoji: '⛵' },
    // 衣物
    { english: 'shirt', chinese: '衬衫', category: '衣物', emoji: '👕' },
    { english: 'pants', chinese: '裤子', category: '衣物', emoji: '👖' },
    { english: 'shoes', chinese: '鞋子', category: '衣物', emoji: '👟' },
    { english: 'hat', chinese: '帽子', category: '衣物', emoji: '🎩' },
    { english: 'dress', chinese: '连衣裙', category: '衣物', emoji: '👗' },
    { english: 'coat', chinese: '外套', category: '衣物', emoji: '🧥' },
    { english: 'socks', chinese: '袜子', category: '衣物', emoji: '🧦' },
  ];
  const insertWord = db.prepare('INSERT INTO words (english, chinese, category, emoji) VALUES (?, ?, ?, ?)');
  moreWords.forEach(w => insertWord.run(w.english, w.chinese, w.category, w.emoji));
  console.log('✅ 扩充单词分类完成（水果/家具/球类/交通/衣物）');
}

seed();
seedNewModules();
seedMoreWords();

export default db;
