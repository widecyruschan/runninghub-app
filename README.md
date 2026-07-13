# RunningHub AI 工作流调用平台 - 演示版

## 📋 项目简介

这是一个基于 Vue 3 + Element Plus 的 RunningHub 工作流调用平台 MVP。后台可以配置工具分类、预览图、workflowID、instanceType 和动态输入节点；前台工具页通过公开 API 读取已上线工具配置，并调用 RunningHub 工作流完成 AI 处理。

## 🚀 快速开始

### 方式一：本地后端代理（推荐）

复制环境变量示例并填写 RunningHub API Key：

```bash
cd /Volumes/Extreme\ SSD/gitCode/AI\ Code/runninghub-app
cp .env.example .env
```

编辑 `.env`：

```bash
RUNNINGHUB_API_KEY=你的 RunningHub API Key
```

启动服务：

```bash
npm start
# 前台访问 http://127.0.0.1:3000
# 后台访问 http://127.0.0.1:3000/admin
```

### 方式二：临时命令行环境变量

```bash
cd /Volumes/Extreme\ SSD/gitCode/AI\ Code/runninghub-app
RUNNINGHUB_API_KEY=你的 RunningHub API Key npm start
```

### 方式三：Docker Desktop 挂载运行

先确保 Docker Desktop 已启动，并准备本地 `.env`：

```bash
cd /Volumes/Extreme\ SSD/gitCode/AI\ Code/runninghub-app
cp .env.example .env
```

编辑 `.env`，填入 RunningHub API Key：

```bash
RUNNINGHUB_API_KEY=你的 RunningHub API Key
```

构建并启动容器：

```bash
docker compose up -d --build
```

启动后访问：

```bash
前台：http://127.0.0.1:3000
后台：http://127.0.0.1:3000/admin
```

常用 Docker 命令：

```bash
docker compose ps
docker compose logs -f runninghub-app
docker compose down
```

## 🎯 功能特性

### ✅ 已实现
- 图片背景移除单页工具
- 图片上传（拖拽/点击）
- 图片预览与结果展示
- 透明、白色、自定义背景预览
- 调用 RunningHub API 创建真实任务
- 上传图片到 RunningHub 媒体接口
- 任务状态轮询
- 结果查询、展示与下载
- 后端代理读取环境变量中的 RunningHub API Key
- 中文管理后台首页 `/admin`
- 后台导航路由：工具管理、工作流配置、会员套餐、任务记录、内容管理、系统设置
- SQLite 保存工具配置与分类配置
- 后台工具新增/编辑保存 API
- 后台分类管理页面与分类保存 API
- 公开工具读取 API
- `/tools/:slug` 前台动态工具页
- 统一工具执行 API
- 本地 `execution_tasks` 任务记录
- 本地任务状态轮询与输出查询 API
- 后台工具测试执行面板
- 测试成功后才允许工具上线

### 🔧 待配置
- 管理后台登录鉴权
- 前台工具市场首页、分类筛选与搜索
- 用户、积分、会员、批量与云盘能力

## 📝 API 配置

### 当前配置方式
- **API 地址**: `https://www.runninghub.cn/openapi/v2`
- **任务查询地址**: `https://www.runninghub.cn/task/openapi`
- **认证方式**: 后端代理使用 `RUNNINGHUB_API_KEY` 作为 Bearer Token
- **工具配置来源**: SQLite `tools` 表
- **分类配置来源**: SQLite `tool_categories` 表
- **默认工具**: `remove-background`
- **默认前台路径**: `/tools/remove-background`

### 工作流调用配置

`frontend/index.html` 当前不再写死 workflowID、nodeId 和 fieldName。页面会根据 URL slug 请求 `GET /api/tools/:slug`，执行时调用 `POST /api/tools/:slug/execute`，由后端根据 `workflowId`、`instanceType`、`inputNodes` 和 `outputConfig` 组装 RunningHub 入参并创建本地任务记录。

### 环境变量说明

| 变量名 | 是否必填 | 说明 |
|--------|----------|------|
| `RUNNINGHUB_API_KEY` | 是 | RunningHub API Key，仅在后端读取 |
| `RUNNINGHUB_API_BASE_URL` | 否 | RunningHub 工作流与上传接口地址，默认 `https://www.runninghub.cn/openapi/v2` |
| `RUNNINGHUB_TASK_API_BASE_URL` | 否 | RunningHub 任务查询接口地址，默认 `https://www.runninghub.cn/task/openapi` |
| `DATABASE_PATH` | 否 | SQLite 数据库路径，默认 `./data/app.sqlite` |
| `HOST` | 否 | 服务监听地址，默认 `0.0.0.0`，用于 Docker 端口映射 |
| `PORT` | 否 | 本地服务端口，默认 `3000` |

## 🔌 RunningHub API 文档

### 后端代理调用示例

