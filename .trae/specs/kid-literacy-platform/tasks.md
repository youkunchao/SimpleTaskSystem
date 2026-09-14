# 启蒙星（KidStar）- 幼儿识字启蒙教育平台 - 实现计划

## 技术架构
- **前端**: React 18 + Vite + React Router + TailwindCSS + Recharts
- **后端**: Node.js + Express + better-sqlite3 + JWT
- **数据库**: SQLite（单文件，内置种子数据）
- **语音**: Web Speech API（浏览器内置 TTS）

---

## Task 1: 项目骨架与后端基础
- **Status**: `completed**
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 初始化 monorepo 结构（server/ 和 client/）
  - 后端：Express 服务器、better-sqlite3 数据库初始化、CORS、JSON 中间件
  - 创建 package.json、数据库连接模块、启动脚本
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `rule` TR-1.1: 后端 `npm start` 后监听端口，GET /api/health 返回 200
  - `rule` TR-1.2: SQLite 数据库文件成功创建，表结构初始化完成
- **Notes**: server/ 目录

## Task 2: 数据库 Schema 与种子数据
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 创建表：users、children、courses、characters、words、math_problems、picture_books、progress、review_items、rewards、badges
  - 插入种子数据：汉字分级、英语单词分级、数学题库、绘本文本
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-2.1: 数据库中包含 4 级汉字、5 类英语单词、3 类数学题、2 本绘本的种子数据
  - `rule` TR-2.2: 所有表外键关系正确，无孤立记录

## Task 3: 家长认证 API（注册/登录）
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - POST /api/auth/register（bcrypt 哈希密码）
  - POST /api/auth/login（返回 JWT）
  - JWT 鉴权中间件保护 /api/children、/api/progress 等接口
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `rule` TR-3.1: 注册成功返回用户信息（不含密码），重复注册返回 409
  - `rule` TR-3.2: 登录返回 JWT，使用 JWT 可访问受保护接口，无 JWT 返回 401

## Task 4: 多孩子管理 API
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - GET /api/children（当前家长的孩子列表）
  - POST /api/children（创建孩子）
  - DELETE /api/children/:id
  - 数据按 user_id 隔离
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `rule` TR-4.1: 家长 A 看不到家长 B 的孩子
  - `rule` TR-4.2: 创建孩子后列表包含该孩子，删除后不再出现

## Task 5: 课程内容 API
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - GET /api/courses（返回四大模块分级列表）
  - GET /api/characters?level=
  - GET /api/words?category=
  - GET /api/math?type=
  - GET /api/books
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-5.1: 各接口返回对应分级数据，结构包含所需字段

## Task 6: 学习进度与复习 API
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - POST /api/progress（记录一次学习：child_id, module, item_id, correct, duration）
  - GET /api/progress/:child_id（进度统计）
  - 艾宾浩斯复习引擎：根据学习记录生成 review_items，间隔 [1,2,4,7,15] 天
  - GET /api/review/:child_id（今日待复习）
  - POST /api/review/complete（更新复习间隔：答对+1级间隔，答错重置）
- **Acceptance Criteria Addressed**: AC-8, AC-9
- **Test Requirements**:
  - `rule` TR-6.1: 提交学习记录后 progress 表新增记录
  - `rule` TR-6.2: 复习引擎按间隔生成今日复习项，答错后 interval 重置为 1
  - `rule` TR-6.3: 家长端进度统计返回学习次数、正确率、时长

## Task 7: 奖励激励 API
- **Status**: `completed**
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - POST /api/rewards（完成任务加星星）
  - GET /api/rewards/:child_id（星星数、徽章、连续打卡天数）
  - GET /api/badges（徽章列表及解锁状态）
- **Acceptance Criteria Addressed**: AC-10
- **Test Requirements**:
  - `rule` TR-7.1: 完成学习任务后星星数增加
  - `rule` TR-7.2: 连续打卡天数根据学习日期正确递增

## Task 8: 前端骨架与路由
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 前端：Vite + React + React Router + TailwindCSS
  - 路由：/login, /register, /（首页）, /courses, /characters, /english, /math, /books, /progress, /rewards
  - 全局布局：明亮配色、大字体、卡通风格
  - axios 封装带 JWT
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `rule` TR-8.1: 前端 `npm run dev` 启动成功，路由可访问
  - `rubric` TR-8.2: 界面儿童友好度；scale 1-5；threshold >= 4

## Task 9: 前端认证与孩子管理页
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 8, Task 3, Task 4
- **Description**:
  - 登录/注册页面（简洁表单）
  - 家长中心：孩子列表、添加/删除孩子、切换活跃孩子
  - 登录状态持久化（localStorage 存 JWT）
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `rule` TR-9.1: 注册→登录→进入首页流程完整
  - `rule` TR-9.2: 添加/删除/切换孩子功能正常，数据隔离

## Task 10: 前端课程模块页
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 8, Task 5
- **Description**:
  - 课程总览页：四大模块卡片入口
  - 汉字认知页：字卡展示（汉字、拼音、笔顺、组词）、发音按钮、认字测试
  - 英语单词页：单词卡（单词、释义、配图 emoji、发音）、选词测试
  - 数学小游戏页：比大小、加减法、图形识别，随机出题，即时反馈
  - 绘本点读页：绘本翻页，点击文字/图片朗读
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-10.1: 四个模块页面均可正常加载并展示内容
  - `rule` TR-10.2: Web Speech API 发音功能正常
  - `rule` TR-10.3: 数学游戏答题有即时反馈

## Task 11: 前端进度、复习、奖励页
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 8, Task 6, Task 7
- **Description**:
  - 首页：今日待复习清单（艾宾浩斯推荐）+ 快捷入口
  - 进度报告页：Recharts 图表展示学习次数/正确率/时长
  - 奖励页：星星数、徽章墙、连续打卡天数
- **Acceptance Criteria Addressed**: AC-8, AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-11.1: 首页显示今日复习项
  - `rule` TR-11.2: 进度图表数据与后端一致
  - `rule` TR-11.3: 星星、徽章、打卡正确显示

## Task 12: 集成测试与全流程验证
- **Status**: `completed**
- **Priority**: high
- **Depends On**: Task 9, Task 10, Task 11
- **Description**:
  - 启动前后端，完成端到端流程验证
  - 修复发现的 bug
  - 确保所有 AC 满足
- **Acceptance Criteria Addressed**: AC-1 至 AC-12
- **Test Requirements**:
  - `rule` TR-12.1: 完整流程：注册→建孩子→学汉字→看复习→查进度→获星星，全部正常
  - `rubric` TR-12.2: 整体交互响应速度；scale 1-5；threshold >= 4
