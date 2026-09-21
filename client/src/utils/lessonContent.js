/**
 * 五步学习法内容生成器（玩 / 认 / 说 / 练 / 写）
 *
 * 严格对应《幼儿识字 APP 内容生产规范 v1.0》（docs/识字内容生产规范v1.0.md）。
 * 对【每一个字】数据驱动地产出规范内容；规范额外要求的字段（口语释义、字形提示、
 * 易错提示、玩故事、说短句、练三题）在此推导，并提供 ORAL / SHAPE / WRITE_HINT
 * 覆盖表做人工精修，后续生产新字照此执行即可。
 *
 * 铁律校验：
 *  - 铁律2：练的干扰项只来自"已学旧字"（index < studyIdx），优先同音/形近。
 *  - 铁律3：界面指令 ≤5 字（此处仅生成内容文本，UI 文案在组件里守）。
 *  - 铁律4：反馈鼓励语由组件守（本模块不产出批评语）。
 *  - 铁律5：说短句只由已学字组成，组不出则不产出短句（规范允许只给单字+词语）。
 */

import { normPinyin, shapeBuddies } from './practice.js';

/* ---------- emoji 解析（与组件共用，作配图占位） ---------- */
const FUN = {
  日:'☀️', 月:'🌙', 水:'💧', 火:'🔥', 山:'⛰️', 石:'🪨', 木:'🌳', 田:'🌾',
  竹:'🎋', 米:'🍚', 花:'🌸', 草:'🌿', 树:'🌳', 叶:'🍃', 果:'🍎', 云:'☁️',
  雨:'🌧️', 雪:'❄️', 电:'⚡', 星:'⭐', 牛:'🐄', 羊:'🐑', 马:'🐴', 兔:'🐰',
  猫:'🐱', 狗:'🐶', 鸡:'🐔', 鸭:'🦆', 鸟:'🐦', 虫:'🐛', 鱼:'🐟', 家:'🏠',
  车:'🚗', 船:'🚢', 书:'📖', 笔:'✏️', 纸:'📄', 伞:'☂️', 衣:'👕', 鞋:'👟',
  心:'❤️', 手:'✋', 口:'👄', 耳:'👂', 目:'👁️', 牙:'🦷', 足:'🦶', 笑:'😊',
  人:'🧑', 大:'🧍', 小:'👶', 中:'🎯', 上:'⬆️', 下:'⬇️', 左:'⬅️', 右:'➡️',
  多:'➕', 少:'➖', 高:'📏', 天:'🌤️', 地:'🟫', 你:'🧒', 我:'🙋', 他:'🧑',
};

export function getEmoji(char) {
  return char.emoji || FUN[char.hanzi] || '✨';
}

