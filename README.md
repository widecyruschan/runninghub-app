# RunningHub AI 工具平台

## 项目简介

这是一个轻量级 AI 工具平台 MVP。项目包含前台工具市场、动态工具页面、中文管理后台、工具配置、分类管理、任务记录、会员中心雏形和本地数据持久化能力。

当前项目仍采用单仓库轻量架构，优先把工具配置、执行闭环、后台管理、用户与积分地基跑通；后续再逐步进入工程化重构、正式会员体系、支付、云盘和内容模块。

## 快速启动

本地启动：

```bash
cd /Volumes/Extreme\ SSD/gitCode/AI\ Code/runninghub-app
cp .env.example .env
npm install
npm start
```

Docker Desktop 启动：

```bash
cd /Volumes/Extreme\ SSD/gitCode/AI\ Code/runninghub-app
cp .env.example .env
docker compose up -d --build
```

访问地址：

```text
前台：http://127.0.0.1:3000
后台：http://127.0.0.1:3000/admin
```

常用检查：

```bash
npm test
docker compose ps
docker compose logs -f runninghub-app
```

## 已完成功能

- 前台工具市场首页、分类筛选、搜索和动态工具详情页。
- 图片、视频、文本、数字、多行文本等动态输入控件。
- 工具顶部说明、底部说明和后台 TinyMCE 富文本编辑。
- 工具执行任务记录、后台任务列表、用户执行历史地基。
- 后台中文管理页、工具管理、分类管理、工具测试执行和上下线流程。
- SQLite 数据持久化，并保留 JSON fallback。
- 前台会员注册页、会员菜单、会员中心页面雏形。
- Google 登录本地测试连接和本地会话存储地基。
- 顶部 Notifications 与 User menu 独立下拉。
- Docker Desktop 本地运行配置。

## 待开发重点

- 前台用户正式注册、登录、会话和权限闭环。
- 后台用户管理、管理员与文章录入员权限划分。
- 前台免费用户、会员用户、会员套餐分组。
- 积分冻结、扣除、返还和积分流水。
- 用户中心真实执行历史、文件、收藏和交易记录。
- I18N 数据结构与自动翻译 Provider。
- 内容管理、SEO、文章录入和发布流程。
- 部署环境配置、生产数据库和回滚流程。

## 技术栈

- 前端：Vue 3 CDN、Element Plus CDN、Axios、CSS3。
- 后端：Node.js 原生 HTTP 服务。
- 数据：SQLite、better-sqlite3、JSON fallback。
- 编辑器：TinyMCE。
- 本地运行：Docker Desktop、Docker Compose。

## 项目文档

| 文档 | 说明 |
|------|------|
| [`docs/PRD.md`](docs/PRD.md) | 产品需求、功能范围与验收标准 |
| [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md) | 后续开发顺序、阶段依赖和验收点 |
| [`docs/MVP-REQUIREMENTS.md`](docs/MVP-REQUIREMENTS.md) | MVP 需求说明 |

## 开发记录

### 2026-07-10

- 从单页演示逐步升级为 AI 工具平台方向。
- 完成图片处理演示页、后端代理、Docker Desktop 本地运行、管理后台首页和导航雏形。
- 多次补充 PRD，明确工具市场、会员、云盘批量、双语、推荐奖励、套餐和 Node.js 自研后台方向。
- 放弃 Cockpit POC，回到当前 Node.js 轻量后台路线。

### 2026-07-11

- 完成工具新增/编辑页的动态输入节点配置。
- 上传类输入统一为 image / video 类型。
- 明确后台中文显示规则。
- 梳理 PRD 开发顺序，确定先做数据持久化、后台配置、前台动态读取和任务记录闭环。
- 完成 SQLite 地基、工具配置保存、后台新增工具保存和 Docker 数据持久化。

### 2026-07-12

- 增加工具预览图片、工具分类管理和四个基础分类。
- 新增开发路线文档，明确后续按依赖链推进。
- 完成前台动态工具页、工具市场首页、分类菜单、侧边栏和工具执行闭环。
- 修复 GitHub Actions 构建流程。
- 增加后台工具测试执行、测试状态和上线限制。
- 根据部署反馈处理构建问题，并持续保持本地测试通过。

### 2026-07-13

- 完成工具页富文本、动态媒体输入、Before/After 结果区和前台排版修正。
- 规划 I18N 与自动翻译 Provider，但暂缓开发，优先完成基础闭环。
- 完成后台任务列表、用户执行历史和积分地基。
- 增加前台会员注册页、会员菜单、会员中心页面。
- 接入 Google 登录本地测试连接，并准备后续 D1/正式存储方案。
- 修正后台登录、用户分组思路和前后台用户角色边界。
- 拆分前台 Notifications 与 User menu，下拉菜单不再混用。
- 精简 README，移除临时调试细节，并将会话总结按天合并。
