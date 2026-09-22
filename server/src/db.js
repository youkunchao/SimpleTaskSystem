import { createDatabase } from './sqlite.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { nowLocal, utcOffsetMinutes } from './time.js';
// 1000 个汉字（20 关 × 50 字），依据人教版识字表由易到难
import { CHARACTERS } from './data/characters.generated.js';
// 英语模块词库：年龄段 + 45 个主题 + 361 个单词（含中文讲解与例句）
import { AGE_GROUPS, CATEGORIES, WORDS as ENGLISH_WORDS } from './data/english.generated.js';
// 英语单词音标（CMU 词典生成）与音标讲解
import { PHONETICS } from './data/englishPhonetics.generated.js';
// 数学课程体系：学段 / 知识点 / 测验 / 能力标签（数据在 math.generated.js 唯一事实源）
import { STAGES, ABILITY_TAGS, ALL_TOPICS, QUIZZES } from './data/math.generated.js';
// 汉字配图（按字义推导 emoji）
import { pickEmoji } from './data/charEmoji.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'kidstar.db');

// 确保 data 目录存在
const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = createDatabase(dbPath);
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
  emoji TEXT,
  meaning TEXT,      -- 中文白话释义（孩子能听懂的一句讲解）
  example_en TEXT,   -- 英文例句
  example_cn TEXT,   -- 例句的中文翻译
  phonetic TEXT,     -- 国际音标，如 /ʃɪp/
  phonetic_tips TEXT -- 音标讲解（JSON 数组：[{sym,tip}]）
);

-- 英语主题分类（按年龄段划分，如 3-4 岁的「动物」、5-6 岁的「海洋生物」）
CREATE TABLE IF NOT EXISTS english_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,   -- 稳定标识，形如 '3-4:动物'，数据文件与接口都用它对齐
  age_group TEXT NOT NULL,    -- '3-4' | '4-5' | '5-6' | '6-7' | '7-8'
  name_cn TEXT NOT NULL,      -- 主题中文名
  name_en TEXT NOT NULL,      -- 主题英文名
  icon TEXT,                  -- 插画占位（emoji）
  sort INTEGER DEFAULT 0
);

-- 单词与主题的多对多归属：一个词可属于多个主题，但同一主题内只能出现一次
CREATE TABLE IF NOT EXISTS word_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  sort INTEGER DEFAULT 0,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES english_categories(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_word_cat_unique ON word_category(word_id, category_id);

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

-- 学习位置：记住孩子在每个模块学到第几个，下次进来接着学（洪恩式主线进度）
CREATE TABLE IF NOT EXISTS learning_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id INTEGER NOT NULL,
  module TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT,
  UNIQUE(child_id, module, scope),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
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

-- ==================== 数学课程体系 ====================
-- 知识点（核心实体）：学段/板块/分步讲解/能力标签/前置依赖
CREATE TABLE IF NOT EXISTS math_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,        -- 稳定标识，数据文件与接口都用它对齐
  stage TEXT NOT NULL,             -- '2-3' | '3-4' | ... | 'grade1'..'grade6'
  board TEXT NOT NULL,             -- 数与代数 | 图形与几何 | 统计与概率 | 数学思维
  unit TEXT,                       -- 单元/小节名
  title TEXT NOT NULL,
  subtitle TEXT,
  emoji TEXT,
  level INTEGER DEFAULT 1,
  sort INTEGER DEFAULT 0,
  content TEXT,                    -- JSON: [{type:'explain'|'example'|'guide', text, emoji}]
  tags TEXT,                       -- JSON 能力标签数组, 如 ["数感","计算熟练度"]
  prerequisites TEXT,              -- JSON 前置 topic key 数组（冗余，便于前端快速渲染）
  status TEXT DEFAULT 'seeded'     -- 'seeded' | 'placeholder'
);

-- 依赖树（可查询，支持级联锁定判断）
CREATE TABLE IF NOT EXISTS topic_prerequisites (
  topic_id INTEGER NOT NULL,
  prereq_id INTEGER NOT NULL,
  PRIMARY KEY (topic_id, prereq_id),
  FOREIGN KEY (topic_id) REFERENCES math_topics(id) ON DELETE CASCADE,
  FOREIGN KEY (prereq_id) REFERENCES math_topics(id) ON DELETE CASCADE
);

-- 测验题（绑定知识点，支撑按能力标签聚合正确率）
CREATE TABLE IF NOT EXISTS math_quiz (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  qkey TEXT NOT NULL UNIQUE,       -- 稳定标识，幂等 upsert 用
  topic_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,           -- JSON 数组
  answer INTEGER NOT NULL,         -- 正确选项索引
  level INTEGER DEFAULT 1,
  type TEXT,
  FOREIGN KEY (topic_id) REFERENCES math_topics(id) ON DELETE CASCADE
);