```bash
curl --location --request POST 'http://127.0.0.1:3000/api/runninghub/workflow/${workflowID}' \
--header 'Content-Type: application/json' \
--data-raw '{
  "addMetadata": true,
  "nodeInfoList": [
    {
      "nodeId": "9",
      "fieldName": "image",
      "fieldValue": "https://example.com/uploaded-image.png"
    }
  ],
  "instanceType": "default",
  "usePersonalQueue": false
}'
```

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/runninghub/upload` | POST | 后端代理上传图片并获取 RunningHub 临时 URL |
| `/api/runninghub/workflow/{workflowID}` | POST | 后端代理执行工作流 |
| `/api/runninghub/status` | POST | 后端代理查询任务状态 |
| `/api/runninghub/outputs` | POST | 后端代理获取任务结果 |
| `/api/tools` | GET | 前台公开工具列表，只返回已上线工具 |
| `/api/tools/{slug}` | GET | 前台公开工具详情，只返回已上线工具 |
| `/api/tools/{idOrSlug}/execute` | POST | 根据工具配置执行 RunningHub 工作流，并创建本地任务 |
| `/api/tasks/{taskId}` | GET | 查询本地任务状态，并同步 RunningHub 状态 |
| `/api/tasks/{taskId}/outputs` | GET | 查询任务输出并保存输出 URL |
| `/api/categories` | GET | 前台公开分类列表，只返回启用分类 |
| `/api/admin/tools` | GET | 后台工具配置列表 |
| `/api/admin/tools` | POST | 新增或更新后台工具配置 |
| `/api/admin/categories` | GET | 后台工具分类列表 |
| `/api/admin/categories` | POST | 新增或更新后台工具分类 |

## 🛠️ 技术栈

- **前端框架**: Vue 3 (CDN)
- **UI 组件**: Element Plus (CDN)
- **HTTP 客户端**: Axios (CDN)
- **后端运行时**: Node.js 原生 HTTP 服务
- **资料持久化**: SQLite、better-sqlite3
- **样式**: CSS3 (内联)
- **容器化**: Docker Desktop、Docker Compose

## 📚 项目文档

| 文档 | 说明 |
|------|------|
| [`docs/PRD.md`](docs/PRD.md) | 平台产品需求、功能范围、数据模型、API 与验收标准 |
| [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md) | 基于当前完成进度拆解的后续开发顺序、阶段依赖和验收点 |
| [`docs/MVP-REQUIREMENTS.md`](docs/MVP-REQUIREMENTS.md) | MVP 需求说明 |

## 📦 后续开发计划

### 第一阶段：MVP
- [x] 演示版 UI
- [x] 工作流 ID 配置
- [x] 图片上传对接
- [x] 任务状态轮询
- [x] 后台工具配置保存
- [x] 前台动态工具页基础
- [x] 统一工具执行 API
- [x] 本地任务记录
- [x] 后台测试执行与上线流程
- [ ] 前台工具市场首页

### 第二阶段：完整版
- [ ] Vue 3 + TypeScript + Vite 项目重构
- [ ] 用户注册/登录
- [ ] 调用次数统计
- [ ] 充值系统

### 第三阶段：生产环境
- [ ] 后端 API 服务
- [ ] 数据库设计
- [ ] 任务队列
- [ ] 管理后台

## ❓ 常见问题

### Q: 如何获取工作流 ID？
A: 登录 RunningHub 平台，在工作流详情页可以找到工作流 ID。

### Q: API 调用失败怎么办？
A: 检查：
1. API Key 是否正确
2. 工作流 ID 是否存在
3. 网络连接是否正常
4. 工作流是否已发布

### Q: 支持哪些图片格式？
A: 支持 JPG、PNG、WebP 等常见格式，单个文件最大 10MB。

## 📞 联系方式

如有问题或建议，请联系开发者。

---

**版本**: v1.0.0
**更新日期**: 2026-07-10

---

## 会话总结记录

### 2026-07-10 13:16 HKT - RunningHub API 调用复测

- **会话主要目的**：使用用户提供的 RunningHub workflowID 重新测试工作流调用。
- **完成的主要任务**：阅读 `README.md`、`package.json`、`index.html`、`PRD.md` 等项目文件，确认当前演示页调用端点为 `https://www.runninghub.cn/openapi/v2/run/workflow/{workflowID}`，并使用 workflowID `1874771518335922177` 发起命令行复测。
- **关键决策和解决方案**：未将完整 API 密钥写入新增文档内容；先使用 README 中定义的请求体进行最小连通性测试，避免在缺少节点参数说明时扩大调用范围。
- **使用的技术栈**：Vue 3 CDN、Element Plus CDN、Axios、curl。
- **新增或修改文件**：仅追加更新 `README.md` 会话总结；未修改业务代码。
- **测试结果**：沙箱内请求返回 DNS 解析失败，外网授权复测请求未被审批系统放行，因此本轮未能完成 RunningHub 真实接口调用验证。
- **后续建议**：在允许外网访问后重新执行同一 workflowID 调用；同时建议将 API 密钥迁移到后端或环境变量，避免继续保存在前端静态页面中。

### 2026-07-10 13:23 HKT - RunningHub API 授权后复测成功

- **会话主要目的**：在外网连接授权后，重新验证 RunningHub 工作流真实调用链路。
- **完成的主要任务**：使用 workflowID `1874771518335922177` 成功创建任务，轮询任务状态，并获取最终输出结果。
- **关键决策和解决方案**：创建任务沿用项目当前 `/openapi/v2/run/workflow/{workflowID}` 接口；状态和输出查询改用 RunningHub 官方当前接口 `/task/openapi/status` 与 `/task/openapi/outputs`，因为旧 README 中的 GET 查询路径返回 `PARAMS_INVALID`。
- **使用的技术栈**：curl、RunningHub OpenAPI。
- **新增或修改文件**：仅追加更新 `README.md` 会话总结；未修改业务代码。
- **测试结果**：任务创建成功，taskId 为 `2075449516789813249`；任务最终状态为 `SUCCESS`；输出结果为 PNG 文件，taskCostTime 为 `229`，consumeCoins 为 `46`。
- **后续建议**：更新前端轮询和结果查询逻辑，改为调用 `/task/openapi/status` 与 `/task/openapi/outputs`；同时将 API 密钥迁移到后端或环境变量中，避免暴露在静态页面。

### 2026-07-10 13:55 HKT - 配置真实工作流图片输入节点

- **会话主要目的**：根据 RunningHub 工作流文档配置真实图片上传与任务执行流程。
- **完成的主要任务**：将演示页工作流改为 `图生图 + 高清修复`；配置 workflowID `1874771518335922177`、图片输入节点 `nodeId: 47`、`instanceType: default`；新增图片上传、任务创建、状态轮询、结果查询流程。
- **关键决策和解决方案**：先调用 `/openapi/v2/media/upload/binary` 获取图片 URL，再通过 `nodeInfoList` 将 URL 传入节点 `47`，随后使用 `/task/openapi/status` 和 `/task/openapi/outputs` 完成轮询与结果读取。
- **使用的技术栈**：Vue 3 CDN、Element Plus CDN、Axios、RunningHub OpenAPI。
- **新增或修改文件**：修改 `index.html` 的工作流执行逻辑；更新 `README.md` 的接口配置、端点说明与会话总结。
- **后续建议**：继续将 API Key 从前端静态页面迁移到后端代理，避免密钥暴露；后续可补充失败原因详情展示和任务取消能力。

### 2026-07-10 14:42 HKT - 更换照片修复 F2K 工作流

