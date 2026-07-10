# RunningHub AI 工作流调用平台 - 演示版

## 📋 项目简介

这是一个基于 Vue 3 + Element Plus 的 RunningHub 工作流调用演示平台。用户可以通过简单的界面操作，调用 RunningHub 上的 AI 工作流进行照片修复与图像细化。

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
# 然后访问 http://127.0.0.1:3000
```

### 方式二：临时命令行环境变量

```bash
cd /Volumes/Extreme\ SSD/gitCode/AI\ Code/runninghub-app
RUNNINGHUB_API_KEY=你的 RunningHub API Key npm start
```

## 🎯 功能特性

### ✅ 已实现
- 工作流选择（照片修复 F2K）
- 图片上传（拖拽/点击）
- 图片预览与管理
- 最长边参数配置
- 调用 RunningHub API 创建真实任务
- 上传图片到 RunningHub 媒体接口
- 任务状态轮询
- 结果查询、展示与下载
- 执行历史记录
- 后端代理读取环境变量中的 RunningHub API Key

### 🔧 待配置
- 用户认证系统
- 更细粒度的错误原因展示

## 📝 API 配置

### 当前配置
- **API 地址**: `https://www.runninghub.cn/openapi/v2`
- **任务查询地址**: `https://www.runninghub.cn/task/openapi`
- **认证方式**: 后端代理使用 `RUNNINGHUB_API_KEY` 作为 Bearer Token
- **Workflow ID**: `2075457256463880193`
- **工作流名称**: 照片修复F2K-一致性图像细化+编辑1
- **图片输入节点**: `nodeId: 31`
- **最长边数字输入节点**: `nodeId: 27`
- **运行实例**: `default` (24G 显存)

### 工作流调用配置

`frontend/index.html` 当前使用以下配置：

```javascript
const workflowMapping = {
  'photo-restore-f2k': {
    id: '2075457256463880193',
    name: '照片修复 F2K',
    imageNodeId: '31',
    imageFieldName: 'image',
    maxSideNodeId: '27',
    maxSideFieldName: 'value'
  }
};
```

### 环境变量说明

| 变量名 | 是否必填 | 说明 |
|--------|----------|------|
| `RUNNINGHUB_API_KEY` | 是 | RunningHub API Key，仅在后端读取 |
| `RUNNINGHUB_API_BASE_URL` | 否 | RunningHub 工作流与上传接口地址，默认 `https://www.runninghub.cn/openapi/v2` |
| `RUNNINGHUB_TASK_API_BASE_URL` | 否 | RunningHub 任务查询接口地址，默认 `https://www.runninghub.cn/task/openapi` |
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
      "nodeId": "31",
      "fieldName": "image",
      "fieldValue": "https://example.com/uploaded-image.png"
    },
    {
      "nodeId": "27",
      "fieldName": "value",
      "fieldValue": 1536
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

## 🛠️ 技术栈

- **前端框架**: Vue 3 (CDN)
- **UI 组件**: Element Plus (CDN)
- **HTTP 客户端**: Axios (CDN)
- **后端运行时**: Node.js 原生 HTTP 服务
- **样式**: CSS3 (内联)

## 📦 后续开发计划

### 第一阶段：MVP
- [x] 演示版 UI
- [ ] 工作流 ID 配置
- [ ] 图片上传对接
- [ ] 任务状态轮询
- [ ] 结果展示优化

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
- **测试结果**：已通过 `npm test` 的 Node 语法检查；已用临时环境变量启动本地后端并验证 `/` 与 `/api/runninghub/status` 可访问；仓库文本扫描未发现真实 API Key。
- **后续建议**：生产部署时将 `RUNNINGHUB_API_KEY` 配置在平台 Secret/环境变量中，不要提交 `.env`；后续可补充用户鉴权、请求频率限制和服务端日志脱敏。