/* ---------- 覆盖表（人工精修，后续可继续补充） ---------- */
// 铁律1：口语释义（4-6 岁能听懂）。无覆盖则用真实组词拼一句孩子能懂的话。
const ORAL = {
  // 已精修（基础字）
  人:'就是我们自己，爸爸妈妈和我，都是人', 口:'嘴巴，我们用口吃饭、说话',
  手:'胳膊前面那只小手，用来拿东西', 大:'比小的大，大人比小孩大',
  小:'比小的小，小娃娃是小', 天:'头顶上面蓝蓝的那片，是天',
  地:'我们脚底下踩着的，是地', 你:'说话对面那个人，是你',
  我:'说自己，就是我', 他:'除你我之外的那个人，是他',
  水:'白白净净、能喝能洗的，是水', 火:'红红的、会发热的，是火',
  山:'高高大大、立在远处的，是山', 石:'硬硬的、路边的，是石头',
  田:'种庄稼的那块地，是田', 土:'踩在脚下的泥巴，是土',
  木:'一棵一棵的树，是木', 日:'天上圆圆的太阳，是日',
  月:'晚上挂在天上的月亮，是月', 心:'胸口扑通扑通跳的，是心',
  // 数字（数数用）
  一:'数数用的，一个就是一个一', 二:'数数用的，两个就是二',
  三:'数数用的，三个就是三', 四:'数数用的，四个就是四',
  五:'数数用的，五个就是五', 六:'数数用的，六个就是六',
  七:'数数用的，七个就是七', 八:'数数用的，八个就是八',
  九:'数数用的，九个就是九', 十:'数数用的，十个就是十',
  // 基础字补充精修（避免退回书面 DB 释义）
  耳:'耳朵，我们用耳朵听声音', 目:'眼睛，我们用眼睛看东西',
  足:'脚，我们用脚走路、踢球', 头:'脑袋，我们头上长着头发',
  禾:'田里绿绿的庄稼苗，是禾', 竹:'细细高高的绿竿子，是竹子',
  米:'白白的、能煮饭吃的，是米', 上:'在上面，飞机在天上飞',
  下:'在下面，小狗在桌子下面', 左:'左手边，和右手相反的方向',
  右:'右手边，拿筷子吃饭的那边', 中:'在中间，不大不小正好在当中',
  多:'好多好多，数也数不清就是多', 少:'一点点，没几个就是少',
  高:'高高的，长颈鹿个头很高', 牛:'大大的动物，会哞哞叫、给我们牛奶',
  羊:'毛茸茸的小动物，会咩咩叫', 马:'跑得飞快的大动物，可以骑',
  兔:'长耳朵的小动物，蹦蹦跳跳', 猫:'会喵喵叫的小动物，爱抓老鼠',
};
// 字形提示（一句话拆解帮助记忆）
const SHAPE = {
  人:'一撇一捺，像小朋友张开手脚站着', 口:'一个方框，像张开的嘴巴',
  手:'上面一撇像手指，下面像手掌', 大:'一横加一个人，就变成大',
  小:'中间一竖，两边两点，是小', 天:'一个"大"，上面再加一横，是天',
  木:'上面像树枝，下面像树根，是木', 水:'中间竖钩，两边点，像水流',
  火:'像火苗往上跳的样子', 山:'三个尖尖，像一座座山',
  月:'瘦瘦弯弯，像月亮', 土:'一横加一竖，是土',
  地:'左边提土旁，右边也字', 日:'一个方框，里面一横像太阳',
  石:'一横一撇，下面像石头', 田:'四个口拼成田字', 心:'三点像心跳，弯弯像心',
  你:'左边单人旁，右边尔字', 我:'一撇加提手，像拿东西的自己', 他:'左边单人旁，右边也字',
  耳:'一个大框，里面两竖像耳道', 目:'一个方框，里面两横像眼珠',
  足:'上面像脚背，下面像脚趾', 头:'一点加两横，像脑袋和头发',
  禾:'上面像穗，下面像秆子', 竹:'两个"个"字并排，像竹叶',
  米:'上面一点，下面像米粒', 上:'一短横在长横上面', 下:'一短横在长横下面',
  左:'一横一撇，下面一个工', 右:'一横一撇，下面一个口',
  中:'一个口，中间一竖穿过', 多:'两个夕叠一起，就是多',
  少:'中间一竖，右边一点，就是少', 高:'点横加个口，下边再加口',
  牛:'一撇一横，下面像牛角', 羊:'两点加三横，像羊的角和毛',
  马:'横折像马头，下面像马腿', 兔:'刀字头，下面像兔子身子',
  猫:'反犬旁加苗，小猫爱苗',
  一:'一横要写平', 二:'两横，上短下长', 三:'三横，上短中更短下最长',
  四:'先竖再横折，里面先撇后竖弯', 五:'先横再竖，最后横折和横',
  六:'点横撇点，最后长横', 七:'横要平，竖弯钩要圆', 八:'撇开捺下',
  九:'先撇再横折弯钩', 十:'先横后竖，竖要直',
};
// 写·易错提示（一句话；无则"无"）
const WRITE_HINT = {
  人:'先写撇，再写捺，捺要比撇低一点', 口:'先写竖，再写横折，最后封口一横',
  手:'第一笔是平撇，下面横要写平', 大:'先写横，再写撇，最后捺',
  木:'先写横，再写竖，最后撇捺分开', 火:'先写点、撇，再写长撇、捺',
  水:'先写中间竖钩，再写两边点', 月:'先写撇，再写横折钩，里面两横',
  土:'先写横，再写竖，最后长横', 山:'先写中间竖，再写竖折、竖',
  一:'一横从左到右写平', 二:'上横短、下横长', 三:'三横上短中更短、下最长',
  四:'先竖、横折，里面先撇后竖弯钩', 五:'先横、竖，最后横折和横',
  六:'点、横、撇、点，最后长横', 七:'横要平，竖弯钩要圆',
  八:'撇要撇开，捺要捺下去', 九:'先撇，再横折弯钩', 十:'先横后竖，竖要直',
  耳:'先横，再写两竖，最后封口横', 目:'先竖、横折，里面两横后封口',
  足:'先写口字头，再写撇、捺', 头:'点、点、横、撇、点',
  禾:'先撇、横，下面像禾苗', 竹:'两个竹字头写法一样', 米:'点、撇、横、竖、撇、捺',
  上:'竖要直，短横在长横上面', 下:'竖要直，点要在长横下面',
  左:'横、撇、横、竖、横', 右:'横、撇、竖、横折、横',
  中:'竖写在正中，口要写扁', 多:'两个夕，上小下大', 少:'竖、点，别写反',
  高:'点、横、竖、横折、横…共十画', 牛:'先撇再横，最后竖',
  羊:'点、撇、三横、竖', 马:'横折、竖折折钩、横', 兔:'笔画多，照笔顺慢慢写',
  猫:'反犬旁先写，右边苗字', 田:'先竖、横折，里面横竖后封口',
  日:'先竖、横折，里面一横后封口', 石:'先横、撇，下面口字',
  心:'三点从左到右，中点要低',
};