- **会话主要目的**：因上一工作流任务执行失败，切换到新的 RunningHub 工作流重新配置调用参数。
- **完成的主要任务**：将演示页工作流切换为 `照片修复 F2K`，配置 workflowID `2075457256463880193`、加载图像节点 `nodeId: 31`、最长边数字输入节点 `nodeId: 27`，并在界面新增“最长边”数字输入控件。
- **关键决策和解决方案**：图片仍先上传到 `/openapi/v2/media/upload/binary` 获取 URL；创建任务时在 `nodeInfoList` 同时传入图片节点和最长边节点；最长边节点字段使用 `fieldName: "value"`，默认值为 `1536`。
- **使用的技术栈**：Vue 3 CDN、Element Plus CDN、Axios、RunningHub OpenAPI。
- **新增或修改文件**：修改 `index.html` 的工作流配置、参数表单和任务入参；更新 `README.md` 的接口配置、调用示例与会话总结。
- **后续建议**：如 RunningHub 返回节点字段错误，应根据工作流文档把最长边节点的 `fieldName` 从 `value` 调整为实际字段名。

### 2026-07-10 14:58 HKT - 照片修复 F2K 工作流真实复测成功

- **会话主要目的**：对新工作流 `2075457256463880193` 进行真实 RunningHub 调用复测，确认节点配置是否可用。
- **完成的主要任务**：启动本地静态服务验证页面可访问；使用真实尺寸测试照片调用上传、创建任务、状态轮询和结果查询完整链路。
- **关键决策和解决方案**：继续使用图片节点 `nodeId: 31`、`fieldName: "image"` 和最长边节点 `nodeId: 27`、`fieldName: "value"`；测试发现 64x64 临时小图可创建任务但最终失败，改用 768x512 测试照片后任务成功。
- **使用的技术栈**：Vue 3 CDN、Element Plus CDN、Axios、Node.js fetch、RunningHub OpenAPI、Python 静态服务器。
- **新增或修改文件**：追加更新 `README.md` 会话总结；本轮未修改 `index.html`。
- **测试结果**：本地页面 `http://127.0.0.1:8081/index.html` 返回 200；真实任务 taskId 为 `2075473961348714498`，最终状态 `SUCCESS`，输出 1 张 PNG，`taskCostTime` 为 `58`，`consumeCoins` 为 `12`。
- **后续建议**：建议用户上传正常尺寸照片测试；生产化前仍应将 API Key 迁移到后端代理或环境变量，避免静态页面泄露密钥。

### 2026-07-10 15:16 HKT - API Key 迁移到后端环境变量

- **会话主要目的**：将 RunningHub API Key 从前端静态页面迁移到后端环境变量，避免在浏览器源码中暴露密钥。
- **完成的主要任务**：新增 Node.js 后端代理 `server.js`；新增 `.env.example`；前端调用改为 `/api/runninghub/*`；新增 `npm start` 和 `npm test` 脚本；更新 README 启动方式与接口说明。
- **关键决策和解决方案**：后端启动时读取 `.env` 或系统环境变量中的 `RUNNINGHUB_API_KEY`；图片上传、创建任务、状态查询、结果查询均由后端代理转发到 RunningHub；前端只保留工作流节点配置和 taskId。
- **使用的技术栈**：Vue 3 CDN、Element Plus CDN、Axios、Node.js 原生 HTTP 服务、RunningHub OpenAPI。
- **新增或修改文件**：新增 `server.js`、`.env.example`、`package.json`；修改 `frontend/index.html`、`README.md`。

### 2026-07-10 16:54 HKT - 挂载到 Docker Desktop 运行

- **会话主要目的**：将 `runninghub-app` 配置为可在 Docker Desktop 中构建、启动和访问的容器服务。
- **完成的主要任务**：新增 `Dockerfile`、`.dockerignore`、`docker-compose.yml`；调整 `server.js` 监听 `0.0.0.0`；补充 Docker 启动、日志和停止命令。
- **关键决策和解决方案**：使用 Node.js 22 Alpine 作为运行镜像；通过 `env_file: .env` 读取 RunningHub API Key，避免密钥写入镜像；将宿主机 `3000` 端口映射到容器 `3000` 端口；通过 bind mount 将本地 `server.js`、`frontend/`、`package.json` 挂载到容器 `/app`。
- **使用的技术栈**：Node.js 原生 HTTP 服务、Docker Desktop、Docker Compose。
- **新增或修改文件**：新增 `Dockerfile`、`.dockerignore`、`docker-compose.yml`；修改 `server.js`、`.env.example`、`README.md`。
- **测试结果**：已通过 `npm test`；已执行 `docker compose up -d --build`；`docker compose ps` 显示 `runninghub-app` 正常运行；访问 `http://127.0.0.1:3000/` 返回 `200 OK`。
- **后续建议**：后续可增加 Docker 健康检查与生产环境反向代理配置，例如 Nginx 或 Caddy。

### 2026-07-10 18:11 HKT - 图片背景移除页面改版

- **会话主要目的**：参考用户提供的图片，设计图片背景移除单页工具，并接入指定 RunningHub 工作流。
- **完成的主要任务**：将首页改为图片背景移除工具界面；新增上传、透明/白色/自定义背景预览、移除背景、任务状态提示和下载 PNG 交互；配置 workflowID `2075488908690935809` 与加载图像节点 `nodeId: 9`。
- **关键决策和解决方案**：保留现有 Node.js 后端代理隐藏 RunningHub API Key；前端只传入图片节点参数，背景选项作为结果预览控制，避免向未知 RunningHub 节点传入不确定字段。
- **使用的技术栈**：Vue 3 CDN、Element Plus CDN、Axios、Node.js 原生 HTTP 服务、RunningHub OpenAPI。
- **新增或修改文件**：修改 `frontend/index.html`；更新 `README.md` 的项目说明、工作流配置、调用示例与本次会话总结。
- **测试结果**：已通过 `npm test` 的后端与前端脚本语法检查。
- **后续建议**：如需导出白色或自定义底色的合成 PNG，可后续增加 canvas 合成下载；如工作流还有背景颜色节点，应根据 RunningHub 节点文档补充对应 `nodeInfoList` 参数。

### 2026-07-10 18:29 HKT - Picsman 参考版 PRD 更新

