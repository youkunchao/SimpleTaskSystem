// 数学课程体系数据（唯一事实源）。
// 学前(2-3/3-4/4-5/5-6) + 一年级 已填充示例知识点与测验；
// 二~六年级仅建知识点骨架(标题/板块/前置)占位，留待填充内容与测验。
// 改词库只改本文件，db.js 的 seedMath() 每次启动幂等对齐。

// 学段/年级（统一成长主线顺序）：幼儿在前，小学在后
export const STAGES = [
  { key: '2-3', label: '2-3岁', phase: '幼儿', ageMin: 2, ageMax: 3 },
  { key: '3-4', label: '3-4岁', phase: '幼儿', ageMin: 3, ageMax: 4 },
  { key: '4-5', label: '4-5岁', phase: '幼儿', ageMin: 4, ageMax: 5 },
  { key: '5-6', label: '5-6岁', phase: '幼儿', ageMin: 5, ageMax: 6 },
  { key: 'grade1', label: '一年级', phase: '小学', grade: 1 },
  { key: 'grade2', label: '二年级', phase: '小学', grade: 2 },
  { key: 'grade3', label: '三年级', phase: '小学', grade: 3 },
  { key: 'grade4', label: '四年级', phase: '小学', grade: 4 },
  { key: 'grade5', label: '五年级', phase: '小学', grade: 5 },
  { key: 'grade6', label: '六年级', phase: '小学', grade: 6 },
];

export const BOARDS = ['数与代数', '图形与几何', '统计与概率', '数学思维'];

// 能力标签维度（雷达图维度）
export const ABILITY_TAGS = [
  { name: '数感', dimension: '数感' },
  { name: '计算熟练度', dimension: '计算熟练度' },
  { name: '逻辑思维', dimension: '逻辑思维' },
  { name: '几何空间', dimension: '几何空间' },
  { name: '统计推理', dimension: '统计推理' },
];

const BOARD_TAG = {
  数与代数: '计算熟练度',
  图形与几何: '几何空间',
  统计与概率: '统计推理',
  数学思维: '逻辑思维',
};