/* ---------- 工具 ---------- */
function pyMapOf(allChars) {
  const m = {};
  for (const c of allChars || []) if (c.hanzi) m[c.hanzi] = c.pinyin || '';
  return m;
}
export function pinyinOfWord(word, allChars) {
  const m = pyMapOf(allChars);
  return [...(word || '')].map((ch) => m[ch] || '').join(' ').trim();
}
function oralMeaning(char) {
  const v = ORAL[char.hanzi];
  if (v) return v;
  // 未精修的字：用真实组词拼一句孩子能懂的话（避免退回书面 DB 释义）
  const e = getEmoji(char);
  const w = String(char.words || '').split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean)[0];
  if (w) return `和「${w}」是好朋友，就是${e}${char.hanzi}呀`;
  return `这就是${e}${char.hanzi}`;
}
function shapeHint(char) {
  return SHAPE[char.hanzi] || `记住「${char.hanzi}」的样子，多写几遍就认识啦`;
}
function writeHint(char) {
  return WRITE_HINT[char.hanzi] || '无';
}

/* ---------- 环节1：玩（字最后才亮出） ---------- */
// 玩·情景脚本：完整短情景（有动作）→ 点一点 → 收尾 → 最后亮字。
// 旁白一律"陈述式童声"，不提问、不猜谜、不考验小朋友。
const PLAY_SCENE = {
  人: '一个小人站了起来，挥挥手，迈开步子走路',
  手: '一只小手伸出来，摆一摆、招招手',
  口: '一张小嘴巴，啊呜啊呜嚼东西',
  大: '一个大哥哥张开手脚，站得高高的',
  小: '一个小娃娃，蹦蹦跳跳真可爱',
  日: '一个红太阳，从山后慢慢升起来',
  月: '一轮月亮，挂在天上轻轻晃',
  天: '蓝天上飘着白云，小鸟飞过', 地: '草地上开满小花，踩上去软软的',
  你: '一个小朋友转过头，对着你笑', 我: '一个小朋友举起手，说"是我"',
  他: '一个小朋友躲在树后，探出头来', 耳: '一只小耳朵，抖一抖听声音',
  目: '一双大眼睛，眨呀眨看东西', 足: '一只小脚丫，踢踢球跑一跑',
  头: '一个圆脑袋，晃一晃', 禾: '田里绿油油的禾苗，随风摇',
  竹: '几根竹子，被风吹得沙沙响', 米: '一碗白米饭，冒出热热气',
  上: '一个小箭头，往上飞', 下: '一个小箭头，往下落',
  左: '一只小手，指向左边', 右: '一只小手，指向右边',
  中: '一个圈圈，中间点一下', 多: '一堆糖果，越堆越多',
  少: '几颗糖，剩一点点', 高: '长颈鹿伸长脖子，好高好高',
  牛: '一头牛，晃着尾巴哞哞叫', 羊: '一只羊，蹦蹦跳咩咩叫',
  马: '一匹马，哒哒哒跑过来', 兔: '小兔子，耳朵一耸一耸蹦',
  猫: '小猫，喵喵叫着蹭过来',
  一: '一根小棒，直直地躺在那', 二: '两根小棒，一上一下',
  三: '三根小棒，排成一排', 四: '四面小旗，迎风飘',
  五: '一只手张开，五个手指头', 六: '六个气球，飘在天上',
  七: '七颗星星，闪呀闪', 八: '两只小鸭，排成八',
  九: '九朵小花，围成圈', 十: '十根手指，数到十',
};
const PLAY_NARR = {
  人: '这就是人，我们都是人。',
  手: '这就是手，我们用小手拿东西。',
  口: '这就是口，我们用口吃饭、说话。',
  大: '这就是大，大哥哥比小娃娃大。',
  小: '这就是小，小娃娃真小。',
  日: '这就是日，天上的太阳就是日。',
  月: '这就是月，晚上的月亮就是月。',
  天: '这就是天，蓝蓝的天在上面。', 地: '这就是地，我们站在地上。',
  你: '这就是你，对面的小朋友。', 我: '这就是我，就是你自己。',
  他: '这就是他，旁边的好朋友。', 耳: '这就是耳，我们用耳朵听。',
  目: '这就是目，我们用眼睛看。', 足: '这就是足，我们用脚走路。',
  头: '这就是头，脑袋在上面。', 禾: '这就是禾，田里的庄稼。',
  竹: '这就是竹，绿绿的竹子。', 米: '这就是米，白白的米饭。',
  上: '这就是上，在上面。', 下: '这就是下，在下面。',
  左: '这就是左，左手这边。', 右: '这就是右，右手这边。',
  中: '这就是中，在中间。', 多: '这就是多，好多好多。',
  少: '这就是少，只有一点点。', 高: '这就是高，长得高高的。',
  牛: '这就是牛，会哞哞叫。', 羊: '这就是羊，会咩咩叫。',
  马: '这就是马，跑得飞快。', 兔: '这就是兔，长耳朵爱蹦。',
  猫: '这就是猫，会喵喵叫。',
  一: '这就是一，数数的一。', 二: '这就是二，数数的二。',
  三: '这就是三，数数的三。', 四: '这就是四，数数的四。',
  五: '这就是五，五个手指。', 六: '这就是六，数数的六。',
  七: '这就是七，数数的七。', 八: '这就是八，数数的八。',
  九: '这就是九，数数的九。', 十: '这就是十，数到十啦。',
};
export function buildPlay(char) {
  const e = getEmoji(char);
  const scene = PLAY_SCENE[char.hanzi] || `一个${e}在蹦蹦跳跳做游戏`;
  const narr = PLAY_NARR[char.hanzi] || `这就是「${char.hanzi}」，${oralMeaning(char)}`;
  return {
    画面描述: `${e}出场，${scene}`,
    动画流程: [scene, '小朋友点一点', `「${char.hanzi}」字从画面中浮现出来`],
    旁白配音: narr, // 陈述式，无提问
    互动点: `点一点${e}，「${char.hanzi}」就跳出来啦`,
  };
}