- **会话主要目的**：根据 Picsman 官网形态，重新更新产品 PRD，明确前台工具平台与后台 RunningHub 工作流配置能力。
- **完成的主要任务**：将 `docs/PRD.md` 重写为 v2.0，覆盖首页工具市场、工具详情页、价格页、用户中心、后台工具管理、workflowID/nodeId/fieldName 配置、输出解析、任务记录、API、权限、安全、里程碑与验收标准。
- **关键决策和解决方案**：产品方向从单一工作流演示升级为类 Picsman 的 AI 图片与视频工具矩阵；后台通过配置化方式新增工具，前端动态渲染输入表单，后端统一代理 RunningHub 调用。
- **使用的技术栈**：Vue 3、TypeScript、Vite、Element Plus、Tailwind CSS、Node.js、RunningHub OpenAPI。
- **新增或修改文件**：修改 `docs/PRD.md`；追加更新 `README.md` 会话总结。
- **测试结果**：本次仅更新文档，未修改业务代码；已检查 PRD 中包含 Picsman 参考、后台配置、workflowID、nodeId、fieldName、输出解析和当前图片背景移除工作流信息。
- **后续建议**：下一步可按 PRD 拆分开发任务，优先实现后台工具 CRUD 与配置化执行链路。

### 2026-07-10 18:56 HKT - 会员云盘批量处理 PRD 补充

- **会话主要目的**：补充会员功能，支持用户连接 Google Drive / Dropbox 批量处理图片。
- **完成的主要任务**：将 `docs/PRD.md` 升级到 v2.1，新增会员权益、云盘连接入口、批量处理页、文件选择规则、结果回写云盘、后台套餐配置、云盘连接管理、批量任务管理、OAuth 集成要求、数据模型、API、权限安全、里程碑和验收标准。
- **关键决策和解决方案**：云盘批量处理作为 Pro/Team 会员权益；采用 OAuth 2.0 授权，后端加密保存 token；批量任务进入队列并按会员等级限制数量、文件大小、并发和回写能力。
- **使用的技术栈**：Vue 3、TypeScript、Node.js、RunningHub OpenAPI、Google Drive API、Dropbox API、OAuth 2.0。
- **新增或修改文件**：修改 `docs/PRD.md`；追加更新 `README.md` 会话总结。
- **测试结果**：本次仅更新文档，未修改业务代码；已检查 PRD 中包含 Google Drive、Dropbox、会员套餐、批量任务、云盘回写、token 安全和验收要求。
- **后续建议**：下一步建议拆分技术设计，优先确定 OAuth 回调、token 加密、批量队列和云盘文件选择方案。

### 2026-07-10 19:03 HKT - 前台中英双语与后台中文 PRD 补充

- **会话主要目的**：明确网站前台需要中英双语，后台管理界面只需要中文。
- **完成的主要任务**：将 `docs/PRD.md` 升级到 v2.2，新增前台语言策略、语言切换规则、文案回退规则、前台双语覆盖范围、后台中文录入要求、i18n 数据模型、SEO hreflang、API locale 返回、里程碑和验收标准。
- **关键决策和解决方案**：前台支持 `zh-CN` 与 `en-US`；后台界面固定中文，但工具名称、描述、表单字段、选项、SEO 和教程等前台展示内容需要录入中英文；缺少英文时前台回退中文并在后台标记翻译缺失。
- **使用的技术栈**：Vue 3、TypeScript、Vue Router、i18n、本地化 SEO。
- **新增或修改文件**：修改 `docs/PRD.md`；追加更新 `README.md` 会话总结。
- **测试结果**：本次仅更新文档，未修改业务代码；已检查 PRD 中包含 `zh-CN`、`en-US`、`LocalizedText`、前台 API locale、后台中文和双语验收要求。
- **后续建议**：实现前建议先确定前台路由语言前缀、英文 slug 策略和后台翻译缺失提示规则。

### 2026-07-10 19:31 HKT - Cockpit Headless CMS 后台二次开发评估

- **会话主要目的**：评估后台是否可以结合 Cockpit Headless CMS 做二次开发。
- **完成的主要任务**：阅读 Cockpit 官方文档，确认其自托管 Headless CMS、REST/GraphQL、内容模型、多语言、角色权限、hooks/events、token 认证等能力；将 `docs/PRD.md` 升级到 v2.3，新增 Cockpit 二次开发评估、适合/不适合模块、内容模型建议、集成方式、工作量、风险、推荐方案、API、里程碑和验收要求。
- **关键决策和解决方案**：建议采用“Cockpit 管内容和工具配置 + 自研 Node 服务管业务执行”的混合架构；Cockpit 可管理工具目录、分类、首页、FAQ、Blog、SEO、双语文案和非敏感 RunningHub 配置；用户会员、订单扣费、批量队列、云盘 token、RunningHub 执行和统计仍由自研服务负责。
- **使用的技术栈**：Cockpit Headless CMS、PHP 8.3+、SQLite/MongoDB、Vue 3 管理界面、Node.js、RunningHub OpenAPI。
- **新增或修改文件**：修改 `docs/PRD.md`；追加更新 `README.md` 会话总结。
- **测试结果**：本次仅更新文档，未修改业务代码；已检查 PRD 中包含 Cockpit 架构定位、CMS 内容模型、Node 聚合 API、敏感信息边界和验收要求。
- **后续建议**：下一步可用 Docker Compose 做 Cockpit POC，先建 `tools`、`tool_categories`、`home_page`、`faqs`、`blog_posts` 模型，并验证 Node API 读取工具配置后执行 RunningHub 工作流。

### 2026-07-10 20:07 HKT - 会员推荐奖励 PRD 补充

- **会话主要目的**：新增会员推荐功能，推荐会员注册送 100 积分，每个账号最多推荐 5 人。
- **完成的主要任务**：将 `docs/PRD.md` 升级到 v2.4，新增会员推荐奖励规则、用户推荐页、推荐链接格式、后台推荐奖励管理、推荐奖励发放流程、数据模型、API、风控、安全、里程碑和验收标准。
- **关键决策和解决方案**：每成功推荐 1 个新注册用户，推荐人获得 100 积分；每个推荐人账号最多奖励 5 人；奖励需要通过新用户注册校验和基础风控；积分变动必须写入积分流水。
- **使用的技术栈**：Vue 3、TypeScript、Node.js、自研会员系统、积分流水。
- **新增或修改文件**：修改 `docs/PRD.md`；追加更新 `README.md` 会话总结。
- **测试结果**：本次仅更新文档，未修改业务代码；已检查 PRD 中包含推荐码、推荐链接、100 积分、5 人上限、ReferralRecord、CreditLedger、API 和风控要求。
- **后续建议**：实现前建议确认奖励发放时机，是注册即发放，还是邮箱验证或首次任务完成后再发放。

### 2026-07-10 22:50 HKT - 撤销 Cockpit POC 并回到 Node.js 后台方向