-- 能力维度定义（雷达图维度）
CREATE TABLE IF NOT EXISTS ability_tags (
  name TEXT PRIMARY KEY,           -- 数感 | 计算熟练度 | 逻辑思维 | 几何空间 | 统计推理
  dimension TEXT NOT NULL
);
`);

// 汉字标准笔画数（简体）。早期版本误用 hanzi.length 填充，导致所有字都是 1 画。
const STROKE_COUNT = {
  人: 2, 口: 3, 日: 4, 月: 4, 山: 3, 水: 4, 火: 4, 木: 4, 土: 3, 石: 5,
  大: 3, 小: 3, 上: 3, 下: 3, 中: 4, 天: 4, 地: 6, 花: 7, 草: 9, 树: 9,
  爸: 8, 妈: 6, 哥: 10, 姐: 8, 弟: 7, 妹: 8, 家: 10, 友: 4, 爱: 10, 笑: 10,
  学: 8, 书: 4, 笔: 10, 纸: 7, 数: 13, 字: 6, 语: 9, 画: 8, 乐: 5, 游: 12,
};

// ==================== 轻量迁移 ====================
// 此前没有任何迁移机制，改数据结构只能删库重建。
// 这里用 migrations 表记录已执行的迁移，保证幂等、可重复运行。
db.exec(`
CREATE TABLE IF NOT EXISTS migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT
);
`);

// 生成不重复的选项：把与前面重复的项替换成一个未出现过的值
function dedupeOptions(options) {
  const list = [...options];
  for (let i = 1; i < list.length; i++) {
    for (let j = 0; j < i; j++) {
      if (list[i] === list[j]) {
        let candidate = typeof list[i] === 'number' ? list[i] + 1 : `${list[i]}（2）`;
        while (list.includes(candidate)) {
          candidate = typeof candidate === 'number' ? candidate + 1 : `${candidate}*`;
        }
        list[i] = candidate;
      }
    }
  }
  return list;
}

const MIGRATIONS = {
  // 修正汉字笔画数
  'fix-character-stroke-count': () => {
    const upd = db.prepare('UPDATE characters SET stroke_count = ? WHERE hanzi = ?');
    for (const [hanzi, count] of Object.entries(STROKE_COUNT)) {
      upd.run(count, hanzi);
    }
  },

  // 汉字扩充到 1000 个（20 关 × 50 字）：保留已有数据和学习进度，只补入缺失的字，
  // 并把旧字的关卡/拼音/释义/组词同步到新的教材顺序，保证分级一致。
  'expand-characters-to-1000': () => {
    const exists = new Set(db.prepare('SELECT hanzi FROM characters').all().map(r => r.hanzi));
    const insertChar = db.prepare('INSERT INTO characters (hanzi, pinyin, meaning, stroke_count, level, emoji, words) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const updateChar = db.prepare('UPDATE characters SET level = ?, pinyin = ?, meaning = ?, words = ?, stroke_count = ? WHERE hanzi = ?');
    let added = 0, updated = 0;
    for (const c of CHARACTERS) {
      if (exists.has(c.hanzi)) {
        updateChar.run(c.level, c.pinyin, c.meaning, c.words, c.stroke_count, c.hanzi);
        updated++;
      } else {
        insertChar.run(c.hanzi, c.pinyin, c.meaning, c.stroke_count, c.level, c.emoji, c.words);
        added++;
      }
    }
    console.log(`   汉字：新增 ${added} 个，同步 ${updated} 个，共 ${CHARACTERS.length} 个`);
  },

  // 清理不在字表里的旧汉字（如早期手工数据残留），保证库里就是这 1000 个字
  'cleanup-orphan-characters': () => {
    const keep = CHARACTERS.map(c => c.hanzi);
    const placeholders = keep.map(() => '?').join(',');
    const res = db.prepare(`DELETE FROM characters WHERE hanzi NOT IN (${placeholders})`).run(...keep);
    if (res.changes) console.log(`   清理旧汉字 ${res.changes} 个`);
  },

  // 修正历史 UTC 时间戳为本地时间（表结构里的 DEFAULT datetime('now') 写入的是 UTC）
  'fix-utc-timestamps': () => {
    const offset = utcOffsetMinutes();
    if (offset === 0) return;
    const delta = `${offset >= 0 ? '+' : ''}${offset} minutes`;
    const columns = {
      users: ['created_at'],
      children: ['created_at'],
      progress: ['created_at'],
      review_items: ['next_review', 'last_review'],
      wrong_questions: ['created_at', 'last_wrong_at'],
      child_badges: ['unlocked_at'],
      rewards: ['last_study_date'],
    };
    for (const [table, cols] of Object.entries(columns)) {
      for (const col of cols) {
        db.exec(`UPDATE ${table} SET ${col} = datetime(${col}, '${delta}') WHERE ${col} IS NOT NULL`);
      }
    }
  },

  // 修正数学题重复选项（加减法曾生成两个相同的干扰项）
  'fix-math-duplicate-options': () => {
    const rows = db.prepare("SELECT id, options, answer FROM math_problems WHERE type = 'arithmetic'").all();
    const upd = db.prepare('UPDATE math_problems SET options = ?, answer = ? WHERE id = ?');
    for (const row of rows) {
      let opts;
      try { opts = JSON.parse(row.options); } catch { continue; }
      if (!Array.isArray(opts) || new Set(opts).size === opts.length) continue;
      const answerValue = opts[row.answer];
      const fixed = dedupeOptions(opts);
      upd.run(JSON.stringify(fixed), fixed.indexOf(answerValue), row.id);
    }
  },

  // 删除重复单词：同一英文词被放进多个分类（apple/banana 同时在"食物"和"水果"），
  // 会让答题选项里出现两个完全相同的单词，孩子无从分辨
  'remove-duplicate-words': () => {
    const dups = db.prepare('SELECT english, GROUP_CONCAT(id) AS ids FROM words GROUP BY english HAVING COUNT(*) > 1').all();
    for (const d of dups) {
      const ids = String(d.ids).split(',').map(Number).sort((a, b) => a - b);
      const keep = ids[0];
      for (const drop of ids.slice(1)) {
        // 把已有的学习记录指向保留的那条；用 OR IGNORE 避免撞上唯一约束
        db.prepare('UPDATE OR IGNORE progress SET item_id = ? WHERE module = ? AND item_id = ?').run(keep, 'english', drop);
        db.prepare('UPDATE OR IGNORE wrong_questions SET item_id = ? WHERE module = ? AND item_id = ?').run(keep, 'english', drop);
        db.prepare('UPDATE OR IGNORE review_items SET item_id = ? WHERE module = ? AND item_id = ?').run(keep, 'english', drop);
        db.prepare('DELETE FROM words WHERE id = ?').run(drop);
      }
    }
  },

  // 补索引：所有业务查询都按 child_id 过滤，此前只有主键索引，数据量增长后会明显变慢
  'add-performance-indexes': () => {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);
      CREATE INDEX IF NOT EXISTS idx_progress_child ON progress(child_id);
      CREATE INDEX IF NOT EXISTS idx_progress_child_day ON progress(child_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_review_child_next ON review_items(child_id, next_review);
      CREATE INDEX IF NOT EXISTS idx_wrong_child ON wrong_questions(child_id, mastered);
      CREATE INDEX IF NOT EXISTS idx_child_badges_child ON child_badges(child_id);
      CREATE INDEX IF NOT EXISTS idx_characters_level ON characters(level);
      CREATE INDEX IF NOT EXISTS idx_words_category ON words(category);
      CREATE INDEX IF NOT EXISTS idx_math_type ON math_problems(type);
    `);
    // 复习项本应唯一；存量库若有重复记录则跳过，避免启动失败
    try {
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_review_unique ON review_items(child_id, module, item_id)');
    } catch (e) {
      console.warn('⚠️ 复习项存在重复记录，未创建唯一索引：', e.message);
    }
  },

  // 英语单词补充「中文讲解 + 例句」三列：老库建表时没有，这里补上（幂等）
  'english-word-explanations': () => {
    const cols = db.prepare('PRAGMA table_info(words)').all().map((c) => c.name);
    if (!cols.includes('meaning')) db.exec('ALTER TABLE words ADD COLUMN meaning TEXT');
    if (!cols.includes('example_en')) db.exec('ALTER TABLE words ADD COLUMN example_en TEXT');
    if (!cols.includes('example_cn')) db.exec('ALTER TABLE words ADD COLUMN example_cn TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS idx_english_cat_age ON english_categories(age_group, sort)');
  },

  // 英语单词补充「音标 + 音标讲解」两列（幂等）
  'english-word-phonetics': () => {
    const cols = db.prepare('PRAGMA table_info(words)').all().map((c) => c.name);
    if (!cols.includes('phonetic')) db.exec('ALTER TABLE words ADD COLUMN phonetic TEXT');
    if (!cols.includes('phonetic_tips')) db.exec('ALTER TABLE words ADD COLUMN phonetic_tips TEXT');
  },

  // 扩充徽章体系：原库只有 6 枚，且解锁条件硬编码在 rewards 路由里（按 name 关键字判断），
  // 每加一枚都要改代码。改为数据驱动：badges 增加 metric（统计指标）与 sort（排序），
  // 路由按 metric 取实时统计值对比 requirement，以后新增徽章只加数据即可。
  'expand-badges-collection': () => {
    const cols = db.prepare('PRAGMA table_info(badges)').all().map((c) => c.name);
    if (!cols.includes('metric')) db.exec('ALTER TABLE badges ADD COLUMN metric TEXT');
    if (!cols.includes('sort')) db.exec('ALTER TABLE badges ADD COLUMN sort INTEGER DEFAULT 0');

    // 徽章库：按维度分组，同一维度分阶梯，保证孩子永远有"下一个目标"
    const LIBRARY = [
      // 学习次数
      { name: '初学乍练', description: '完成第一次学习', icon: '🌱', metric: 'study_count', requirement: 1, sort: 101 },
      { name: '勤学不辍', description: '累计学习10次', icon: '📖', metric: 'study_count', requirement: 10, sort: 102 },
      { name: '小有名气', description: '累计学习30次', icon: '🌟', metric: 'study_count', requirement: 30, sort: 103 },
      { name: '博学多才', description: '累计学习50次', icon: '🎓', metric: 'study_count', requirement: 50, sort: 104 },
      { name: '学富五车', description: '累计学习100次', icon: '🏆', metric: 'study_count', requirement: 100, sort: 105 },
      { name: '学习之王', description: '累计学习200次', icon: '👑', metric: 'study_count', requirement: 200, sort: 106 },

      // 答题正确数
      { name: '小试身手', description: '答对10道题', icon: '🎯', metric: 'correct_count', requirement: 10, sort: 201 },
      { name: '得心应手', description: '答对50道题', icon: '✅', metric: 'correct_count', requirement: 50, sort: 202 },
      { name: '百发百中', description: '答对100道题', icon: '💯', metric: 'correct_count', requirement: 100, sort: 203 },
      { name: '答题达人', description: '答对300道题', icon: '🏅', metric: 'correct_count', requirement: 300, sort: 204 },

      // 星星
      { name: '星星萌芽', description: '获得10颗星星', icon: '⭐', metric: 'stars', requirement: 10, sort: 301 },
      { name: '星星收藏家', description: '获得50颗星星', icon: '✨', metric: 'stars', requirement: 50, sort: 302 },
      { name: '星光闪闪', description: '获得150颗星星', icon: '🌠', metric: 'stars', requirement: 150, sort: 303 },
      { name: '银河行者', description: '获得500颗星星', icon: '🌌', metric: 'stars', requirement: 500, sort: 304 },

      // 连续打卡
      { name: '坚持起步', description: '连续打卡3天', icon: '🔥', metric: 'streak', requirement: 3, sort: 401 },
      { name: '坚持小达人', description: '连续打卡7天', icon: '💪', metric: 'streak', requirement: 7, sort: 402 },
      { name: '毅力之星', description: '连续打卡15天', icon: '⚡', metric: 'streak', requirement: 15, sort: 403 },
      { name: '毅力王者', description: '连续打卡30天', icon: '🏋️', metric: 'streak', requirement: 30, sort: 404 },

      // 汉字
      { name: '识字启蒙', description: '掌握5个汉字', icon: '✍️', metric: 'char_mastered', requirement: 5, sort: 501 },
      { name: '识字小能手', description: '掌握20个汉字', icon: '✏️', metric: 'char_mastered', requirement: 20, sort: 502 },
      { name: '汉字达人', description: '掌握50个汉字', icon: '📕', metric: 'char_mastered', requirement: 50, sort: 503 },
      { name: '汉字大师', description: '掌握100个汉字', icon: '🖌️', metric: 'char_mastered', requirement: 100, sort: 504 },

      // 英语单词
      { name: '单词新秀', description: '掌握10个单词', icon: '🔤', metric: 'english_mastered', requirement: 10, sort: 601 },
      { name: '单词达人', description: '掌握30个单词', icon: '🅰️', metric: 'english_mastered', requirement: 30, sort: 602 },
      { name: '单词高手', description: '掌握80个单词', icon: '🗣️', metric: 'english_mastered', requirement: 80, sort: 603 },

      // 数学
      { name: '数学起步', description: '答对10道数学题', icon: '➕', metric: 'math_correct', requirement: 10, sort: 701 },
      { name: '数感小达人', description: '答对40道数学题', icon: '🔢', metric: 'math_correct', requirement: 40, sort: 702 },
      { name: '数学小天才', description: '答对100道数学题', icon: '🧮', metric: 'math_correct', requirement: 100, sort: 703 },

      // 绘本阅读
      { name: '绘本启蒙', description: '读完第一本绘本', icon: '🐰', metric: 'books_read', requirement: 1, sort: 801 },
      { name: '绘本小书虫', description: '读完5本绘本', icon: '📚', metric: 'books_read', requirement: 5, sort: 802 },
      { name: '故事大王', description: '读完12本绘本', icon: '🦊', metric: 'books_read', requirement: 12, sort: 803 },

      // 中文阅读
      { name: '阅读启蒙', description: '完成3篇中文阅读', icon: '📰', metric: 'chinese_mastered', requirement: 3, sort: 901 },
      { name: '阅读小达人', description: '完成10篇中文阅读', icon: '📖', metric: 'chinese_mastered', requirement: 10, sort: 902 },

      // 复习精通（记忆等级达到"精通"）
      { name: '温故知新', description: '5个内容复习到精通', icon: '🔁', metric: 'review_mastered', requirement: 5, sort: 1001 },
      { name: '记忆达人', description: '20个内容复习到精通', icon: '🧠', metric: 'review_mastered', requirement: 20, sort: 1002 },

      // 学习天数
      { name: '出勤小星', description: '累计5天来学习', icon: '📅', metric: 'days_active', requirement: 5, sort: 1101 },
      { name: '风雨无阻', description: '累计20天来学习', icon: '☔', metric: 'days_active', requirement: 20, sort: 1102 },

      // 学习时长
      { name: '专注萌芽', description: '累计学习10分钟', icon: '⏱️', metric: 'study_minutes', requirement: 10, sort: 1201 },
      { name: '专注之星', description: '累计学习60分钟', icon: '🕐', metric: 'study_minutes', requirement: 60, sort: 1202 },
      { name: '沉浸学霸', description: '累计学习300分钟', icon: '⌛', metric: 'study_minutes', requirement: 300, sort: 1203 },
    ];

    const findBadge = db.prepare('SELECT id FROM badges WHERE name = ?');
    const upd = db.prepare('UPDATE badges SET description = ?, icon = ?, requirement = ?, metric = ?, sort = ? WHERE id = ?');
    const ins = db.prepare('INSERT INTO badges (name, description, icon, requirement, metric, sort) VALUES (?, ?, ?, ?, ?, ?)');
    let added = 0;
    let synced = 0;
    for (const b of LIBRARY) {
      const row = findBadge.get(b.name);
      if (row) {
        upd.run(b.description, b.icon, b.requirement, b.metric, b.sort, row.id);
        synced++;
      } else {
        ins.run(b.name, b.description, b.icon, b.requirement, b.metric, b.sort);
        added++;
      }
    }
    console.log(`   徽章库：新增 ${added} 枚，同步 ${synced} 枚，共 ${LIBRARY.length} 枚`);
  },

  // 汉字配图补齐：字库里约 900 个字没有 emoji，界面上全部退化成同一个 ✨，与字义无关，
  // 孩子失去一条重要的理解线索。这里按「精修表 + 字义关键词规则」补齐，
  // 只填空白的，绝不覆盖已有的人工精修数据。
  'enrich-character-emoji': () => {
    const rows = db
      .prepare("SELECT id, hanzi, meaning, words FROM characters WHERE emoji IS NULL OR emoji = ''")
      .all();
    const upd = db.prepare('UPDATE characters SET emoji = ? WHERE id = ?');
    let filled = 0;
    for (const row of rows) {
      const e = pickEmoji(row);
      if (e) {
        upd.run(e, row.id);
        filled++;
      }
    }
    console.log(`   汉字配图：需补 ${rows.length} 个，已补 ${filled} 个`);
  },

  // 汉字配图纠错：早期按关键词自动配图时存在语义错配，典型如
  // "水蜜桃"被"水"规则配成水滴💧、"墨水"配成水滴、"如果"被"果"配成植物🌿。
  // 这里按字义为已知错配的字重新指定配图（仅覆盖列出的字）。
  'fix-character-emoji-mismatch': () => {
    const FIX = {
      桃: '🍑', 梨: '🍐', 橘: '🍊', 苹: '🍎', 蕉: '🍌', 葡: '🍇', 萄: '🍇',
      园: '🏞️', 绩: '🏆', 结: '🪢', 如: '📝',
      饺: '🥟', 墨: '🖋️', 胶: '🧴', 岛: '🏝️', 滩: '🏖️', 洲: '🏝️', 峡: '⛰️',
      稻: '🌾', 净: '🧼', 脏: '🧹', 边: '↔️', 干: '🏜️',
      波: '🌊', 浪: '🌊', 莲: '🪷', 荷: '🪷', 桶: '🪣', 深: '📏', 浅: '📏',
    };
    const upd = db.prepare('UPDATE characters SET emoji = ? WHERE hanzi = ?');
    let n = 0;
    for (const [hanzi, emoji] of Object.entries(FIX)) {
      n += upd.run(emoji, hanzi).changes;
    }
    console.log(`   汉字配图纠错：更新 ${n} 个字`);
  },

  // 汉字配图（第二轮）：补齐上一轮规则未覆盖的虚词与抽象字，目标 100% 无空白
  'enrich-character-emoji-v2': () => {
    const rows = db
      .prepare("SELECT id, hanzi, meaning, words FROM characters WHERE emoji IS NULL OR emoji = ''")
      .all();
    const upd = db.prepare('UPDATE characters SET emoji = ? WHERE id = ?');
    let filled = 0;
    for (const row of rows) {
      const e = pickEmoji(row);
      if (e) { upd.run(e, row.id); filled++; }
    }
    console.log(`   汉字配图(第二轮)：需补 ${rows.length} 个，已补 ${filled} 个`);
  },

  // 汉字配图（第三轮）：修正 RULES 误配 + 弱配图
  // 流 被"人流"等关键词误配成站姿小人🧍 → 应为流水💧；
  // 朋/孩/亲/民/兵 被配成家庭合影👨‍👩‍👧，改为更准确的图。
  'fix-character-emoji-v3': () => {
    const FIX = { 流: '💧', 朋: '👫', 孩: '👧', 亲: '👪', 民: '👥', 兵: '🪖' };
    const upd = db.prepare('UPDATE characters SET emoji = ? WHERE hanzi = ?');
    let n = 0;
    for (const [hanzi, emoji] of Object.entries(FIX)) n += upd.run(emoji, hanzi).changes;
    console.log(`   汉字配图(第三轮)：更新 ${n} 个字`);
  },

  // 修正错配组词：组词必须包含本字
  // 预 的组词曾含"准备"（不含预）；随 的组词曾含"跟着"（不含随）
  'fix-character-words': () => {
    const FIX = { 预: '预习,预报,预计', 随: '随便,随时,随和' };
    const upd = db.prepare('UPDATE characters SET words = ? WHERE hanzi = ?');
    let n = 0;
    for (const [hanzi, words] of Object.entries(FIX)) n += upd.run(words, hanzi).changes;
    console.log(`   汉字组词修正：更新 ${n} 个字`);
  },

  // 汉字配图（第四轮）：修正 RULES 误配且 CURATED 无法覆盖（因非空）的字
  // 汗 被误配成站姿小人🧍 → 汗珠💧；炒 被误配成草本🌿 → 炒锅🍳；
  // 泪 用眼睛👁️ 偏弱 → 泪滴💧；弟 旧 RULES 写入🧒 应改回 CURATED 的👶(幼弟)。
  'fix-character-emoji-v4': () => {
    const FIX = { 汗: '💧', 泪: '💧', 炒: '🍳', 弟: '👶' };
    const upd = db.prepare('UPDATE characters SET emoji = ? WHERE hanzi = ?');
    let n = 0;
    for (const [hanzi, emoji] of Object.entries(FIX)) n += upd.run(emoji, hanzi).changes;
    console.log(`   汉字配图(第四轮)：更新 ${n} 个字`);
  },
};

