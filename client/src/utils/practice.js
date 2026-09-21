/**
 * 识字「练」板块组题规则（主线模式）
 *
 * 规则来源（产品需求）：
 *  1) 只有主线已解锁（index <= studyIdx）的汉字才可用于【练】习题与【写】练字；
 *     序号 studyIdx+2 及以后（如第 11 号起）未解锁汉字禁止进入题库。
 *  2) 组题比例：20% 本次新学汉字（必为正确项）+ 80% 之前已解锁旧汉字作干扰项。
 *     选项固定 4 个 ⇒ 正确项 1（新学）+ 干扰项 3（旧字），即约 25% / 75%，符合规则。
 *  3) 干扰项优先选【同音字】（声调不敏感），避免使用读音字形毫无关联的汉字；
 *     （形近字优先需要字形/部首数据库，无数据时退化为「其余旧字」，见 buildPractice 说明）
 *  4) 题干尽量用生活化短句（从组词里挑一个生活词造句），不使用词典式生硬释义。
 */

/** 拼音归一：去声调符号/数字，仅留字母，用于同音字匹配（声调不敏感） */
export function normPinyin(py = '') {
  return String(py || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // 去掉声调变音符
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
}

/** 从组词里挑一个包含目标字的生活词（造生活化题干用） */
function pickWord(char) {
  const list = String(char.words || '')
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!list.length) return '';
  return list.find((w) => w.includes(char.hanzi)) || list[0];
}

/**
 * 形近字补充表（人工精选的常见易混字对，仅用于干扰项排序，无字形数据库时的轻量替代）。
 * 规则要求干扰项「优先形近字、同音字，避免毫不相关的字」。无部首/部件数据库时，
 * 这里用一份高可信度的形近映射兜底；如需覆盖更多字，直接在此对象里补充即可。
 */
const SHAPE_BUDDIES = {
  日: '目白旦田曰', 目: '日月且直', 白: '日百自', 田: '由甲申电日目',
  由: '田甲申电', 甲: '田由申电', 申: '田由甲电', 电: '田由甲申',
  木: '禾本末未术林森', 禾: '木和秋', 本: '木末未', 末: '本未木', 未: '本末木',
  人: '入八个大', 入: '人八', 八: '人入父', 大: '天太犬人夫', 天: '大夫无大',
  太: '大犬', 犬: '大太哭', 夫: '天大', 夭: '天大',
  土: '士王干', 士: '土王', 王: '玉主土工', 玉: '王主', 主: '王玉住',
  干: '千士土于', 千: '干午禾', 工: '王土功',
  月: '用目朋', 用: '月甩', 力: '刀办劝', 刀: '力刃切', 办: '力为',
  己: '已巳', 已: '己巳', 巳: '己已', 乙: '己已',
  女: '母好妹', 母: '女每', 见: '贝觉观', 贝: '见页财', 页: '贝顶顺',
  石: '右岩泵', 右: '石左有', 左: '右在', 在: '左存',
  几: '儿机凡', 儿: '几元', 元: '儿园远', 凡: '几机',
  午: '牛干许', 牛: '午生件', 方: '万放房', 万: '方力',
  自: '白目咱', 百: '白万', 瓜: '爪狐孤', 爪: '瓜抓',
  鸟: '乌鸡鸭', 乌: '鸟鸣', 马: '鸟妈码', 云: '去会动', 去: '云丢',
  厂: '广严', 广: '厂矿床', 今: '令含念', 令: '今冷铃',
  氏: '氐纸', 氐: '氏低', 低: '底纸',
};

/** 返回与目标字形近的字集合（来自 SHAPE_BUDDIES，互为形近） */
export function shapeBuddies(hanzi) {
  const v = SHAPE_BUDDIES[hanzi];
  if (!v) return new Set();
  return new Set(v.split('').filter((c) => c && c !== hanzi));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 生成一道【练】选择题。
 * @param {object} studyChar 当前正在学的汉字（必为正确项 = 本次新学汉字）
 * @param {object[]} chars   全部汉字（按主线顺序，index 即学习序号）
 * @param {number} studyIdx  当前学到序号（0 基）；index <= studyIdx 视为已解锁
 * @returns {{options:string[], correctIndex:number, question:string, isThin:boolean}}
 *          isThin=true 表示旧字不足、干扰项不满 3 个（如刚开始学的头几个字）。
 */
export function buildPractice(studyChar, chars, studyIdx) {
  if (!studyChar) return { options: [], correctIndex: 0, question: '', isThin: true };

  // 已解锁的旧字池：之前学过（index < studyIdx），且不是当前字
  const oldPool = (chars || []).filter(
    (c, i) => i < studyIdx && c.hanzi !== studyChar.hanzi
  );

  // 干扰项排序：①同音（声调不敏感）②形近（SHAPE_BUDDIES）③其余旧字。
  // 三者都不会超出「已解锁」范围；优先用相关联的字，避免读音字形毫不相关。
  const targetPy = normPinyin(studyChar.pinyin);
  const shapeSet = shapeBuddies(studyChar.hanzi);
  const homo = oldPool.filter((c) => targetPy && normPinyin(c.pinyin) === targetPy);
  const shape = oldPool.filter((c) => !homo.includes(c) && shapeSet.has(c.hanzi));
  const rest = oldPool.filter((c) => !homo.includes(c) && !shape.includes(c));

  const distractors = [];
  const take = (arr, n) => {
    while (distractors.length < n && arr.length) distractors.push(arr.shift());
  };
  take(homo, 3);
  take(shape, 3);
  take(rest, 3);

  // 正确项（新学字）+ 干扰项，洗牌后给出正确下标
  const opts = shuffle([...distractors, studyChar]);
  const correctIndex = opts.findIndex((o) => o.hanzi === studyChar.hanzi);

  // 生活化题干：优先用目标字的组词造句，避免词典式释义
  const word = pickWord(studyChar);
  let question;
  if (word) {
    question = `词语「${word}」里藏着的字，是下面哪一个？`;
  } else if (studyChar.meaning) {
    question = `（${studyChar.pinyin || ''}）猜一猜，${studyChar.meaning}说的是哪个字？`;
  } else {
    question = `读一读，下面哪个字是「${studyChar.hanzi}」？`;
  }

  return {
    options: opts.map((o) => o.hanzi),
    correctIndex,
    question,
    isThin: distractors.length < 3,
  };
}