- **会话主要目的**：因 Cockpit CMS 基于 PHP，与原定 Node.js 后台技术方向不符，回档到部署 Cockpit 前并删除 Cockpit POC。
- **完成的主要任务**：移除 `cockpit-blog-studio` Docker 容器及匿名卷；删除工作区中的 `cockpit-core/`、临时 `addons/`、临时 `docs/` Cockpit 相关目录；将 PRD 从 Cockpit 混合架构调整为 Node.js 自研中文管理后台方案。
- **关键决策和解决方案**：不再采用 Cockpit 作为后台或 Blog CMS；工具配置、Blog、FAQ、SEO、会员、订单、任务、云盘连接和推荐奖励统一由 Node.js 自研后台实现。
- **使用的技术栈**：Node.js、Vue 3、RunningHub OpenAPI、Docker Desktop。
- **新增或修改文件**：修改 `docs/PRD.md`；追加更新 `README.md` 会话总结；删除 Cockpit POC 目录和容器资源。
- **测试结果**：已确认 Docker 中无 Cockpit 容器；工作区已无 `cockpit-core/`、临时 `addons/`、临时 `docs/` 目录；本次未修改业务代码，未运行业务测试。
- **后续建议**：下一步可在 `runninghub-app` 内按 Node.js 技术栈重新设计管理后台，优先实现后台登录、工具 CRUD、workflowID/nodeId/fieldName 配置和测试执行。

### 2026-07-10 23:02 HKT - 三级会员套餐 PRD 更新

- **会话主要目的**：根据用户提供的会员制参考图，将会员体系改为三级订阅方案。
- **完成的主要任务**：将 `docs/PRD.md` 升级到 v2.6，新增 PRO、PRO+、PRO MAX 三档套餐，补充月付/年付切换、PRO+ 最受欢迎标记、价格、积分、图片额度、视频额度、生成优先级和高清无水印下载权益。
- **关键决策和解决方案**：价格页默认展示三列套餐卡片；后台可配置价格、年付折扣、热门徽标、每日使用次数、每月积分、图片/视频额度、云盘批量处理、并发和排序；`MembershipPlan` 类型同步改为 `pro`、`pro_plus`、`pro_max`。
- **使用的技术栈**：Vue 3、TypeScript、Node.js 自研后台、RunningHub OpenAPI。
- **新增或修改文件**：修改 `docs/PRD.md`；追加更新 `README.md` 会话总结。
- **测试结果**：本次仅更新文档，未修改业务代码；已检查 PRD 中包含 PRO / PRO+ / PRO MAX、默认价格、权益、后台配置字段、API 和验收标准。
- **后续建议**：实现后台时优先初始化三档套餐种子数据，并确保已有订阅用户的套餐不能被直接删除。

### 2026-07-10 23:18 HKT - 管理后台首页与导航路由开发

- **会话主要目的**：尝试开发 Node.js 自研管理后台首页，并建立基础导航路由。
- **完成的主要任务**：新增 `frontend/admin.html` 中文后台页面；实现后台仪表盘、工具管理、工作流配置、会员套餐、任务记录、内容管理、系统设置导航；在 `server.js` 中增加 `/admin` 与 `/admin/*` 静态路由回退；更新 `npm test` 检查后台脚本语法。
- **关键决策和解决方案**：当前项目仍是轻量 Node.js + Vue CDN 结构，因此先用独立 `admin.html` 做后台 SPA 雏形，不引入 Vite 和 Vue Router；通过 History API 建立前端导航路由，刷新 `/admin/tools` 等路径时由 Node 服务返回后台页面。
- **使用的技术栈**：Node.js 原生 HTTP 服务、Vue 3 CDN、Element Plus CDN、CSS3。
- **新增或修改文件**：新增 `frontend/admin.html`；修改 `server.js`、`package.json`、`README.md`。
- **测试结果**：已将后台页面脚本加入 `npm test`；本次后续通过命令行执行语法检查和路由访问验证。
- **后续建议**：下一步补充后台登录鉴权、工具配置保存 API、会员套餐种子数据和数据库持久化。

### 2026-07-11 00:18 HKT - 工具新增页与动态输入节点配置

- **会话主要目的**：根据用户反馈，将 RunningHub 工作流配置调整为工具管理中的新增/编辑工具配置页面。
- **完成的主要任务**：移除左侧独立“工作流配置”导航入口；工具列表中的“新增工具”和“配置”按钮进入同一个工具配置表单；表单中保留固定 `workflowID`，并支持动态添加和删除输入节点。
- **关键决策和解决方案**：输入节点采用可重复配置卡片，每个节点可配置 `nodeId`、内容项字段、后台字段名、数据类型、前台标签、占位提示、默认值和必填状态；数据类型支持 `image`、`video`、数字、多行文字、单行文字和下拉列表；下拉列表支持动态添加和删除选项。
- **使用的技术栈**：Vue 3 CDN、Node.js 原生 HTTP 服务、CSS3。
- **新增或修改文件**：修改 `frontend/admin.html`；追加更新 `README.md` 会话总结。
- **测试结果**：已通过 `npm test`；已重启 Docker 服务；验证 `/admin/tools` 与 `/admin/workflows` 返回 `200 OK`，页面包含新增工具配置、输入节点配置、内容项字段、数据类型和下拉选项。
- **后续建议**：下一步接入保存 API 和数据库，将工具配置持久化，并在前台工具页按这些输入节点动态渲染表单。

### 2026-07-11 00:27 HKT - 上传数据类型调整为 image / video

- **会话主要目的**：根据用户反馈，修正后台工具配置中上传类数据类型的命名。
- **完成的主要任务**：将动态输入节点的数据类型下拉从“图片上传”调整为明确的 `image`，并新增 `video` 上传类型；同步更新字段占位提示和示例节点。
- **关键决策和解决方案**：后台数据类型表达接口语义，上传类型统一使用 `image` / `video`，而不是控件描述；前台标签仍可配置为“上传图片”“上传影片”等展示文案。
- **使用的技术栈**：Vue 3 CDN、Node.js 原生 HTTP 服务、CSS3。
- **新增或修改文件**：修改 `frontend/admin.html`；追加更新 `README.md` 会话总结。
- **测试结果**：本次后续执行 `npm test` 和 Docker 页面访问验证。
- **后续建议**：后续保存 API 中应将 `dataType=image` 映射为图片上传处理，将 `dataType=video` 映射为视频上传处理。