function migrate() {
  const applied = new Set(db.prepare('SELECT name FROM migrations').all().map(r => r.name));
  for (const [name, fn] of Object.entries(MIGRATIONS)) {
    if (applied.has(name)) continue;
    fn();
    db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run(name, nowLocal());
    console.log(`✅ 迁移已应用: ${name}`);
  }
}

// ==================== Seed Data ====================
function seed() {
  // 检查是否已有种子数据
  const charCount = db.prepare('SELECT COUNT(*) as c FROM characters').get().c;
  if (charCount > 0) return;

  // --- 汉字（1000字，20级，每级50个；来源：人教版识字表，由易到难）---
  const insertChar = db.prepare('INSERT INTO characters (hanzi, pinyin, meaning, stroke_count, level, emoji, words) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const c of CHARACTERS) {
    insertChar.run(c.hanzi, c.pinyin, c.meaning, c.stroke_count, c.level, c.emoji, c.words);
  }
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
    // options: ['>', '<'] 索引 0 = '>', 1 = '<'
    const answer = a > b ? 0 : (a < b ? 1 : -1);
    if (answer >= 0) {
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
      b = Math.floor(Math.random() * (a - 1)) + 1; // b < a，保证答案 >= 1
      ans = a - b;
    }
    // 生成两个互不相同的干扰项：一个比答案大，一个比答案小（不够小则取更大的数）
    const wrong1 = ans + Math.floor(Math.random() * 3) + 1;
    let wrong2 = ans - Math.floor(Math.random() * 3) - 1;
    if (wrong2 < 0) wrong2 = ans + Math.floor(Math.random() * 3) + 4;
    const options = dedupeOptions([ans, wrong1, wrong2]).sort(() => Math.random() - 0.5);
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
  const existWord = db.prepare('SELECT id FROM words WHERE english = ?');
  moreWords.forEach(w => {
    // 同一单词只允许存在一个分类，否则答题选项里会出现两个一模一样的单词
    if (existWord.get(w.english)) return;
    insertWord.run(w.english, w.chinese, w.category, w.emoji);
  });
  console.log('✅ 扩充单词分类完成（水果/家具/球类/交通/衣物）');
}