// ============ 已填充示例知识点（学前 + 一年级） ============
export const TOPICS = [
  // —— 2-3岁 ——
  {
    key: 't-2-3-size', stage: '2-3', board: '数与代数', unit: '量的感知', title: '比较大小多少', subtitle: '哪个大？哪个多？', emoji: '⚖️', level: 1, sort: 1,
    tags: ['数感'], prereqKeys: [],
    content: [
      { type: 'explain', text: '小朋友，看这两个苹果：一个大大大，一个小小的。我们叫它“大”和“小”。', emoji: '🍎' },
      { type: 'example', text: '把大的圈出来，小的指给妈妈看～ 大苹果甜甜的！', emoji: '😋' },
      { type: 'guide', text: '下面来玩比一比：点一点更大的那个吧！', emoji: '👆' },
    ],
  },
  {
    key: 't-2-3-shape', stage: '2-3', board: '图形与几何', unit: '图形认知', title: '认识基本图形', subtitle: '圆·方·三角', emoji: '🔺', level: 1, sort: 2,
    tags: ['几何空间'], prereqKeys: [],
    content: [
      { type: 'explain', text: '太阳是圆圆的🌞，饼干是方方的🍪，屋顶是尖尖的三角🔺。', emoji: '🌞' },
      { type: 'example', text: '圆圆没有角，方方四个角，三角三个角。', emoji: '🍪' },
      { type: 'guide', text: '下面考考你：点一点圆形！', emoji: '🔵' },
    ],
  },
  {
    key: 't-2-3-ab', stage: '2-3', board: '数学思维', unit: '模式规律', title: 'AB重复规律', subtitle: '红白红白…', emoji: '🔴', level: 1, sort: 3,
    tags: ['逻辑思维'], prereqKeys: [],
    content: [
      { type: 'explain', text: '看：🔴⚪🔴⚪ 一个红一个白，一直在重复，这就是规律！', emoji: '🔴' },
      { type: 'example', text: '接下来该是什么？🔴⚪🔴⚪？对，又是红！', emoji: '⚪' },
      { type: 'guide', text: '你来接着排：点出下一个颜色。', emoji: '🧩' },
    ],
  },
  // —— 3-4岁 ——
  {
    key: 't-3-4-count', stage: '3-4', board: '数与代数', unit: '数感', title: '1-10点数', subtitle: '手口一致数', emoji: '🔢', level: 1, sort: 1,
    tags: ['数感', '计算熟练度'], prereqKeys: [],
    content: [
      { type: 'explain', text: '伸出小手，点一个物件数一个：1、2、3… 不漏也不多。', emoji: '✋' },
      { type: 'example', text: '盘子里有几颗糖？🍬🍬🍬 数一数：1、2、3，三颗糖！', emoji: '🍬' },
      { type: 'guide', text: '数一数下面有几只小动物，选出正确数字。', emoji: '🐱' },
    ],
  },
  {
    key: 't-3-4-space', stage: '3-4', board: '图形与几何', unit: '空间方位', title: '上下里外', subtitle: '玩具在哪儿', emoji: '📦', level: 1, sort: 2,
    tags: ['几何空间'], prereqKeys: [],
    content: [
      { type: 'explain', text: '小鸟在树上（上面），小狗在桌子下（下面）。盒子里的球在“里”，外面的在“外”。', emoji: '🐦' },
      { type: 'example', text: '小猫躲在桌子下面，找找看～', emoji: '🐱' },
      { type: 'guide', text: '点一点“上面”的那一个。', emoji: '⬆️' },
    ],
  },
  {
    key: 't-3-4-abab', stage: '3-4', board: '数学思维', unit: '模式规律', title: 'ABAB循环', subtitle: '红白红白红白', emoji: '🌈', level: 1, sort: 3,
    tags: ['逻辑思维'], prereqKeys: ['t-2-3-ab'],
    content: [
      { type: 'explain', text: '上次是🔴⚪🔴⚪，现在更长：🔴⚪🔴⚪🔴⚪ 一直红白红白，叫ABAB。', emoji: '🌈' },
      { type: 'example', text: '数到第7个是什么颜色？红白红白红白红——是红！', emoji: '🔴' },
      { type: 'guide', text: '接着排下去，选出正确的下一个。', emoji: '🎯' },
    ],
  },
  // —— 4-5岁 ——
  {
    key: 't-4-5-split', stage: '4-5', board: '数与代数', unit: '数的分合', title: '10以内分与合', subtitle: '5可以分成2和3', emoji: '🧮', level: 1, sort: 1,
    tags: ['数感', '计算熟练度'], prereqKeys: ['t-3-4-count'],
    content: [
      { type: 'explain', text: '5颗糖，左手2颗，右手3颗，合起来还是5颗。5=2+3，也会5-2=3。', emoji: '🍬' },
      { type: 'example', text: '把4分成两份：可以是1和3，也可以是2和2。', emoji: '✌️' },
      { type: 'guide', text: '选一选：6可以分成哪两个数？', emoji: '➕' },
    ],
  },
  {
    key: 't-4-5-3d', stage: '4-5', board: '图形与几何', unit: '立体图形', title: '认识立体图形', subtitle: '球·正方体', emoji: '🧊', level: 1, sort: 2,
    tags: ['几何空间'], prereqKeys: [],
    content: [
      { type: 'explain', text: '皮球是圆滚滚的“球”⚽，积木方块是“正方体”🧊，能稳稳站着。', emoji: '⚽' },
      { type: 'example', text: '球会滚，正方体不会滚——推一推试试！', emoji: '🧊' },
      { type: 'guide', text: '下面哪个是正方体？点一点。', emoji: '🟦' },
    ],
  },
  {
    key: 't-4-5-aabb', stage: '4-5', board: '数学思维', unit: '模式规律', title: 'AABB/ABC模式', subtitle: '两大两小·三色循环', emoji: '🟥', level: 1, sort: 3,
    tags: ['逻辑思维'], prereqKeys: ['t-3-4-abab'],
    content: [
      { type: 'explain', text: '🟥🟥🟦🟦🟥🟥🟦🟦 两个红两个蓝，是AABB；🔴🟡🔵🔴🟡🔵 三色轮转是ABC。', emoji: '🟥' },
      { type: 'example', text: 'ABC模式下一个该什么色？红黄蓝红黄蓝——蓝！', emoji: '🔵' },
      { type: 'guide', text: '接着排，选出下一项。', emoji: '🧠' },
    ],
  },
  // —— 5-6岁 ——
  {
    key: 't-5-6-20', stage: '5-6', board: '数与代数', unit: '数感', title: '20以内点数', subtitle: '1到20顺数', emoji: '🌟', level: 1, sort: 1,
    tags: ['数感', '计算熟练度'], prereqKeys: ['t-4-5-split'],
    content: [
      { type: 'explain', text: '从1数到20：…18、19、20！数字越来越大。', emoji: '🔢' },
      { type: 'example', text: '数一数台阶：1、2、…、20，一共20级。', emoji: '🪜' },
      { type: 'guide', text: '选一选：19的下一个数是？', emoji: '🌟' },
    ],
  },
  {
    key: 't-5-6-leftright', stage: '5-6', board: '图形与几何', unit: '空间方位', title: '认识左右', subtitle: '左手右手', emoji: '👈', level: 1, sort: 2,
    tags: ['几何空间'], prereqKeys: ['t-3-4-space'],
    content: [
      { type: 'explain', text: '举起写字的手是右手✋，另一边是左手🤚。和你面对面时，左右是反的哦。', emoji: '✋' },
      { type: 'example', text: '用右手拿勺子，左手扶碗。', emoji: '🥄' },
      { type: 'guide', text: '点一点“右边”的小动物。', emoji: '➡️' },
    ],
  },
  {
    key: 't-5-6-balance', stage: '5-6', board: '数学思维', unit: '等量推理', title: '天平轻重', subtitle: '哪边更重', emoji: '⚖️', level: 1, sort: 3,
    tags: ['逻辑思维', '数感'], prereqKeys: ['t-4-5-aabb'],
    content: [
      { type: 'explain', text: '天平往下沉的那边更重。🍎🍎 比 🍎 重，因为多一个。', emoji: '⚖️' },
      { type: 'example', text: '一边放2块糖，一边放1块，2块那边下沉。', emoji: '🍬' },
      { type: 'guide', text: '看天平，选出更重的一边。', emoji: '🪙' },
    ],
  },
  // —— 一年级 ——
  {
    key: 't-g1-count20', stage: 'grade1', board: '数与代数', unit: '1-20各数', title: '1-20各数认识', subtitle: '基数与序数', emoji: '🔢', level: 1, sort: 1,
    tags: ['数感'], prereqKeys: ['t-5-6-20'],
    content: [
      { type: 'explain', text: '“3个苹果”里的3是基数（有多少个）；“第3名”的3是序数（排第几）。', emoji: '🍎' },
      { type: 'example', text: '队伍里从左数第2个小朋友，戴帽子🧢。', emoji: '🧢' },
      { type: 'guide', text: '选一选：从左数第3个是哪个？', emoji: '🚩' },
    ],
  },
  {
    key: 't-g1-add10', stage: 'grade1', board: '数与代数', unit: '10以内加减', title: '10以内加减法', subtitle: '合起来·去掉', emoji: '➕', level: 1, sort: 2,
    tags: ['计算熟练度', '数感'], prereqKeys: ['t-g1-count20'],
    content: [
      { type: 'explain', text: '加法是合起来：3+2=5（3颗再加2颗，一共5颗）。减法是去掉：5-2=3。', emoji: '🍬' },
      { type: 'example', text: '小明有4块糖，吃掉1块，还剩几块？4-1=3。', emoji: '🍭' },
      { type: 'guide', text: '算一算：6+3=？点出答案。', emoji: '➕' },
    ],
  },
  {
    key: 't-g1-3d', stage: 'grade1', board: '图形与几何', unit: '立体图形', title: '立体图形认识', subtitle: '长方体·圆柱·球', emoji: '📦', level: 1, sort: 3,
    tags: ['几何空间'], prereqKeys: [],
    content: [
      { type: 'explain', text: '长长方方是长方体📦，圆圆滚滚是球⚽，上下一样粗能滚是圆柱🥫。', emoji: '📦' },
      { type: 'example', text: '牙膏盒像长方体，易拉罐像圆柱。', emoji: '🥫' },
      { type: 'guide', text: '下面哪个是圆柱？点一点。', emoji: '🥫' },
    ],
  },
  {
    key: 't-g1-sort', stage: 'grade1', board: '统计与概率', unit: '分类统计', title: '简单分类统计', subtitle: '按颜色分一分', emoji: '🗂️', level: 1, sort: 4,
    tags: ['统计推理'], prereqKeys: [],
    content: [
      { type: 'explain', text: '把红色的放一起，蓝色的放一起，这叫“分类”。数一数每类有几个。', emoji: '🗂️' },
      { type: 'example', text: '盘子里🍎红🍎红🍇紫：红色2个，紫色1个。', emoji: '🔴' },
      { type: 'guide', text: '数一数红色的有几个？', emoji: '🔴' },
    ],
  },
  {
    key: 't-g1-sub20', stage: 'grade1', board: '数与代数', unit: '20以内退位', title: '20以内退位减法', subtitle: '借一当十', emoji: '➖', level: 1, sort: 5,
    tags: ['计算熟练度'], prereqKeys: ['t-g1-add10'],
    content: [
      { type: 'explain', text: '13-5：先把13分成10和3，10-5=5，5+3=8。', emoji: '🧮' },
      { type: 'example', text: '12-4：10-4=6，6+2=8。', emoji: '➖' },
      { type: 'guide', text: '算一算：15-7=？', emoji: '🧮' },
    ],
  },
  {
    key: 't-g1-100', stage: 'grade1', board: '数与代数', unit: '100以内数', title: '100以内数的认识', subtitle: '几十几', emoji: '💯', level: 1, sort: 6,
    tags: ['数感'], prereqKeys: ['t-g1-count20'],
    content: [
      { type: 'explain', text: '十个十是百。35是3个十和5个一。', emoji: '💯' },
      { type: 'example', text: '数数：…28、29、30，满十进一。', emoji: '🔢' },
      { type: 'guide', text: '选一选：4个十和6个一是？', emoji: '💯' },
    ],
  },
  {
    key: 't-g1-plane', stage: 'grade1', board: '图形与几何', unit: '平面图形', title: '平面图形认识', subtitle: '长方·正方·圆·三角', emoji: '⬜', level: 1, sort: 7,
    tags: ['几何空间'], prereqKeys: ['t-g1-3d'],
    content: [
      { type: 'explain', text: '把正方体的一面印在纸上，得到“正方形”。圆柱滚出的面是“圆”。', emoji: '⬜' },
      { type: 'example', text: '窗户是长方形，钟面是圆形。', emoji: '🪟' },
      { type: 'guide', text: '下面哪个是三角形？点一点。', emoji: '🔺' },
    ],
  },
  {
    key: 't-g1-pattern', stage: 'grade1', board: '数学思维', unit: '找规律', title: '找规律', subtitle: '数列·图形循环', emoji: '🔁', level: 1, sort: 8,
    tags: ['逻辑思维'], prereqKeys: ['t-5-6-balance'],
    content: [
      { type: 'explain', text: '看数字：2、4、6、8…每次多2；看图形：🔺🔺⚪🔺🔺⚪ 重复。', emoji: '🔢' },
      { type: 'example', text: '1、3、5、7，下一个是9（每次+2）。', emoji: '➡️' },
      { type: 'guide', text: '找规律填空：10、20、30、？', emoji: '🔁' },
    ],
  },

  // —— 2-3岁 扩充 ——
  {
    key: 't-2-3-color', stage: '2-3', board: '数学思维', unit: '颜色认知', title: '认识颜色', subtitle: '红黄蓝绿', emoji: '🌈', level: 1, sort: 4,
    tags: ['数感'], prereqKeys: [],
    content: [
      { type: 'explain', text: '太阳是红色的🔴，香蕉是黄色的🟡，天空是蓝色的🔵，草是绿色的🟢。', emoji: '🌈' },
      { type: 'example', text: '苹果红红的，柠檬黄黄的。', emoji: '🍎' },
      { type: 'guide', text: '下面哪个是红色？点一点。', emoji: '🔴' },
    ],
  },
  {
    key: 't-2-3-count5', stage: '2-3', board: '数与代数', unit: '点数', title: '数一数1-5', subtitle: '1、2、3、4、5', emoji: '🖐️', level: 1, sort: 5,
    tags: ['数感'], prereqKeys: [],
    content: [
      { type: 'explain', text: '伸出小手：1根手指、2根手指…数到5。', emoji: '✋' },
      { type: 'example', text: '🍓🍓🍓 是3个草莓，数一数：1、2、3。', emoji: '🍓' },
      { type: 'guide', text: '🐟🐟🐟🐟 有几条鱼？点一点。', emoji: '🐟' },
    ],
  },
  {
    key: 't-2-3-moreless', stage: '2-3', board: '数与代数', unit: '多少', title: '多和少', subtitle: '哪个多？哪个少？', emoji: '⚖️', level: 1, sort: 6,
    tags: ['数感'], prereqKeys: [],
    content: [
      { type: 'explain', text: '🍬🍬🍬 比 🍬 多，因为3颗比1颗多。', emoji: '🍬' },
      { type: 'example', text: '两只手里：左手2块、右手5块，右手更多。', emoji: '✋' },
      { type: 'guide', text: '哪边更多？🐤🐤 还是 🐤🐤🐤？', emoji: '🐤' },
    ],
  },

  // —— 3-4岁 扩充 ——
  {
    key: 't-3-4-number', stage: '3-4', board: '数与代数', unit: '认数字', title: '认识数字1-10', subtitle: '1到10', emoji: '🔢', level: 1, sort: 4,
    tags: ['数感'], prereqKeys: [],
    content: [
      { type: 'explain', text: '1像小棒，2像小鸭，3像耳朵，4像小旗，5像称钩。', emoji: '🔢' },
      { type: 'example', text: '数到5：1、2、3、4、5。', emoji: '🖐️' },
      { type: 'guide', text: '下面哪个是数字3？点一点。', emoji: '3️⃣' },
    ],
  },
  {
    key: 't-3-4-bigsmall', stage: '3-4', board: '数与代数', unit: '比较', title: '大小排序', subtitle: '从大到小', emoji: '📏', level: 1, sort: 5,
    tags: ['数感'], prereqKeys: [],
    content: [
      { type: 'explain', text: '大象大🐘，老鼠小🐭。把它们排一排：大→小。', emoji: '🐘' },
      { type: 'example', text: '🍉比🍓大，🍓比🍉小。', emoji: '🍉' },
      { type: 'guide', text: '哪个最大？🐭🐱🐘？', emoji: '🐘' },
    ],
  },
  {
    key: 't-3-4-classify', stage: '3-4', board: '数学思维', unit: '分类', title: '简单分类', subtitle: '按颜色分', emoji: '🗂️', level: 1, sort: 6,
    tags: ['逻辑思维'], prereqKeys: [],
    content: [
      { type: 'explain', text: '把一样的放一起：红色的放一堆，蓝色的放一堆。', emoji: '🔴🔵' },
      { type: 'example', text: '🔴🔴🔵 里，红色有2个。', emoji: '🔴' },
      { type: 'guide', text: '把圆形的挑出来吧！', emoji: '⚪' },
    ],
  },

  // —— 4-5岁 扩充 ——
  {
    key: 't-4-5-number10', stage: '4-5', board: '数与代数', unit: '数序', title: '10以内的数序', subtitle: '谁在前谁在后', emoji: '🔢', level: 2, sort: 4,
    tags: ['数感'], prereqKeys: [],
    content: [
      { type: 'explain', text: '排好队：1、2、3、4、5、6、7、8、9、10，后面的数比前面大。', emoji: '🚶' },
      { type: 'example', text: '7后面是8，8后面是9。', emoji: '➡️' },
      { type: 'guide', text: '5的后面是哪一个数？', emoji: '🔢' },
    ],
  },
  {
    key: 't-4-5-add', stage: '4-5', board: '数与代数', unit: '加法', title: '5以内加法', subtitle: '合起来是多少', emoji: '➕', level: 2, sort: 5,
    tags: ['计算熟练度'], prereqKeys: [],
    content: [
      { type: 'explain', text: '2个苹果🍎🍎 加上1个苹果🍎，合起来是3个。', emoji: '🍎' },
      { type: 'example', text: '1+2=3，数一数手指就懂啦。', emoji: '✋' },
      { type: 'guide', text: '2+2=？点一点答案。', emoji: '➕' },
    ],
  },
  {
    key: 't-4-5-sub', stage: '4-5', board: '数与代数', unit: '减法', title: '5以内减法', subtitle: '拿走剩多少', emoji: '➖', level: 2, sort: 6,
    tags: ['计算熟练度'], prereqKeys: [],
    content: [
      { type: 'explain', text: '有4块糖🍬🍬🍬🍬，吃掉1块，还剩3块。', emoji: '🍬' },
      { type: 'example', text: '5-2=3，从5个里拿走2个剩3个。', emoji: '✋' },
      { type: 'guide', text: '4-1=？选一选。', emoji: '➖' },
    ],
  },

  // —— 5-6岁 扩充 ——
  {
    key: 't-5-6-add10', stage: '5-6', board: '数与代数', unit: '加法', title: '10以内加法', subtitle: '凑十法', emoji: '➕', level: 2, sort: 4,
    tags: ['计算熟练度'], prereqKeys: [],
    content: [
      { type: 'explain', text: '8+2=10，9+1=10，凑成十很好算。', emoji: '🔟' },
      { type: 'example', text: '7+3=10，6+4=10。', emoji: '🧮' },
      { type: 'guide', text: '8+1=？选一选。', emoji: '➕' },
    ],
  },
  {
    key: 't-5-6-sub10', stage: '5-6', board: '数与代数', unit: '减法', title: '10以内减法', subtitle: '破十法', emoji: '➖', level: 2, sort: 5,
    tags: ['计算熟练度'], prereqKeys: [],
    content: [
      { type: 'explain', text: '10-3=7，从10个里拿走3个剩7个。', emoji: '🔟' },
      { type: 'example', text: '9-4=5，8-5=3。', emoji: '🧮' },
      { type: 'guide', text: '10-2=？选一选。', emoji: '➖' },
    ],
  },
  {
    key: 't-5-6-pos', stage: '5-6', board: '图形与几何', unit: '位置', title: '前后与中间', subtitle: '谁在前面', emoji: '📍', level: 2, sort: 6,
    tags: ['几何空间'], prereqKeys: [],
    content: [
      { type: 'explain', text: '排队时，面对的方向是前，背对的是后。', emoji: '🚶' },
      { type: 'example', text: '🐰🐱🐶 里，小兔在最前面，小狗在最后面。', emoji: '🐰' },
      { type: 'guide', text: '🔴🟡🔵 谁在中间？', emoji: '🟡' },
    ],
  },

  // —— 一年级 扩充 ——
  {
    key: 't-g1-addword', stage: 'grade1', board: '数与代数', unit: '加法应用', title: '加法应用题', subtitle: '一共多少', emoji: '➕', level: 2, sort: 9,
    tags: ['计算熟练度'], prereqKeys: [],
    content: [
      { type: 'explain', text: '“一共”用加法：树上有5只鸟，又飞来3只，一共8只。', emoji: '🐦' },
      { type: 'example', text: '小明有6支笔，妈妈又给2支，一共8支。', emoji: '✏️' },
      { type: 'guide', text: '河里有4只鸭，又来了3只，一共几只？', emoji: '🦆' },
    ],
  },
  {
    key: 't-g1-subword', stage: 'grade1', board: '数与代数', unit: '减法应用', title: '减法应用题', subtitle: '还剩多少', emoji: '➖', level: 2, sort: 10,
    tags: ['计算熟练度'], prereqKeys: [],
    content: [
      { type: 'explain', text: '“还剩”用减法：有9颗糖，吃了4颗，还剩5颗。', emoji: '🍬' },
      { type: 'example', text: '盘里有10个苹果，拿走3个，剩7个。', emoji: '🍎' },
      { type: 'guide', text: '有8本书，借出2本，还剩几本？', emoji: '📚' },
    ],
  },
  {
    key: 't-g1-compare-num', stage: 'grade1', board: '数与代数', unit: '比大小', title: '100以内比大小', subtitle: '大于小于', emoji: '⚖️', level: 2, sort: 11,
    tags: ['数感'], prereqKeys: [],
    content: [
      { type: 'explain', text: '位数多的数大；位数相同，从高位比。', emoji: '🔢' },
      { type: 'example', text: '45 < 54，因为十位4比5小。', emoji: '⚖️' },
      { type: 'guide', text: '38 和 83，哪个大？', emoji: '⚖️' },
    ],
  },
  {
    key: 't-g1-money', stage: 'grade1', board: '数与代数', unit: '人民币', title: '认识人民币', subtitle: '元角分', emoji: '💰', level: 2, sort: 12,
    tags: ['数感'], prereqKeys: [],
    content: [
      { type: 'explain', text: '1元=10角，1角=10分。硬币有1元、5角、1角。', emoji: '🪙' },
      { type: 'example', text: '1元可以换10个1角。', emoji: '💴' },
      { type: 'guide', text: '买铅笔花2元，付5元，该找回几元？', emoji: '💰' },
    ],
  },
];