### 2026-07-11 00:35 HKT - 页面中文显示统一繁体中文规则

- **会话主要目的**：写入项目规则，要求所有页面显示的中文均为繁体中文。
- **完成的主要任务**：将 `docs/PRD.md` 升级到 v2.7，明确所有前台、后台、按钮、表单、提示、错误信息、FAQ、Blog、SEO 文案和系统通知中的中文必须使用繁体中文；将中文 locale 从 `zh-CN` 调整为 `zh-HK`；同步更新 `frontend/admin.html` 的 HTML lang。
- **关键决策和解决方案**：中英文双语仍保留，但中文语种统一为繁体中文 `zh-HK`，不允许页面显示简体中文。
- **使用的技术栈**：Vue 3 CDN、Node.js 原生 HTTP 服务、i18n 规则。
- **新增或修改文件**：修改 `docs/PRD.md`、`frontend/admin.html`；追加更新 `README.md` 会话总结。
- **测试结果**：本次后续执行 `npm test` 检查页面脚本语法。
- **后续建议**：后续新增页面或文案时先检查是否为繁体中文，再提交测试。

### 2026-07-11 00:48 HKT - PRD 开发顺序分析

- **会话主要目的**：根据 PRD 和当前代码状态，分析后续开发应从哪里开始，以及用户需要提供哪些资料。
- **完成的主要任务**：梳理 MVP 主链路，明确优先级应先完成数据持久化、后台工具配置保存、前台动态工具读取、RunningHub 执行记录，再继续会员、支付、云盘和内容模块。
- **关键决策和解决方案**：建议先从“工具配置闭环”开始，而不是先做会员或云盘；只有工具配置、执行、记录和前台动态渲染打通后，后续积分扣费、会员权益、批量任务才有可靠基础。
- **使用的技术栈**：Node.js、Vue 3、RunningHub OpenAPI、Docker Desktop。
- **新增或修改文件**：未修改业务代码；仅追加更新 `README.md` 会话总结。
- **测试结果**：本次仅做开发顺序分析，未运行测试。
- **后续建议**：下一步先确认数据库选型、首批工具清单、RunningHub 工作流节点资料和后台管理员登录方式。

### 2026-07-11 23:15 HKT - SQLite 與工具配置保存 API

- **會話主要目的**：直接開始實作平台地基：SQLite、工具配置保存 API、後台新增工具保存。
- **完成的主要任務**：新增 SQLite 資料庫初始化；新增工具配置 Repository；建立 `tools` 表；實作 `/api/admin/tools` 的 GET 列表和 POST 新增/更新；後台工具表單接入 API；Docker 建置安裝 `better-sqlite3` 並掛載 `data/` 持久化目錄。
- **關鍵決策和解決方案**：MVP 階段使用 SQLite + JSON 欄位保存動態輸入節點和輸出配置；工具配置先用結構化驗證保護必填欄位，包括工具名稱、工具識別碼、workflowID、至少一個輸入節點、nodeId、內容項欄位和 dataType。
- **使用的技術棧**：Node.js、SQLite、better-sqlite3、Vue 3 CDN、Docker Desktop。
- **新增或修改文件**：新增 `src/database.js`、`src/toolRepository.js`、`package-lock.json`；修改 `server.js`、`frontend/admin.html`、`package.json`、`Dockerfile`、`docker-compose.yml`、`.env.example`、`.gitignore`、`README.md`。
- **測試結果**：已通過 `npm test`；已執行 `docker compose up -d --build`；驗證 `/api/admin/tools` 可讀取預設工具；POST 新增測試影片工具成功並持久化到 `data/app.sqlite`。
- **後續建議**：下一步實作後台登入鑑權，並把前台工具頁改為從 `/api/admin/tools` 或公開工具 API 動態讀取配置。

### 2026-07-12 21:48 HKT - 工具預覽圖片與資料庫欄位

- **會話主要目的**：為每個工具項目新增預覽圖片能力，並優化新增/編輯工具配置頁面 UI。
- **完成的主要任務**：在 SQLite `tools` 表新增 `preview_image_url` 欄位；工具 Repository 支援保存、更新、回傳 `previewImageUrl`；後台工具列表新增縮略圖與查看原圖入口；新增/編輯工具配置頁新增「預覽圖片 URL」欄位和即時預覽卡片。
- **關鍵決策和解決方案**：預覽圖片作為工具的一級配置欄位保存，避免混入動態輸入節點；資料庫啟動時自動補欄位，兼容既有 `data/app.sqlite`；既有 `remove-background` 預設工具會自動回填一張預覽圖。
- **使用的技術棧**：Node.js、SQLite、better-sqlite3、Vue 3 CDN、CSS3。
- **新增或修改文件**：修改 `src/database.js`、`src/toolRepository.js`、`frontend/admin.html`、`README.md`。
- **測試結果**：已通過 `npm test`；已用本地 SQLite 初始化檢查確認 `tools` 表包含 `preview_image_url`，且預設工具已回填預覽圖片 URL。
- **後續建議**：下一步可新增本地圖片上傳接口，讓後台直接上傳預覽圖，而不是只填外部 URL。

### 2026-07-12 22:18 HKT - PRD 後續開發順序文檔

- **會話主要目的**：根據 PRD 和目前已完成的 SQLite、工具配置保存 API、後台新增工具保存，分析後續平台開發順序並寫入文檔。
- **完成的主要任務**：新增 `docs/DEVELOPMENT_ROADMAP.md`，將後續工作拆成公開工具 API、前台動態工具頁、統一工具執行 API、本地任務記錄、後台測試執行、分類首頁、後台鑑權、用戶積分、會員雲盤批量和內容 SEO 等階段。
- **關鍵決策和解決方案**：後續不按 PRD 模塊平鋪開發，而按依賴鏈推進；優先完成「後台配置工具 -> 前台展示工具 -> 用戶執行工具 -> 本地記錄任務」閉環，再進入會員、積分、雲盤和推薦獎勵。
- **使用的技術棧**：Node.js、SQLite、Vue 3 CDN、RunningHub OpenAPI、Markdown 文檔。
- **新增或修改文件**：新增 `docs/DEVELOPMENT_ROADMAP.md`；修改 `README.md`，補充項目文檔入口並追加本次會話總結。
- **測試結果**：本次僅更新文檔，未修改業務代碼；已檢查 README 文檔入口和路線圖內容。
- **後續建議**：下一次開發建議直接從 `GET /api/tools`、`GET /api/tools/:slug` 和 `/tools/remove-background` 動態讀取配置開始。