// ==================== 英语模块：年龄段 + 主题分类 + 单词（含中文讲解） ====================
// 与汉字一样，以 english.generated.js 为唯一事实源：每次启动对齐一遍（幂等），
// 改词库只改数据文件。单词按 english 唯一，绝不多行插入（否则 4 选 1 会出现两个相同选项），
// 一个词属于多个主题由 word_category 映射承载。
function seedEnglish() {
  // 1) 主题分类：按 key 幂等 upsert（手写 upsert，不依赖 SQLite 的 ON CONFLICT 版本）
  const findCat = db.prepare('SELECT id FROM english_categories WHERE key = ?');
  const insertCat = db.prepare(
    'INSERT INTO english_categories (key, age_group, name_cn, name_en, icon, sort) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const updateCat = db.prepare(
    'UPDATE english_categories SET age_group = ?, name_cn = ?, name_en = ?, icon = ?, sort = ? WHERE id = ?'
  );
  for (const c of CATEGORIES) {
    const row = findCat.get(c.key);
    if (row) updateCat.run(c.age, c.name_cn, c.name_en, c.icon, c.sort, row.id);
    else insertCat.run(c.key, c.age, c.name_cn, c.name_en, c.icon, c.sort);
  }
  const catIdByKey = new Map(db.prepare('SELECT id, key FROM english_categories').all().map((r) => [r.key, r.id]));
  const catNameById = new Map(db.prepare('SELECT id, name_cn FROM english_categories').all().map((r) => [r.id, r.name_cn]));

  // 2) 单词：按 english 唯一 upsert
  const findWord = db.prepare('SELECT id FROM words WHERE english = ?');
  const insertWord = db.prepare(
    'INSERT INTO words (english, chinese, category, emoji, meaning, example_en, example_cn, phonetic, phonetic_tips) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const updateWord = db.prepare(
    'UPDATE words SET chinese = ?, emoji = ?, meaning = ?, example_en = ?, example_cn = ?, phonetic = ?, phonetic_tips = ? WHERE id = ?'
  );
  const linkCat = db.prepare('INSERT OR IGNORE INTO word_category (word_id, category_id, sort) VALUES (?, ?, ?)');

  let added = 0, updated = 0;
  for (const w of ENGLISH_WORDS) {
    // 主分类只用于老的 /courses/words?category= 兼容；已存在的行保留原 category 不动
    const primaryName = catNameById.get(catIdByKey.get(w.cats[0])) || w.cats[0];
    // 音标与音标讲解（由 CMU 词典生成，见 gen_phonetics.mjs）
    const ph = PHONETICS[w.english];
    const ipa = ph?.ipa || '';
    const tipsJson = ph?.tips?.length ? JSON.stringify(ph.tips) : '';
    const row = findWord.get(w.english);
    let wordId;
    if (row) {
      wordId = row.id;
      updateWord.run(w.chinese, w.emoji, w.meaning, w.example_en, w.example_cn, ipa, tipsJson, wordId);
      updated++;
    } else {
      const info = insertWord.run(w.english, w.chinese, primaryName, w.emoji, w.meaning, w.example_en, w.example_cn, ipa, tipsJson);
      wordId = Number(info.lastInsertRowid);
      added++;
    }
    w.cats.forEach((key, i) => {
      const cid = catIdByKey.get(key);
      if (cid) linkCat.run(wordId, cid, i + 1);
    });
  }
  console.log(`   英语词库：新增 ${added} 词，同步 ${updated} 词（共 ${ENGLISH_WORDS.length} 词 / ${CATEGORIES.length} 主题 / ${AGE_GROUPS.length} 年龄段）`);

  // 3) 断点续学 scope 迁移：旧的「中文分类名」→ 新的 `cat:<id>`，保住孩子已学到的位置。
  //    只对名字能对上的分类迁移；对不上的旧 scope 原样保留（新页面用新 key，互不干扰）。
  const oldScopes = db
    .prepare("SELECT DISTINCT scope FROM learning_state WHERE module = 'english' AND scope NOT LIKE 'cat:%'")
    .all();
  let moved = 0;
  for (const { scope } of oldScopes) {
    const cat = db.prepare('SELECT id FROM english_categories WHERE name_cn = ? ORDER BY id LIMIT 1').get(scope);
    if (!cat) continue;
    db.prepare('UPDATE OR IGNORE learning_state SET scope = ? WHERE module = ? AND scope = ?')
      .run(`cat:${cat.id}`, 'english', scope);
    // 撞上唯一约束（该孩子已存在新 scope）的行直接丢弃，避免留下两份进度
    db.prepare('DELETE FROM learning_state WHERE module = ? AND scope = ?').run('english', scope);
    moved++;
  }
  if (moved) console.log(`   断点续学 scope 迁移：${moved} 个旧分类位置已迁到新主题`);
}