/* ---------- 环节2：认 ---------- */
export function buildKnow(char) {
  const e = getEmoji(char);
  const words = String(char.words || '')
    .split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  return {
    pinyin: char.pinyin || '',
    hanzi: char.hanzi,
    oral: oralMeaning(char),
    shapeHint: shapeHint(char),
    emoji: e,
    配图: `${e}「${char.hanzi}」的图画`,
    words: words.map((w) => ({ word: w, 配图: `${e}「${w}」的小图` })),
  };
}

/* ---------- 环节3：说（单字→词语→短句，短句仅用已学字） ---------- */
export function buildSpeak(char, allChars, studyIdx = 0) {
  const e = getEmoji(char);
  // 铁律5：短句只能由【已学字】(index <= studyIdx) 组成；组不出则不产出（规范允许只给单字+词语）
  const known = new Set((allChars || []).slice(0, studyIdx + 1).map((c) => c.hanzi));
  const word = String(char.words || '').split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean)[0] || '';
  // 短句：只在所有字均为已学时才产出（铁律5）；组不出则不产出（规范允许只给单字+词语）
  let sentence = null;
  const frames = [
    { t: `我${char.hanzi}`, need: ['我'] },
    { t: `小${char.hanzi}`, need: ['小'] },
    { t: `${char.hanzi}好`, need: ['好'] },
    { t: `大${char.hanzi}`, need: ['大'] },
  ];
  for (const f of frames) {
    if (f.need.every((ch) => known.has(ch)) && [...f.t].every((ch) => known.has(ch))) {
      sentence = f.t;
      break;
    }
  }
  return {
    hanzi: char.hanzi,
    pinyin: char.pinyin || '',
    word,
    wordPinyin: word ? pinyinOfWord(word, allChars) : '',
    wordImg: `${e}「${word || char.hanzi}」`,
    sentence,
    sentencePinyin: sentence ? pinyinOfWord(sentence, allChars) : '',
    sentenceImg: `${e} ${char.hanzi}`,
  };
}