### 2026-07-12 22:46 HKT - 工具分類管理與參考網站定位

- **會話主要目的**：補齊後台工具分類能力，並明確平台 UI 與功能參考網站。
- **完成的主要任務**：新增 `tool_categories` 資料表和 `tools.category_id` 欄位；初始化「圖像、視頻、音頻、文本」四個分類；新增分類 Repository；新增 `/api/admin/categories` GET/POST；後台新增「分類管理」路由和頁面；工具列表展示分類；新增/編輯工具頁新增分類下拉選項。
- **關鍵決策和解決方案**：MVP 先使用四個主分類，後續再擴展二級分類和前台導航排序；UI 風格參考 `neural.love/tools`，功能與工具矩陣參考 `picsman.ai`。
- **使用的技術棧**：Node.js、SQLite、better-sqlite3、Vue 3 CDN、CSS3、Markdown 文檔。
- **新增或修改文件**：新增 `src/categoryRepository.js`；修改 `src/database.js`、`src/toolRepository.js`、`server.js`、`frontend/admin.html`、`package.json`、`docs/PRD.md`、`docs/DEVELOPMENT_ROADMAP.md`、`README.md`。
- **測試結果**：已通過 `npm test`；已用本地 SQLite 初始化檢查確認分類資料表和四個預設分類存在。
- **後續建議**：下一步開發公開工具 API 時，將分類欄位一起返回給前台，並在工具市場首頁實作 neural.love 風格的搜尋和分類切換。

### 2026-07-12 16:36 HKT - 公開工具 API 與前台動態工具頁

- **會話主要目的**：按開發順序推進下一步，完成「後台配置工具 -> 前台讀取工具配置」的基礎閉環。
- **完成的主要任務**：新增公開工具 API `GET /api/tools`、`GET /api/tools/:slug` 和公開分類 API `GET /api/categories`；前台 `/tools/:slug` 改為從資料庫讀取工具名稱、描述、分類、預覽圖、workflowID、instanceType 和輸入節點；保留現有 RunningHub 代理執行能力；修正工具頁通用文案與 `zh-HK` 語言標記。
- **關鍵決策和解決方案**：本輪先完成公開讀取 API 和動態工具頁，不直接跨到統一執行 API；前台暫時仍調用 `/api/runninghub/*`，下一步再改為 `POST /api/tools/:toolId/execute` 並建立本地任務記錄。
- **使用的技術棧**：Node.js 原生 HTTP、SQLite、better-sqlite3、Vue 3 CDN、Element Plus CDN、Axios、Docker Compose。
- **新增或修改文件**：修改 `server.js`、`src/toolRepository.js`、`frontend/index.html`、`docs/DEVELOPMENT_ROADMAP.md`、`README.md`。
- **測試結果**：已通過 `npm test`；Docker 容器 `runninghub-app` 正常運行；已驗證 `GET /api/tools`、`GET /api/tools/remove-background`、`GET /api/categories` 返回成功；已驗證 `/tools/remove-background` 返回 `200` 並包含動態工具載入程式碼；不存在工具返回 `404 TOOL_NOT_FOUND`。
- **後續建議**：下一步開發統一工具執行 API、本地 `execution_tasks` 任務表、任務狀態查詢和輸出查詢，讓前台不再直接拼 RunningHub workflow 請求。

### 2026-07-12 18:38 HKT - 統一工具執行 API 與本地任務記錄

- **會話主要目的**：完成下一步開發，讓前台通過統一工具執行 API 建立任務，並把 RunningHub taskId、輸入、節點參數、輸出和錯誤持久化到本地。
- **完成的主要任務**：新增 `execution_tasks` 資料表；新增 `src/taskRepository.js`；新增 `POST /api/tools/:idOrSlug/execute`、`GET /api/tasks/:taskId`、`GET /api/tasks/:taskId/outputs`；前台工具頁改為提交本地工具任務並輪詢本地 taskId；後端根據工具配置組裝 `nodeInfoList`，支援 image/video Data URL 上傳到 RunningHub。
- **關鍵決策和解決方案**：執行 API 在調用 RunningHub 前先建立本地任務，配置校驗或 RunningHub 建立失敗也會留下 `FAILED` 任務記錄；輸出 URL 使用工具 `outputConfig.fallbackPaths` 解析；保留 `/api/runninghub/*` 代理作為底層兼容能力，但前台業務不再直接拼 workflow 請求。
- **使用的技術棧**：Node.js 原生 HTTP、SQLite、better-sqlite3、Vue 3 CDN、Axios、RunningHub OpenAPI。
- **新增或修改文件**：新增 `src/taskRepository.js`；修改 `src/database.js`、`src/toolRepository.js`、`server.js`、`frontend/index.html`、`package.json`、`docs/DEVELOPMENT_ROADMAP.md`、`README.md`。
- **測試結果**：已通過 `npm test`；已用臨時 SQLite 和臨時服務驗證 `execution_tasks` 表建立成功；已驗證缺少必填圖片時 `POST /api/tools/remove-background/execute` 返回 `422 INPUT_VALUE_REQUIRED` 並寫入本地 `FAILED` 任務；已驗證不存在任務返回 `404 TASK_NOT_FOUND`。
- **後續建議**：下一步開發後台工具測試執行和上線狀態，讓管理員能在工具上線前驗證 workflowID、nodeId、fieldName 和輸出解析是否可用。

### 2026-07-12 21:21 HKT - GitHub Actions 部署流程修復

- **會話主要目的**：排查 GitHub Actions `build-and-deploy` 失敗，並重試同步更新。
- **完成的主要任務**：修正 `.github/workflows/deploy.yml`，移除已不符合當前倉庫結構的 `cd frontend`、`cd ../backend`、`npm run build`、`npm run lint` 步驟；改為在倉庫根目錄使用 `npm ci` 安裝依賴並執行 `npm test`。
- **關鍵決策和解決方案**：目前專案是根目錄 Node.js 原生 HTTP + Vue CDN 結構，沒有獨立 `frontend/package.json` 或 `backend/` 目錄；GitHub Actions 改用 Node.js 22，匹配 `better-sqlite3` 的支援版本，避免 Node 18 engine 警告。
- **使用的技術棧**：GitHub Actions、Node.js 22、npm、SQLite、better-sqlite3。
- **新增或修改文件**：修改 `.github/workflows/deploy.yml`；追加更新 `README.md` 會話總結。
- **測試結果**：本地已通過 `npm ci` 和 `npm test`。
- **後續建議**：推送後由 GitHub Actions 自動重新執行；若未來引入 Vite 前端工程化，再新增正式 build 步驟。