// ==================== 数学课程体系（学段/知识点/测验/能力标签）====================
// 以 math.generated.js 为唯一事实源，每次启动幂等对齐（upsert by key），改数据只改数据文件。
function seedMath() {
  // 1) 能力维度
  const insTag = db.prepare('INSERT OR IGNORE INTO ability_tags (name, dimension) VALUES (?, ?)');
  ABILITY_TAGS.forEach((t) => insTag.run(t.name, t.dimension));

  // 2) 知识点 upsert（按 key 幂等）
  const findTopic = db.prepare('SELECT id FROM math_topics WHERE key = ?');
  const insTopic = db.prepare(
    'INSERT INTO math_topics (key, stage, board, unit, title, subtitle, emoji, level, sort, content, tags, prerequisites, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const updTopic = db.prepare(
    'UPDATE math_topics SET stage = ?, board = ?, unit = ?, title = ?, subtitle = ?, emoji = ?, level = ?, sort = ?, content = ?, tags = ?, prerequisites = ?, status = ? WHERE key = ?'
  );
  for (const t of ALL_TOPICS) {
    const row = findTopic.get(t.key);
    const content = JSON.stringify(t.content || []);
    const tags = JSON.stringify(t.tags || []);
    const prereqs = JSON.stringify(t.prereqKeys || []);
    const status = t.status || 'seeded';
    if (row) {
      updTopic.run(t.stage, t.board, t.unit, t.title, t.subtitle, t.emoji, t.level, t.sort, content, tags, prereqs, status, t.key);
    } else {
      insTopic.run(t.key, t.stage, t.board, t.unit, t.title, t.subtitle, t.emoji, t.level, t.sort, content, tags, prereqs, status);
    }
  }
  const idByKey = new Map(db.prepare('SELECT id, key FROM math_topics').all().map((r) => [r.key, r.id]));

  // 3) 依赖树：先清后插（按 topic 维度，幂等）
  const delPre = db.prepare('DELETE FROM topic_prerequisites WHERE topic_id = ?');
  const insPre = db.prepare('INSERT OR IGNORE INTO topic_prerequisites (topic_id, prereq_id) VALUES (?, ?)');
  for (const t of ALL_TOPICS) {
    const tid = idByKey.get(t.key);
    if (!tid) continue;
    delPre.run(tid);
    for (const pk of t.prereqKeys || []) {
      const pid = idByKey.get(pk);
      if (pid) insPre.run(tid, pid);
    }
  }

  // 4) 测验题 upsert（按 qkey 幂等，保证 progress 的 item_id 指向稳定 id）
  const findQ = db.prepare('SELECT id FROM math_quiz WHERE qkey = ?');
  const insQ = db.prepare(
    'INSERT INTO math_quiz (qkey, topic_id, question, options, answer, level, type) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const updQ = db.prepare(
    'UPDATE math_quiz SET topic_id = ?, question = ?, options = ?, answer = ?, level = ?, type = ? WHERE qkey = ?'
  );
  for (const q of QUIZZES) {
    const tid = idByKey.get(q.topicKey);
    if (!tid) continue;
    const row = findQ.get(q.qkey);
    const opts = JSON.stringify(q.options);
    if (row) {
      updQ.run(tid, q.question, opts, q.answer, q.level, q.type, q.qkey);
    } else {
      insQ.run(q.qkey, tid, q.question, opts, q.answer, q.level, q.type);
    }
  }
  console.log(`✅ 数学体系：知识点 ${ALL_TOPICS.length} 个（含占位），测验 ${QUIZZES.length} 题`);
}