// ============ 占位骨架（二~六年级，仅标题/板块，留待填充） ============
const PLACEHOLDER = [
  // 二年级
  ['grade2', '数与代数', '100以内进退位加减法'],
  ['grade2', '数与代数', '表内乘法（乘法口诀）'],
  ['grade2', '数与代数', '长度单位：厘米·米'],
  ['grade2', '图形与几何', '角的初步认识：直角·锐角·钝角'],
  ['grade2', '图形与几何', '观察物体：前侧视图'],
  ['grade2', '数与代数', '时间：几时几分'],
  ['grade2', '数学思维', '简单搭配（排列组合）'],
  // 三年级
  ['grade3', '数与代数', '时分秒与时间计算'],
  ['grade3', '数与代数', '万以内加减法'],
  ['grade3', '图形与几何', '测量：毫米·分米·千米·吨'],
  ['grade3', '数与代数', '倍的认识'],
  ['grade3', '数与代数', '多位数乘一位数'],
  ['grade3', '图形与几何', '长方形正方形周长'],
  ['grade3', '数与代数', '分数初步认识'],
  ['grade3', '数学思维', '集合（韦恩图·重叠问题）'],
  // 四年级
  ['grade4', '数与代数', '大数认识（亿以内/以上）'],
  ['grade4', '图形与几何', '公顷与平方千米'],
  ['grade4', '图形与几何', '角的度量·线'],
  ['grade4', '数与代数', '三位数乘两位数'],
  ['grade4', '图形与几何', '平行四边形与梯形'],
  ['grade4', '数与代数', '除数是两位数除法'],
  ['grade4', '统计与概率', '条形统计图'],
  ['grade4', '数学思维', '数学广角：优化（烙饼·沏茶）'],
  // 五年级
  ['grade5', '数与代数', '小数乘除法'],
  ['grade5', '数与代数', '简易方程'],
  ['grade5', '图形与几何', '位置：数对'],
  ['grade5', '图形与几何', '多边形面积'],
  ['grade5', '统计与概率', '可能性'],
  ['grade5', '数学思维', '数学广角：植树问题'],
  // 六年级
  ['grade6', '数与代数', '分数乘法与除法'],
  ['grade6', '数与代数', '比的认识与按比分配'],
  ['grade6', '图形与几何', '圆：周长与面积'],
  ['grade6', '数与代数', '百分数（一）'],
  ['grade6', '统计与概率', '扇形统计图'],
  ['grade6', '数学思维', '数学广角：数与形'],
  ['grade6', '数与代数', '负数初步'],
  ['grade6', '数与代数', '百分数（二）：折扣·税率'],
  ['grade6', '图形与几何', '圆柱与圆锥'],
  ['grade6', '数与代数', '比例与比例尺'],
  ['grade6', '数学思维', '数学广角：鸽巢问题'],
];