### 2026-07-12 21:50 HKT - 後台工具測試執行與前台動態頁增強

- **會話主要目的**：完成「後台工具測試執行 + 上線狀態」階段，並補強前台動態工具頁對不同輸入類型的支援。
- **完成的主要任務**：新增工具測試狀態欄位 `last_test_status`、`last_test_task_id`、`last_test_error`、`last_tested_at`；新增 `POST /api/admin/tools/:id/test` 和 `PATCH /api/admin/tools/:id/status`；後台工具配置頁新增測試面板，可根據輸入節點動態填寫測試值、上傳測試圖片/影片、發起測試、輪詢本地任務並展示輸出；工具列表新增測試狀態和上線/停用操作；前台工具頁主上傳節點從圖片泛化為 image/video，上傳提示和 accept 會按配置切換。
- **關鍵決策和解決方案**：後台測試執行復用統一工具執行 API；測試任務先返回本地 taskId，由後台頁面輪詢 `/api/tasks/:taskId` 和 `/api/tasks/:taskId/outputs`；只有 `last_test_status=success` 的工具才能切換為 `active`，測試失敗保留草稿或停用狀態。
- **使用的技術棧**：Node.js 原生 HTTP、SQLite、better-sqlite3、Vue 3 CDN、Axios、RunningHub OpenAPI。
- **新增或修改文件**：修改 `src/database.js`、`src/toolRepository.js`、`server.js`、`frontend/admin.html`、`frontend/index.html`、`docs/DEVELOPMENT_ROADMAP.md`、`README.md`。
- **測試結果**：已通過 `npm test`；已用臨時 SQLite 和假 RunningHub 地址驗證未測試工具上線返回 `409 TOOL_TEST_REQUIRED`；測試執行網絡失敗時會寫回 `lastTestStatus=failed` 和可讀錯誤。
- **後續建議**：下一步建議做前台工具市場首頁、分類篩選和搜索，讓前台從單工具頁升級為多工具入口。

### 2026-07-12 22:20 HKT - 前台工具市場首頁與閉環驗證

- **會話主要目的**：按開發順序完成前台動態工具頁的下一步，讓 `http://localhost:3000/` 從單工具頁升級為資料庫驅動的工具市場首頁，並保留 `/tools/:slug` 工具執行閉環。
- **完成的主要任務**：新增首頁工具市場 UI；首頁讀取 `GET /api/tools` 和 `GET /api/categories`；支援分類切換、關鍵詞搜尋、預覽圖片卡片和點擊工具卡片進入 `/tools/:slug`；工具詳情頁繼續使用統一工具執行 API、本地任務輪詢和輸出查詢。
- **關鍵決策和解決方案**：沿用目前 Vue 3 CDN + 單頁 HTML 架構，不引入 Vue Router；使用 `window.history.pushState` 和 `currentPath` 管理 `/` 與 `/tools/:slug` 的前台切換；UI 方向參考 `neural.love/tools` 的工具目錄、搜尋與分類入口，但保持本項目既有淺色視覺和繁體中文規則。
- **使用的技術棧**：Vue 3 CDN、Element Plus CDN、Axios、Node.js 原生 HTTP、SQLite、better-sqlite3。
- **新增或修改文件**：修改 `frontend/index.html`、`docs/DEVELOPMENT_ROADMAP.md`、`README.md`。
- **測試結果**：已通過 `npm test`；本地服務 `http://127.0.0.1:3000/` 返回 200；`GET /api/tools` 和 `GET /api/categories` 返回成功；`/tools/remove-background` 返回 200；已用系統 Chrome 進行瀏覽器級驗證，首頁渲染 1 個工具卡片和「全部、圖像、視頻、音頻、文本」分類，點擊卡片可進入 `/tools/remove-background` 並顯示上傳控件。
- **Hostinger MCP 部署記錄**：本輪已查找可用工具，當前 Codex 環境沒有暴露 Hostinger MCP 部署工具，因此尚不能直接發布到 Hostinger。後續部署需要可用 Hostinger MCP 或主機 SSH/面板權限，並配置 Node.js 22、`npm ci`、`npm start`、`RUNNINGHUB_API_KEY`、持久化 `data/` 目錄或替換為正式資料庫。
- **後續建議**：下一步補後台任務列表和前台任務歷史，或先補首頁熱門工具、服務端分類/關鍵詞查詢參數與工具排序權重。

### 2026-07-13 18:19 HKT - 工具頁富文本與動態媒體輸入

- **會話主要目的**：按工具頁新排版要求，讓前台在輸入節點類型為 image/video 時顯示對應上傳字段，並支持頁面頂部與底部富文本內容。
- **完成的主要任務**：工具資料新增頁面頂部說明欄位；後台工具配置頁新增「頁面頂部說明」和「頁面底部說明」兩個 TinyMCE 編輯區；前台工具頁改為先顯示頂部富文本，再按輸入節點類型渲染上傳區和表單欄位，最後顯示結果區與底部富文本；image/video 節點會各自生成上傳卡片並提交對應文件內容。
- **關鍵決策和解決方案**：保留現有 Vue 3 CDN 單頁架構，不引入新前端工程化；媒體輸入由單一上傳節點改為多節點列表；有輸入媒體預覽時結果區顯示 Before/After，無媒體輸入的生成類工具只顯示生成結果。
- **使用的技術棧**：Node.js 原生 HTTP、SQLite、better-sqlite3、Vue 3 CDN、Element Plus CDN、TinyMCE、CSS3。
- **新增或修改文件**：修改 `src/database.js`、`src/toolRepository.js`、`frontend/admin.html`、`frontend/index.html`、`README.md`。
- **測試結果**：已通過 `npm test` 和 `git diff --check`；已重建並啟動 Docker 容器；已驗證本地服務正常啟動，工具詳情資料可返回頂部/底部富文本欄位與 image 輸入節點。
- **後續建議**：下一步可補充瀏覽器級自動化測試環境，對 image/video 上傳 UI、富文本渲染和 Before/After 結果區做可視化回歸檢查。