// 默认演示账号（上线前请删除该函数的调用，或强制首次登录修改密码）
function seedDefaultUser() {
  const DEFAULT_USERNAME = 'admin';
  const DEFAULT_PASSWORD = '123456';
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(DEFAULT_USERNAME);
  if (exists) return;
  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(DEFAULT_USERNAME, hash);
  console.log(`✅ 默认账号已创建：${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}`);
}

// 先迁移再播种：迁移只修正存量数据，避免把新写入的本地时间再偏移一次
// 汉字配图自愈同步：每次启动补齐"仍为空"的配图。
// 做成启动同步（而非一次性迁移）是为了以后往 charEmoji.js 加规则能自动生效，
// 不必再新增迁移脚本；只填空的，绝不覆盖已有的人工数据。
function syncCharacterEmoji() {
  const rows = db
    .prepare("SELECT id, hanzi, meaning, words FROM characters WHERE emoji IS NULL OR emoji = ''")
    .all();
  if (rows.length === 0) return;
  const upd = db.prepare('UPDATE characters SET emoji = ? WHERE id = ?');
  let filled = 0;
  for (const row of rows) {
    const e = pickEmoji(row);
    if (e) { upd.run(e, row.id); filled++; }
  }
  if (filled) console.log(`   汉字配图自愈：补齐 ${filled} 个`);
}

migrate();
seed();
seedNewModules();
seedMoreWords();
seedEnglish();
seedMath();
seedDefaultUser();
syncCharacterEmoji();

export default db;