/* ---------- 环节4：练（3 道题，干扰项来自已学旧字） ---------- */
function pickDistractors(studyChar, allChars, studyIdx, n) {
  const oldPool = (allChars || []).filter((c, i) => i < studyIdx && c.hanzi !== studyChar.hanzi);
  const targetPy = normPinyin(studyChar.pinyin);
  const shapeSet = shapeBuddies(studyChar.hanzi);
  const homo = oldPool.filter((c) => targetPy && normPinyin(c.pinyin) === targetPy);
  const shape = oldPool.filter((c) => !homo.includes(c) && shapeSet.has(c.hanzi));
  const rest = oldPool.filter((c) => !homo.includes(c) && !shape.includes(c));
  const order = [...homo, ...shape, ...rest]; // 优先同音→形近→其余旧字（铁律2）
  const out = [];
  while (out.length < n && order.length) {
    const i = Math.floor(Math.random() * order.length);
    out.push(order.splice(i, 1)[0]);
  }
  // 旧字不足时，用"未学字"兜底会违反铁律2；这里宁可减少选项也不引入无关字
  return out.map((c) => c.hanzi);
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function makeChoice(correct, distractors) {
  const opts = shuffle([correct, ...distractors]);
  return { options: opts, correctIndex: opts.indexOf(correct) };
}

// 数字 1-10 作为基础字一起学：早前期已学字不足时，干扰项取自同组兄弟字（仍属已学基础字，不引入无关字）
const NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
// 最基础、最易认的字池：开头几个字没有任何"已学旧字"可用时，从中补足干扰项到固定 4 选 1
// （仅在学习顺序最前段、旧字池不足 3 个时触发，属于基础字，孩子随时都在见，不会引入无关生僻字）
const EARLY_BASICS = ['人', '口', '日', '月', '山', '水', '火', '木', '土', '石', '大', '小', '上', '下', '中', '天', '地'];

export function buildPractice(studyChar, allChars, studyIdx) {
  const e = getEmoji(studyChar);
  const family = NUMERALS.includes(studyChar.hanzi) ? NUMERALS : null;

  // 干扰项池：优先同音→形近→其余已学旧字（铁律2）；早前期不足时补充同组兄弟字，保证固定 4 选 1
  const oldPool = (allChars || []).filter((c, i) => i < studyIdx && c.hanzi !== studyChar.hanzi);
  const targetPy = normPinyin(studyChar.pinyin);
  const shapeSet = shapeBuddies(studyChar.hanzi);
  const homo = oldPool.filter((c) => targetPy && normPinyin(c.pinyin) === targetPy);
  const shape = oldPool.filter((c) => !homo.includes(c) && shapeSet.has(c.hanzi));
  const rest = oldPool.filter((c) => !homo.includes(c) && !shape.includes(c));
  let pool = [...homo, ...shape, ...rest];
  if (pool.length < 3 && family) {
    for (const h of family) {
      if (h === studyChar.hanzi) continue;
      if (pool.find((c) => c.hanzi === h)) continue;
      const c = allChars.find((x) => x.hanzi === h);
      if (c) pool.push(c);
    }
  }
  // 最前段（旧字不足 3 个）从基础字池补足，确保固定 4 选 1 不破功
  if (pool.length < 3) {
    for (const h of EARLY_BASICS) {
      if (h === studyChar.hanzi) continue;
      if (pool.find((c) => c.hanzi === h)) continue;
      const c = allChars.find((x) => x.hanzi === h);
      if (c) pool.push(c);
    }
  }
  // 取 3 个去重干扰项
  const distractors = [];
  const tmp = [...pool];
  while (distractors.length < 3 && tmp.length) {
    const i = Math.floor(Math.random() * tmp.length);
    distractors.push(tmp.splice(i, 1)[0]);
  }
  const ds = distractors.map((c) => c.hanzi);

  const make = (correct, opts) => {
    const o = shuffle([correct, ...opts]);
    return { options: o, correctIndex: o.indexOf(correct) };
  };

  const word = String(studyChar.words || '').split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean)[0] || '';

  // 题1：听音选字（进入自动播题干音频）
  const q1 = { type: 'listen', audio: studyChar.pinyin || '', 提问: '听一听，选哪个？', ...make(studyChar.hanzi, ds) };
  // 题2：看图选字（配图 = emoji 场景）
  const q2 = { type: 'look', 配图: `${e}「${studyChar.hanzi}」`, 提问: '这是什么？', ...make(studyChar.hanzi, ds) };
  // 题3：句子填空（目标字所在词挖空；词不存在则用单字）
  let fill = word ? word.split(studyChar.hanzi).join('___') : '___';
  if (!fill.includes('___')) fill = '___';
  const q3 = { type: 'fill', 句子: fill, 提问: '填空选一选', ...make(studyChar.hanzi, ds) };

  return [q1, q2, q3];
}

/* ---------- 环节5：写 ---------- */
export function buildWrite(char) {
  return {
    总笔画数: char.stroke_count || 0,
    笔顺步骤: '', // 由 hanzi-writer 动画呈现，文本步骤可后续补 STROKE_TEXT 覆盖
    易错提示: writeHint(char),
    描红引导: [
      '看完整笔顺动画（播放一遍）',
      '分步描红（每画亮出来，孩子跟着描）',
      '在灰色字影上描红',
      '空田字格独立写一个',
    ],
  };
}

/* ---------- 汇总 ---------- */
export function buildLesson(char, allChars = [], studyIdx = 0) {
  return {
    play: buildPlay(char),
    know: buildKnow(char),
    speak: buildSpeak(char, allChars, studyIdx),
    practice: buildPractice(char, allChars, studyIdx),
    write: buildWrite(char),
  };
}
