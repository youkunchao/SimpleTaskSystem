# 启蒙星（KidStar）· 幼儿识字启蒙教育平台

> 一款面向 **3–7 岁幼儿**的识字启蒙教育平台，覆盖**汉字识字、英语启蒙、数学思维、绘本点读**四大互动学习模块，配合**艾宾浩斯间隔复习**与**星星 / 徽章激励体系**，帮助幼儿在游戏化环境中完成启蒙，并支持家长管理多子女学习进度。
>
> 仓库原名 `SimpleTaskSystem`，远程地址：`https://github.com/youkunchao/SimpleTaskSystem`

---

## 目录

1. [技术栈与架构](#1-技术栈与架构)
2. [项目结构](#2-项目结构)
3. [功能模块](#3-功能模块)
4. [快速开始](#4-快速开始)
5. [数据与内容](#5-数据与内容)
6. [TTS 语音合成管线](#6-tts-语音合成管线)
7. [测试体系](#7-测试体系)
8. [文档导航](#8-文档导航)
9. [部署说明](#9-部署说明)

---

## 1. 技术栈与架构

| 层 | 技术 |
|---|---|
| 前端 | React 18 + Vite + TailwindCSS，路由 `react-router-dom`，请求 `axios`，笔顺动画 `hanzi-writer`，图表 `recharts`，图标 `lucide-react` |
| 后端 | Node.js + Express，`better-sqlite3`（单文件 SQLite），`bcryptjs`（密码哈希），`jsonwebtoken`（JWT 鉴权），`cors` |
| 鉴权 | 家长账号注册/登录 → 签发 JWT，受保护接口校验 `Authorization` |
| 语音 | 微软神经网络语音（晓晓 / 晓伊）。离线预合成 mp3 + 浏览器实时合成兜底 |
| 架构 | **前后端分离**，RESTful API 统一挂在 `/api` 下；SQLite 文件库，服务重启不丢数据 |

数据流：前端 `client/src/api.js` 统一封装 `/api` 请求 → 后端 `server/src/routes/*` 处理 → `server/src/db.js`（SQLite）+ `server/src/data/*`（内置种子内容）。

---

## 2. 项目结构

```
.
├── server/                 # 后端 (kidstar-server)
│   ├── src/
│   │   ├── index.js        # Express 入口，挂载 /api 路由与静态资源
│   │   ├── db.js           # SQLite 建表 / seed / migrate / 统计
│   │   ├── sqlite.js       # 数据库连接
│   │   ├── config.js       # 配置
│   │   ├── time.js         # 时间工具（连续打卡等）
│   │   ├── middleware/     # auth 鉴权中间件等
│   │   ├── routes/         # auth / children / courses / learning / progress / rewards
│   │   └── data/           # 内置种子内容（字符/英语/数学/拼音/emoji）
│   ├── scripts/            # 测试套件 + TTS 生成脚本
│   └── tts-audio/          # 离线预合成 mp3 + manifest.json
├── client/                 # 前端 (kidstar-client)
│   ├── src/
│   │   ├── pages/          # 15 个页面（登录/首页/汉字/英语/数学/绘本/阅读/复习/进度/奖励…）
│   │   ├── components/     # 学习组件（汉字五步、数学分步、朗读器等）
│   │   ├── hooks/          # useQuiz 等
│   │   ├── context/        # 全局状态（当前孩子等）
│   │   ├── utils/          # api.js / tts.js / edgeTts.js / lessonContent.js / mathContent.js
│   │   └── App.jsx / main.jsx
│   └── e2e/               # Playwright UI 端到端测试
├── uniapp/                 # UniApp 移动端脚手架（当前仅 static，暂未启用）
└── docs/                   # 内容生产规范、QA 用例与风险清单
```

---

## 3. 功能模块

**账号与家庭**
- 家长注册 / 登录 / 登出（JWT）
- 多孩子档案管理（`ChildrenConfig`），学习数据按孩子隔离

**四大学习模块**
- **汉字识字**（`Characters` / `HanziStudy`）：汉字「五步学习法」——玩（故事导入）→ 认（拼音/笔顺/组词/象形）→ 说（跟读）→ 练（巩固习题）→ 写（笔顺描红），字卡地图 `HanziMap`
- **英语启蒙**（`English`）：主题单词（动物/食物/颜色/数字/家庭），听音 + 跟读测试
- **数学思维**（`Math` / `MathLearnSteps`）：数与量、比较、加减、图形；分步讲解 + 测验，题面自动朗读
- **绘本点读**（`Books`）：分级绘本，翻页 + 点击文字/图片触发朗读
- **中文阅读**（`ChineseReading`）：分级短文阅读与理解

**复习与激励**
- **艾宾浩斯复习**（`Review`）：按 1/2/4/7/15 天间隔推荐今日待复习，答错重置、答对延长
- **进度报告**（`Progress` / `LearningProgress`）：学习次数、正确率、时长可视化
- **奖励体系**（`Rewards` / `Badges` / `BadgeWall`）：星星、徽章（含数学小天才/绘本小书虫/故事大王/阅读小达人等）、连续打卡天数

---

## 4. 快速开始

### 4.1 后端
```bash
cd server
npm install
npm run dev      # node --watch，默认 http://localhost:3001
# 或 npm start   # 生产
```
首次启动会自动建库、写入种子数据（1000 汉字 / 英语 / 数学 / 绘本）并执行迁移。

### 4.2 前端
```bash
cd client
npm install
npm run dev      # Vite，默认 http://localhost:5173
```
前端通过 Vite 代理把 `/api` 转发到 `http://localhost:3001`，无需额外配置即可联调。

### 4.3 端到端联调端口
- 后端 API：`http://localhost:3001/api`
- 前端页面：`http://localhost:5173`

---

## 5. 数据与内容

内置内容（非 CMS，JSON 种子，详见 `server/src/data/`）：

| 数据 | 文件 | 当前规模 |
|---|---|---|
| 汉字字表 | `characters.generated.js` | 1000 字 |
| 字→emoji 配图 | `charEmoji.js` | — |
| 英语单词 | `english.generated.js` | 多个主题 |
| 英语拼音 | `englishPhonetics.generated.js` | — |
| 数学知识点 + 测验 | `math.generated.js` | 36 知识点 / **108 题** |
| 汉字原文 | `characters.txt` | — |

**内容生产规范**：所有汉字「五步学习法」内容产出必须遵守 `docs/识字内容生产规范v1.0.md`（口语化、干扰项形近/同音、指令 ≤5 字、鼓励式反馈等铁律）。该规范同时约定了每生产/新增内容后必须重新生成朗读音频（见下节）。

---

## 6. TTS 语音合成管线

固定朗读内容（听读音 / 玩·旁白 / 认·听讲解 / 词组 / 说·短句 / 数学讲题步骤）采用**离线预合成**的 mp3（微软晓晓/晓伊），由 Python `edge-tts` 合成到 `server/tts-audio/`。绘本、跟读、数学题面等**动态文本不预合成**，运行时走浏览器实时合成兜底。

### 6.1 生成流程（需后端 3001 在运行）

1. **导出固定文案**：从后端字表 + 数学 TOPICS 推导全部固定文案，覆盖 `phrases.json` / `phrases_en.json`
   ```bash
   node server/scripts/gen_phrases.mjs
   ```
2. **增量合成**：断点续跑——已存在且非空的 mp3 自动跳过，只合成新增 key
   ```bash
   pip install edge-tts        # 首次需要
   python server/scripts/gen_tts.py
   ```
3. **补齐孤儿**（可选）：若 manifest 中存在 key 但磁盘缺文件，用 `gen_tts_orphans.py` 按 `lang|role|text` 反推音色补合成，使孤儿归零
   ```bash
   python server/scripts/gen_tts_orphans.py
   ```

> 当前规模（截至 2026-09）：`tts-audio/` 共 **10602** 个 mp3，`manifest.json` **10602** 条，**孤儿 0**；固定文案（中文 6667 + 英文 2202 = **8869** 条）离线文件齐全率 100%，数学讲题步骤 108/108 磁盘齐全。

### 6.2 运行时取音（三级兜底）

后端 `GET/POST /api/tts` 按 `key = lang|role|text` 返回离线 mp3，缺则 404。前端 `client/src/utils/edgeTts.js` + `api.js` 的回退链：

```
speakEdge(离线 mp3)  →  speakEdgeLive(浏览器直连微软，晓晓/晓伊)  →  webSpeechSpeak(系统 Web Speech)
```

- 离线 mp3 缺失 / 网络受限时自动降级，**保证始终有声**；浏览器直连路径在本机（Edge）可过微软 WAF。

### 6.3 部署注意
`server/tts-audio/` 是后端静态资源，**部署 / 迁移后端时必须整目录一起带走**，否则新环境 404 → 回退 Web Speech，听不到晓晓。

---

## 7. 测试体系

### 7.1 后端测试套件（`server/scripts/`，Node）
需先启动后端，并通过环境变量指向 API：
```bash
cd server
$env:SMOKE_BASE='http://localhost:3001/api'   # PowerShell；bash 用 export SMOKE_BASE=...
node scripts/smoke-test.mjs
```
| 套件 | 检查项 | 说明 |
|---|---|---|
| `smoke-test.mjs` | 137 | 冒烟：注册/登录/各模块核心接口 |
| `full-course-test.mjs` | 126 | 全课程流程 |
| `deep-content-audit.mjs` | 33 | 内容完整性审计 |
| `deep-integrity-audit.mjs` | 39 | 数据一致性审计 |
| `launch-acceptance.mjs` | 54 | 发布验收 |
| `route-deeplink-regression.mjs` | 35 | 路由/深链回归 |
| `lifecycle-integration.mjs` | 28 | 生命周期集成 |
| `characters-expanded-sample.mjs` | 6 | 字表扩充抽样 |
| `functional-completeness.mjs` | 36 | 功能完整性 |
| `verify-content-badges.mjs` | 6 | **徽章可达性**：用真实内容点亮 4 枚内容型徽章（数学小天才100/绘本小书虫5/故事大王12/阅读小达人10） |

### 7.2 前端 E2E（`client/e2e/`，Playwright）
需后端 3001 + 前端 5173 同时运行：
```bash
cd client
node e2e/ui-e2e.mjs     # 61 项端到端检查
```

### 7.3 运行基线
- 徽章可达性：6/6
- 后端 9 套件合计 **494** 项断言，0 失败
- 前端 E2E：**61** 项，0 失败

---

## 8. 文档导航

| 文档 | 路径 | 内容 |
|---|---|---|
| 产品需求文档（PRD） | `.trae/specs/kid-literacy-platform/spec.md` | 产品概述、功能/非功能需求、验收标准 |
| 需求评审 / 任务 | `.trae/specs/kid-literacy-platform/{review,tasks}.md` | 评审记录与任务拆分 |
| 内容生产规范 | `docs/识字内容生产规范v1.0.md` | 汉字五步学习法产出铁律、数据落库约定、TTS 重生成步骤 |
| QA 测试用例与风险清单 | `docs/QA测试用例与风险清单.md` | 详细测试用例与风险登记 |
| 部署文档 | `docs/部署文档.md` | 部署架构、环境变量、单服务器/ Nginx、TTS 音频部署与重生成、排错 |
| 宝塔面板部署文档 | `docs/宝塔部署文档.md` | 宝塔环境准备、Node(PM2) 项目、建站反代+SSL、安全备份、TTS 音频、排错 |

---

## 9. 部署说明

1. **后端**：`cd server && npm install && npm start`（默认 3001）。确保 `tts-audio/` 整目录随代码部署。
2. **前端**：`cd client && npm install && npm run build`，将 `dist/` 交由静态服务器或反向代理托管；`vite.config.js` 中 `/api` 需指向后端地址。
3. **移动端**：`uniapp/` 为 UniApp 脚手架（当前仅含 `static/`，尚未启用），后续可编译为小程序 / App。

---

*最后整理：2026-09。内容/音频规模随数据扩充动态变化，请以各生成脚本与 `manifest.json` 实际为准。*