const placeholderTopics = PLACEHOLDER.map(([stage, board, title], i) => ({
  key: `ph-${stage}-${i}`,
  stage, board, unit: title, title, subtitle: '内容筹备中', emoji: '📐', level: 1, sort: i,
  tags: [BOARD_TAG[board]], prereqKeys: [], content: [], status: 'placeholder',
}));

export const ALL_TOPICS = [...TOPICS, ...placeholderTopics];

// ============ 测验题（仅示例知识点有，绑定 topic key） ============
export const QUIZZES = [
  // t-2-3-size 比较大小多少
  { qkey: 'q-s1', topicKey: 't-2-3-size', question: '哪个数字更大？', options: ['3', '7'], answer: 1, level: 1, type: 'compare' },
  { qkey: 'q-s2', topicKey: 't-2-3-size', question: '哪个数字更小？', options: ['9', '2'], answer: 1, level: 1, type: 'compare' },
  { qkey: 'q-s3', topicKey: 't-2-3-size', question: '比一比：5 和 8，更大的一个是？', options: ['5', '8'], answer: 1, level: 1, type: 'compare' },
  // t-2-3-shape 基本图形
  { qkey: 'q-sh1', topicKey: 't-2-3-shape', question: '下面哪个是圆形？', options: ['🔺', '🔵', '⬜'], answer: 1, level: 1, type: 'shape' },
  { qkey: 'q-sh2', topicKey: 't-2-3-shape', question: '哪个是三角形？', options: ['⭐', '🔺', '🟢'], answer: 1, level: 1, type: 'shape' },
  { qkey: 'q-sh3', topicKey: 't-2-3-shape', question: '下面哪个是方形？', options: ['⬜', '🔵', '🔺'], answer: 0, level: 1, type: 'shape' },
  // t-2-3-ab AB规律
  { qkey: 'q-ab1', topicKey: 't-2-3-ab', question: '规律：🔴⚪🔴⚪🔴？下一个是？', options: ['🔴', '⚪', '🔺'], answer: 1, level: 1, type: 'pattern' },
  { qkey: 'q-ab2', topicKey: 't-2-3-ab', question: '规律：⭐🌟⭐🌟？下一个是？', options: ['⭐', '🌟', '💡'], answer: 0, level: 1, type: 'pattern' },
  { qkey: 'q-ab3', topicKey: 't-2-3-ab', question: '规律：🟦🟥🟦🟥？下一个是？', options: ['🟦', '🟥', '🟩'], answer: 0, level: 1, type: 'pattern' },
  // t-3-4-count 1-10点数
  { qkey: 'q-c1', topicKey: 't-3-4-count', question: '🐱🐱🐱 一共有几只猫？', options: ['2', '3', '4'], answer: 1, level: 1, type: 'count' },
  { qkey: 'q-c2', topicKey: 't-3-4-count', question: '🍎🍎🍎🍎 数一数有几个？', options: ['3', '4', '5'], answer: 1, level: 1, type: 'count' },
  { qkey: 'q-c3', topicKey: 't-3-4-count', question: '下面哪个数字表示“5个”？', options: ['3', '5', '8'], answer: 1, level: 1, type: 'count' },
  // t-3-4-space 上下里外
  { qkey: 'q-sp1', topicKey: 't-3-4-space', question: '小鸟在树上，它在（ ）面。', options: ['上', '下', '里'], answer: 0, level: 1, type: 'space' },
  { qkey: 'q-sp2', topicKey: 't-3-4-space', question: '小狗在桌子（ ）面，选“下”。', options: ['上', '下', '外'], answer: 1, level: 1, type: 'space' },
  { qkey: 'q-sp3', topicKey: 't-3-4-space', question: '球在盒子（ ），选“里”。', options: ['里', '外', '上'], answer: 0, level: 1, type: 'space' },
  // t-3-4-abab ABAB循环
  { qkey: 'q-b1', topicKey: 't-3-4-abab', question: '🔴⚪🔴⚪🔴⚪？第7个是？', options: ['🔴', '⚪', '🌟'], answer: 0, level: 1, type: 'pattern' },
  { qkey: 'q-b2', topicKey: 't-3-4-abab', question: '🟦🟨🟦🟨🟦？下一个是？', options: ['🟦', '🟨', '🟩'], answer: 1, level: 1, type: 'pattern' },
  { qkey: 'q-b3', topicKey: 't-3-4-abab', question: '🌸🌿🌸🌿？下一个是？', options: ['🌸', '🌿', '🌞'], answer: 0, level: 1, type: 'pattern' },
  // t-4-5-split 10以内分合
  { qkey: 'q-f1', topicKey: 't-4-5-split', question: '6可以分成2和几？', options: ['3', '4', '5'], answer: 1, level: 1, type: 'split' },
  { qkey: 'q-f2', topicKey: 't-4-5-split', question: '把下面的数分成两份：8 = 5 + ？', options: ['2', '3', '4'], answer: 1, level: 1, type: 'split' },
  { qkey: 'q-f3', topicKey: 't-4-5-split', question: '4可以分成1和几？', options: ['2', '3', '4'], answer: 1, level: 1, type: 'split' },
  // t-4-5-3d 立体图形
  { qkey: 'q-d1', topicKey: 't-4-5-3d', question: '下面哪个是“球”？', options: ['🧊', '⚽', '📦'], answer: 1, level: 1, type: 'shape' },
  { qkey: 'q-d2', topicKey: 't-4-5-3d', question: '哪个是“正方体”？', options: ['🟦', '🔵', '⚽'], answer: 0, level: 1, type: 'shape' },
  { qkey: 'q-d3', topicKey: 't-4-5-3d', question: '球会怎样？选“滚”。', options: ['滚', '站着不动', '方方正正'], answer: 0, level: 1, type: 'shape' },
  // t-4-5-aabb AABB/ABC
  { qkey: 'q-a1', topicKey: 't-4-5-aabb', question: '🟥🟥🟦🟦🟥🟥🟦🟦？下一个是？', options: ['🟥', '🟦', '🟩'], answer: 0, level: 1, type: 'pattern' },
  { qkey: 'q-a2', topicKey: 't-4-5-aabb', question: '🔴🟡🔵🔴🟡？下一个是？', options: ['🔴', '🟡', '🔵'], answer: 2, level: 1, type: 'pattern' },
  { qkey: 'q-a3', topicKey: 't-4-5-aabb', question: '🟢🟢🔵🔵🟢🟢？下一个是？', options: ['🟢', '🔵', '🟡'], answer: 1, level: 1, type: 'pattern' },
  // t-5-6-20 20以内点数
  { qkey: 'q-20-1', topicKey: 't-5-6-20', question: '19的下一个数是？', options: ['18', '20', '21'], answer: 1, level: 1, type: 'count' },
  { qkey: 'q-20-2', topicKey: 't-5-6-20', question: '从1数到20，第10个数是？', options: ['9', '10', '11'], answer: 1, level: 1, type: 'count' },
  { qkey: 'q-20-3', topicKey: 't-5-6-20', question: '比15大1的数是？', options: ['14', '16', '20'], answer: 1, level: 1, type: 'count' },
  // t-5-6-leftright 左右
  { qkey: 'q-lr1', topicKey: 't-5-6-leftright', question: '写字的那只手是？选“右手”。', options: ['左手', '右手', '双脚'], answer: 1, level: 1, type: 'space' },
  { qkey: 'q-lr2', topicKey: 't-5-6-leftright', question: '和右手相反的是？', options: ['左手', '右手', '头'], answer: 0, level: 1, type: 'space' },
  { qkey: 'q-lr3', topicKey: 't-5-6-leftright', question: '箭头➡️指向哪个方向？', options: ['左', '右', '上'], answer: 1, level: 1, type: 'space' },
  // t-5-6-balance 天平轻重
  { qkey: 'q-bl1', topicKey: 't-5-6-balance', question: '一边2块糖🍬🍬，一边1块糖🍬，哪边重？', options: ['2块', '1块', '一样'], answer: 0, level: 1, type: 'balance' },
  { qkey: 'q-bl2', topicKey: 't-5-6-balance', question: '🍎🍎🍎 和 🍎🍎，哪边重？', options: ['3个', '2个', '一样'], answer: 0, level: 1, type: 'balance' },
  { qkey: 'q-bl3', topicKey: 't-5-6-balance', question: '天平下沉的那边？', options: ['更轻', '更重', '一样'], answer: 1, level: 1, type: 'balance' },
  // t-g1-count20 1-20各数
  { qkey: 'q-g1c1', topicKey: 't-g1-count20', question: '“第3名”里的3是？', options: ['基数', '序数', '都不'], answer: 1, level: 1, type: 'concept' },
  { qkey: 'q-g1c2', topicKey: 't-g1-count20', question: '“3个苹果”里的3是？', options: ['基数', '序数', '都不'], answer: 0, level: 1, type: 'concept' },
  { qkey: 'q-g1c3', topicKey: 't-g1-count20', question: '从左数第1个是哪个？🔴🟡🔵', options: ['🔴', '🟡', '🔵'], answer: 0, level: 1, type: 'concept' },
  // t-g1-add10 10以内加减
  { qkey: 'q-g1a1', topicKey: 't-g1-add10', question: '3 + 2 = ？', options: ['4', '5', '6'], answer: 1, level: 1, type: 'arithmetic' },
  { qkey: 'q-g1a2', topicKey: 't-g1-add10', question: '5 - 2 = ？', options: ['2', '3', '4'], answer: 1, level: 1, type: 'arithmetic' },
  { qkey: 'q-g1a3', topicKey: 't-g1-add10', question: '小明有4块糖，吃掉1块，还剩？', options: ['3', '4', '5'], answer: 0, level: 1, type: 'arithmetic' },
  // t-g1-3d 立体图形
  { qkey: 'q-g1d1', topicKey: 't-g1-3d', question: '牙膏盒像哪种立体图形？', options: ['球', '长方体', '圆柱'], answer: 1, level: 1, type: 'shape' },
  { qkey: 'q-g1d2', topicKey: 't-g1-3d', question: '易拉罐像哪种？', options: ['圆柱', '正方体', '球'], answer: 0, level: 1, type: 'shape' },
  { qkey: 'q-g1d3', topicKey: 't-g1-3d', question: '下面哪个是球？', options: ['📦', '🥫', '⚽'], answer: 2, level: 1, type: 'shape' },
  // t-g1-sort 分类统计
  { qkey: 'q-g1s1', topicKey: 't-g1-sort', question: '🔴🔴🔵 红色有几个？', options: ['1', '2', '3'], answer: 1, level: 1, type: 'sort' },
  { qkey: 'q-g1s2', topicKey: 't-g1-sort', question: '🍎🍎🍇 按颜色分，红色有几类里的几个？红色（ ）个', options: ['1', '2', '3'], answer: 1, level: 1, type: 'sort' },
  { qkey: 'q-g1s3', topicKey: 't-g1-sort', question: '把⬜⬜🔵⬜按形状分，方形有几个？', options: ['1', '2', '3'], answer: 2, level: 1, type: 'sort' },
  // t-g1-sub20 退位减法
  { qkey: 'q-g1u1', topicKey: 't-g1-sub20', question: '13 - 5 = ？', options: ['7', '8', '9'], answer: 1, level: 1, type: 'arithmetic' },
  { qkey: 'q-g1u2', topicKey: 't-g1-sub20', question: '12 - 4 = ？', options: ['7', '8', '9'], answer: 1, level: 1, type: 'arithmetic' },
  { qkey: 'q-g1u3', topicKey: 't-g1-sub20', question: '15 - 7 = ？', options: ['7', '8', '9'], answer: 1, level: 1, type: 'arithmetic' },
  // t-g1-100 100以内数
  { qkey: 'q-g1h1', topicKey: 't-g1-100', question: '4个十和6个一是？', options: ['46', '64', '406'], answer: 0, level: 1, type: 'concept' },
  { qkey: 'q-g1h2', topicKey: 't-g1-100', question: '35里有几个十？', options: ['3', '5', '35'], answer: 0, level: 1, type: 'concept' },
  { qkey: 'q-g1h3', topicKey: 't-g1-100', question: '十个十是？', options: ['十', '百', '千'], answer: 1, level: 1, type: 'concept' },
  // t-g1-plane 平面图形
  { qkey: 'q-g1p1', topicKey: 't-g1-plane', question: '下面哪个是三角形？', options: ['⬜', '🔺', '🔵'], answer: 1, level: 1, type: 'shape' },
  { qkey: 'q-g1p2', topicKey: 't-g1-plane', question: '钟面通常是哪种图形？', options: ['正方形', '圆形', '三角形'], answer: 1, level: 1, type: 'shape' },
  { qkey: 'q-g1p3', topicKey: 't-g1-plane', question: '窗户常是哪种图形？', options: ['长方形', '圆形', '三角'], answer: 0, level: 1, type: 'shape' },
  // t-g1-pattern 找规律
  { qkey: 'q-g1pt1', topicKey: 't-g1-pattern', question: '规律：2、4、6、8、？', options: ['9', '10', '12'], answer: 1, level: 1, type: 'pattern' },
  { qkey: 'q-g1pt2', topicKey: 't-g1-pattern', question: '规律：1、3、5、7、？', options: ['8', '9', '10'], answer: 1, level: 1, type: 'pattern' },
  { qkey: 'q-g1pt3', topicKey: 't-g1-pattern', question: '10、20、30、？', options: ['31', '40', '50'], answer: 1, level: 1, type: 'pattern' },

  // —— 2-3岁 扩充 测验 ——
  { qkey: 'q-col1', topicKey: 't-2-3-color', question: '下面哪个是红色？', options: ['🔴', '🔵', '🟢'], answer: 0, level: 1, type: 'color' },
  { qkey: 'q-col2', topicKey: 't-2-3-color', question: '香蕉是什么颜色？', options: ['红色', '黄色', '蓝色'], answer: 1, level: 1, type: 'color' },
  { qkey: 'q-col3', topicKey: 't-2-3-color', question: '天空通常是哪种颜色？', options: ['蓝色', '绿色', '黑色'], answer: 0, level: 1, type: 'color' },
  { qkey: 'q-c51', topicKey: 't-2-3-count5', question: '🐟🐟🐟🐟 有几条鱼？', options: ['3', '4', '5'], answer: 1, level: 1, type: 'count' },
  { qkey: 'q-c52', topicKey: 't-2-3-count5', question: '🍎🍎🍎🍎🍎 有几个苹果？', options: ['4', '5', '6'], answer: 1, level: 1, type: 'count' },
  { qkey: 'q-c53', topicKey: 't-2-3-count5', question: '数一数：🌟🌟🌟 是几个？', options: ['2', '3', '4'], answer: 1, level: 1, type: 'count' },
  { qkey: 'q-ml1', topicKey: 't-2-3-moreless', question: '哪边更多？🐤🐤 还是 🐤🐤🐤？', options: ['左边2只', '右边3只', '一样多'], answer: 1, level: 1, type: 'compare' },
  { qkey: 'q-ml2', topicKey: 't-2-3-moreless', question: '🍬🍬🍬 和 🍬🍬，哪边少？', options: ['3颗', '2颗', '一样'], answer: 1, level: 1, type: 'compare' },
  { qkey: 'q-ml3', topicKey: 't-2-3-moreless', question: '🍎🍎 和 🍎，哪个多？', options: ['2个', '1个', '一样'], answer: 0, level: 1, type: 'compare' },

  // —— 3-4岁 扩充 测验 ——
  { qkey: 'q-n41', topicKey: 't-3-4-number', question: '下面哪个是数字3？', options: ['2', '3', '5'], answer: 1, level: 1, type: 'number' },
  { qkey: 'q-n42', topicKey: 't-3-4-number', question: '数一数：1、2、3、？ 下一个是？', options: ['3', '4', '5'], answer: 1, level: 1, type: 'number' },
  { qkey: 'q-n43', topicKey: 't-3-4-number', question: '哪个数字最大？', options: ['2', '8', '5'], answer: 1, level: 1, type: 'number' },
  { qkey: 'q-bs41', topicKey: 't-3-4-bigsmall', question: '🐘 和 🐭，哪个大？', options: ['老鼠', '大象', '一样'], answer: 1, level: 1, type: 'compare' },
  { qkey: 'q-bs42', topicKey: 't-3-4-bigsmall', question: '🍉 和 🍓，哪个小？', options: ['西瓜', '草莓', '一样'], answer: 1, level: 1, type: 'compare' },
  { qkey: 'q-bs43', topicKey: 't-3-4-bigsmall', question: '从大到小排，最大的是？🐱🐘🐭', options: ['猫', '大象', '老鼠'], answer: 1, level: 1, type: 'compare' },
  { qkey: 'q-cl41', topicKey: 't-3-4-classify', question: '🔴🔴🔵 里红色有几个？', options: ['1', '2', '3'], answer: 1, level: 1, type: 'sort' },
  { qkey: 'q-cl42', topicKey: 't-3-4-classify', question: '把圆形的挑出来：🔺🔵⬜，哪个是圆？', options: ['🔺', '🔵', '⬜'], answer: 1, level: 1, type: 'shape' },
  { qkey: 'q-cl43', topicKey: 't-3-4-classify', question: '🟡🟡🟢 按颜色分，黄色有几个？', options: ['1', '2', '3'], answer: 1, level: 1, type: 'sort' },

  // —— 4-5岁 扩充 测验 ——
  { qkey: 'q-n101', topicKey: 't-4-5-number10', question: '5的后面是几？', options: ['4', '6', '7'], answer: 1, level: 2, type: 'count' },
  { qkey: 'q-n102', topicKey: 't-4-5-number10', question: '从1数到10，第7个数是？', options: ['6', '7', '8'], answer: 1, level: 2, type: 'count' },
  { qkey: 'q-n103', topicKey: 't-4-5-number10', question: '比8大1的数是？', options: ['7', '9', '10'], answer: 1, level: 2, type: 'count' },
  { qkey: 'q-a51', topicKey: 't-4-5-add', question: '2 + 1 = ？', options: ['2', '3', '4'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-a52', topicKey: 't-4-5-add', question: '3 + 2 = ？', options: ['4', '5', '6'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-a53', topicKey: 't-4-5-add', question: '小明有1块糖，妈妈给2块，一共几块？', options: ['2', '3', '4'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-s51', topicKey: 't-4-5-sub', question: '4 - 1 = ？', options: ['2', '3', '4'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-s52', topicKey: 't-4-5-sub', question: '5 - 2 = ？', options: ['2', '3', '4'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-s53', topicKey: 't-4-5-sub', question: '有5块糖，吃掉3块，还剩？', options: ['1', '2', '3'], answer: 1, level: 2, type: 'arithmetic' },

  // —— 5-6岁 扩充 测验 ——
  { qkey: 'q-a101', topicKey: 't-5-6-add10', question: '8 + 1 = ？', options: ['8', '9', '10'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-a102', topicKey: 't-5-6-add10', question: '7 + 3 = ？', options: ['9', '10', '11'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-a103', topicKey: 't-5-6-add10', question: '6 + 2 = ？', options: ['7', '8', '9'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-s101', topicKey: 't-5-6-sub10', question: '10 - 2 = ？', options: ['7', '8', '9'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-s102', topicKey: 't-5-6-sub10', question: '9 - 4 = ？', options: ['4', '5', '6'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-s103', topicKey: 't-5-6-sub10', question: '8 - 5 = ？', options: ['2', '3', '4'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-pos1', topicKey: 't-5-6-pos', question: '🔴🟡🔵 谁在中间？', options: ['🔴', '🟡', '🔵'], answer: 1, level: 2, type: 'space' },
  { qkey: 'q-pos2', topicKey: 't-5-6-pos', question: '🐰🐱🐶 里谁在最前面？', options: ['小兔', '小猫', '小狗'], answer: 0, level: 2, type: 'space' },
  { qkey: 'q-pos3', topicKey: 't-5-6-pos', question: '排队时，背对的方向是？', options: ['前', '后', '左'], answer: 1, level: 2, type: 'space' },

  // —— 一年级 扩充 测验 ——
  { qkey: 'q-aw1', topicKey: 't-g1-addword', question: '树上有5只鸟，又飞来3只，一共几只？', options: ['7', '8', '9'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-aw2', topicKey: 't-g1-addword', question: '小明有6支笔，妈妈给2支，一共几支？', options: ['7', '8', '9'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-aw3', topicKey: 't-g1-addword', question: '河里有4只鸭，又来3只，一共几只？', options: ['6', '7', '8'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-sw1', topicKey: 't-g1-subword', question: '有9颗糖，吃了4颗，还剩几颗？', options: ['4', '5', '6'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-sw2', topicKey: 't-g1-subword', question: '盘里10个苹果，拿走3个，剩几个？', options: ['6', '7', '8'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-sw3', topicKey: 't-g1-subword', question: '有8本书，借出2本，还剩几本？', options: ['5', '6', '7'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-cn1', topicKey: 't-g1-compare-num', question: '38 和 83，哪个大？', options: ['38', '83', '一样'], answer: 1, level: 2, type: 'compare' },
  { qkey: 'q-cn2', topicKey: 't-g1-compare-num', question: '下面哪个数最小？', options: ['45', '54', '23'], answer: 2, level: 2, type: 'compare' },
  { qkey: 'q-cn3', topicKey: 't-g1-compare-num', question: '60 和 59，哪个大？', options: ['60', '59', '一样'], answer: 0, level: 2, type: 'compare' },
  { qkey: 'q-mn1', topicKey: 't-g1-money', question: '1元等于几角？', options: ['5角', '10角', '20角'], answer: 1, level: 2, type: 'concept' },
  { qkey: 'q-mn2', topicKey: 't-g1-money', question: '买铅笔花2元，付5元，找回几元？', options: ['2', '3', '4'], answer: 1, level: 2, type: 'arithmetic' },
  { qkey: 'q-mn3', topicKey: 't-g1-money', question: '1角等于几分？', options: ['5分', '10分', '100分'], answer: 1, level: 2, type: 'concept' },
];
