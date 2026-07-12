# Development Roadmap

> 更新日期：2026-07-12  
> 当前状态：已完成 SQLite、工具配置保存 API、后台新增/编辑工具保存、后台分类管理基础、公开工具 API、前台动态工具页基础、统一工具执行 API、本地任务记录基础、后台工具测试执行基础。  
> 目标：把 PRD 拆成可执行开发顺序，先打通“后台配置工具 -> 前台展示工具 -> 用户执行工具 -> 记录任务”的闭环。

## 一、当前基线

### 已完成

- Node.js 原生 HTTP 服务。
- RunningHub 后端代理：
  - `POST /api/runninghub/upload`
  - `POST /api/runninghub/workflow/:workflowId`
  - `POST /api/runninghub/status`
  - `POST /api/runninghub/outputs`
- SQLite 初始化与 `tools` 表。
- `src/toolRepository.js` 工具配置 Repository。
- 后台工具配置 API：
  - `GET /api/admin/tools`
  - `POST /api/admin/tools`
- 后台分类 API：
  - `GET /api/admin/categories`
  - `POST /api/admin/categories`
- 后台新增/编辑工具页，支持：
  - 工具名称
  - 工具识别码
  - 工具分类
  - 预览图片 URL
  - workflowID
  - instanceType
  - 动态输入节点
  - 输出配置基础结构
- 后台分类管理页，MVP 默认主分类：
  - 图像
  - 视频
  - 音频
  - 文本
- Docker Compose 本地运行。

### 当前缺口

- 前台已可通过 `/tools/:slug` 读取数据库工具配置，但首页工具市场尚未完成。
- 公开工具 API 已完成基础版本，尚未支持关键词、分类、热门等查询参数。
- 统一工具执行 API 已完成基础版，后续需要补充更多文件类型、队列和鉴权。
- 已新增本地 `execution_tasks` 任务表，后续需要接入后台任务列表和用户历史。
- 后台工具上线前已可发起测试执行，后续需要补充更完整的测试历史列表。
- 前台分类筛选、首页热门工具、全部工具列表还没有完成。
- 后台还没有登录鉴权，管理 API 当前处于未保护状态。

## 二、开发顺序总览

后续不要按 PRD 模块平铺开发，应按依赖链推进。

```text
工具配置保存
  -> 公开工具读取 API
  -> 前台动态工具页
  -> 统一工具执行 API
  -> 本地任务记录与轮询
  -> 后台测试执行与上线
  -> 分类、首页工具市场
  -> 后台鉴权
  -> 用户、积分、会员
  -> 批量、云盘、推荐、内容商业化
```

核心原则：

- 先让一个后台配置的工具在前台真实跑通。
- 再扩展到多个工具、分类和首页。
- 任务记录必须早于积分扣费，否则扣费没有可信依据。
- 后台测试执行必须早于批量上线，否则错误 nodeId / fieldName 会直接影响用户。
- 登录、会员、云盘、推荐奖励属于第二层业务能力，不应早于工具执行闭环。

## 三、阶段 1：公开工具 API（已完成基础版）

### 目标

让前台可以从数据库读取已上线工具，而不是写死配置。

### 开发内容

- 已新增公开 API：
  - `GET /api/tools`
  - `GET /api/tools/:slug`
- 已新增公开分类 API：
  - `GET /api/categories`
- API 只返回 `status = active` 的工具。
- 返回前台需要的字段：
  - `id`
  - `toolKey`
  - `slug`
  - `name`
  - `shortDescription`
  - `previewImageUrl`
  - `inputNodes`
  - `outputConfig`
  - `estimatedSeconds`，可先给默认值
- 保留后台 API 返回完整配置。
- 增加 `listActiveTools()` 和 `getActiveToolBySlug()` Repository 方法。

### 依赖

- 已有 `tools` 表。
- 已有工具配置保存 API。

### 验收标准

- `GET /api/tools` 能返回上线工具列表。
- `GET /api/tools/remove-background` 能返回图片背景移除工具详情。
- 草稿和停用工具不会出现在公开 API。
- 前端不需要知道 RunningHub API Key。

## 四、阶段 2：前台动态工具页（已完成基础版）

### 目标

把当前写死的 `frontend/index.html` 改成数据库驱动的工具页。

### 开发内容

- 已支持路由：
  - `/tools/:slug`
  - 当前 `/` 继续展示默认工具 `remove-background`。
- 页面加载时请求 `GET /api/tools/:slug`。
- 已根据 `inputNodes` 动态渲染基础表单：
  - `image` -> 图片上传
  - `video` -> 视频上传，先只做 UI 占位也可以
  - `text` -> 单行输入
  - `textarea` -> 多行输入
  - `number` -> 数字输入
  - `select` -> 下拉选择
- 页面已使用数据库中的：
  - 工具名称
  - 工具描述
  - 预览图片
  - 输入字段 label / placeholder
- 结果区域暂时复用当前图片结果展示。
- 執行鏈路暫時仍調用 `/api/runninghub/*` 代理；下一階段改為統一工具執行 API。

### 依赖

- 阶段 1 公开工具 API。

### 验收标准

- 后台修改工具名称后，前台工具页刷新能看到新名称。
- 后台新增输入节点后，前台表单能显示对应控件。
- 图片背景移除工具仍能上传图片并显示预览。
- 前台没有写死 workflowID、nodeId、fieldName。

## 五、阶段 3：统一工具执行 API（已完成基础版）

### 目标

让前台提交“工具输入值”，由后端根据工具配置组装 RunningHub 请求。

### 开发内容

- 已新增 API：
  - `POST /api/tools/:idOrSlug/execute`
- 后端流程：
  1. 读取工具配置。
  2. 校验工具为 `active`。
  3. 校验必填字段和数据类型。
  4. 对 `image` / `video` 输入调用 RunningHub 上传代理。
  5. 根据 `inputNodes` 组装 `nodeInfoList`。
  6. 调用 RunningHub workflow。
  7. 返回本地任务 ID 或 RunningHub taskId。
- 前台不再直接调用 `/api/runninghub/workflow/:workflowId`。
- 保留 `/api/runninghub/*` 作为内部代理端点，但前台业务优先调用工具执行 API。

### 依赖

- 阶段 2 前台动态表单。

### 验收标准

- 前台只提交 `inputValues`，不提交 workflowID。
- 后端能从工具配置生成正确 `nodeInfoList`。
- 缺少必填输入时返回统一错误格式。
- nodeId / fieldName 只来自后台配置。

## 六、阶段 4：本地任务记录与轮询（已完成基础版）

### 目标

建立任务记录地基，为失败排查、历史记录、积分扣费和后台任务管理做准备。

### 开发内容

- 已新增 `execution_tasks` 表。
- 建议字段：
  - `id`
  - `tool_id`
  - `runninghub_task_id`
  - `status`
  - `input_values_json`
  - `node_info_list_json`
  - `output_values_json`
  - `output_urls_json`
  - `error_code`
  - `error_message`
  - `started_at`
  - `completed_at`
  - `created_at`
  - `updated_at`
- 已新增 API：
  - `GET /api/tasks/:taskId`
  - `GET /api/tasks/:taskId/outputs`
- 执行 API 创建任务记录。
- 轮询时更新本地任务状态。
- 输出解析使用 `outputConfig.fallbackPaths`。

### 依赖

- 阶段 3 统一工具执行 API。

### 验收标准

- 每次执行都会产生本地任务 ID。
- 前台轮询本地任务 ID，而不是直接轮询 RunningHub taskId。
- 成功任务保存输出 URL。
- 失败任务保存错误码和错误摘要。
- 刷新页面后仍能查询任务状态。

## 七、阶段 5：后台测试执行与上线流程（已完成基础版）

### 目标

让管理员在上线前验证 workflowID、nodeId、fieldName 和输出解析是否可用。

### 开发内容

- 已新增后台 API：
  - `POST /api/admin/tools/:id/test`
  - `PATCH /api/admin/tools/:id/status`
- 后台已新增测试面板：
  - 上传测试图片或填写测试参数。
  - 发起测试执行。
  - 展示 RunningHub taskId、状态、输出结果和错误摘要。
- 状态规则：
  - 新建工具默认 `draft`。
  - 测试成功后允许上线。
  - 测试失败时保留草稿。
- 已用简单规则保存 `last_test_status`、`last_test_task_id`、`last_test_error`、`last_tested_at`，后续再拆表。

### 依赖

- 阶段 4 本地任务记录。

### 验收标准

- 管理员能在后台对某个工具发起测试执行。
- 测试成功后可以切换为 `active`。
- 测试失败时展示可读错误，不返回系统堆栈。
- 错误 nodeId / fieldName 不应直接上线影响前台用户。

## 八、阶段 6：分类、首页工具市场与搜索

### 目标

从单工具页升级为类 Picsman 的工具市场首页。UI 风格参考 neural.love/tools 的深色工具目录和胶囊分类切换，功能结构参考 Picsman 的工具矩阵。

### 开发内容

- 已完成 `tool_categories` 表和 `tools.category_id` 后台基础。
- 后续 `tools` 表继续增加：
  - `is_featured`
  - `tags_json`
  - `credit_cost`
  - `estimated_seconds`
- 新增 API：
  - `GET /api/categories`
  - `GET /api/tools?category=&keyword=&featured=`
- 后台分类管理已具备基础路由，后续补充二级分类、图标和前台导航排序。
- 首页展示：
  - 热门工具
  - 全部工具
  - 分类筛选
  - 搜索
- 工具卡片使用 `previewImageUrl`。

### 依赖

- 阶段 1 公开工具 API。
- 阶段 2 动态工具页。

### 验收标准

- 首页不再是单个背景移除工具页。
- 用户能看到多个工具卡片。
- 用户能按关键词搜索工具。
- 点击工具卡片进入 `/tools/:slug`。
- 后台调整排序和上下线后，首页能反映变化。

## 九、阶段 7：后台登录与基础权限

### 目标

保护后台和管理 API，避免未授权用户修改工具配置。

### 开发内容

- 新增管理员账号表或最小环境变量管理员方案。
- 新增登录 API：
  - `POST /api/admin/auth/login`
  - `POST /api/admin/auth/logout`
  - `GET /api/admin/auth/me`
- 管理 API 增加鉴权中间件。
- 后台页面未登录时跳转登录页。
- Cookie 建议使用：
  - `HttpOnly`
  - `SameSite=Lax`
  - 生产环境 `Secure`
- 记录管理操作审计日志，至少记录工具新增、更新、上下线。

### 依赖

- 可在阶段 5 后立即做，也可以在阶段 6 前做。

### 验收标准

- 未登录访问 `/api/admin/tools` 返回 401。
- 登录后可正常管理工具。
- 前台公开 API 不需要管理员登录。
- 日志不记录密码、Token、API Key。

## 十、阶段 8：用户、积分与执行历史

### 目标

开始从工具平台进入可商业化的用户体系。

### 开发内容

- 新增用户表。
- 新增用户登录注册。
- 新增积分余额和积分流水。
- 任务执行时记录 `user_id`。
- 新增用户 API：
  - `GET /api/me`
  - `GET /api/me/tasks`
- 积分扣费流程：
  1. 创建任务前检查余额。
  2. 创建任务时冻结积分。
  3. 成功后确认扣除。
  4. 失败后释放冻结。
- 管理后台新增任务记录和用户查询。

### 依赖

- 阶段 4 本地任务记录。
- 阶段 7 鉴权基础可复用部分会话能力。

### 验收标准

- 登录用户能查看历史任务。
- 任务和用户绑定。
- 积分变化有流水，不允许只改余额。
- RunningHub 失败不会扣除用户积分。

## 十一、阶段 9：会员套餐、推荐奖励、批量与云盘

### 目标

在工具执行和任务记录稳定后，开发 PRD 中的 P1 增长与商业化能力。

### 推荐顺序

1. 会员套餐与价格页：
   - 初始化 `PRO`、`PRO+`、`PRO MAX`。
   - 后台可配置价格、额度、排序、热门标记。
2. 推荐奖励：
   - 推荐码。
   - 每成功推荐 1 人奖励 100 积分。
   - 每个账号最多奖励 5 人。
   - 风控标记和后台审核。
3. 批量任务基础：
   - 本地多文件上传。
   - 批量任务表。
   - 子任务队列。
4. Google Drive / Dropbox：
   - OAuth 授权。
   - 加密保存 token。
   - 文件选择。
   - 结果 ZIP 下载或回写云盘。

### 依赖

- 阶段 8 用户与积分。
- 阶段 4 任务记录。
- 阶段 6 工具批量能力配置。

### 验收标准

- 套餐权益能影响每日使用次数和批量数量。
- 推荐奖励不会超过 5 次。
- 批量任务支持部分成功和失败重试。
- 后台看不到明文 OAuth Token。

## 十二、阶段 10：内容、SEO 与工程化升级

### 目标

把平台从 MVP 工具站升级为可持续获客和维护的产品。

### 开发内容

- Blog / 教程 / FAQ 内容管理。
- 工具页 SEO：
  - title
  - description
  - canonical
  - hreflang
- 前台中英双语：
  - `zh-HK`
  - `en-US`
- 错误码多语言字典。
- 迁移到 Vue 3 + TypeScript + Vite。
- 引入 Pinia、Vue Router、Element Plus npm 包版本。
- 增加 Vitest / Playwright 测试。

### 依赖

- 阶段 6 工具市场首页。
- 阶段 8 用户体系，若需要用户中心。

### 验收标准

- 每个上线工具有可索引页面。
- 中文和英文页面 URL 清晰。
- 常见流程有自动化测试。
- 生产构建流程清晰，不再依赖 CDN 全局脚本。

## 十三、最近三次迭代建议

### 下一迭代：工具市场首页 + 搜索分类

交付范围：

- 工具市场首页。
- 热门工具和全部工具。
- 分类筛选和关键词搜索。
- 工具卡片进入 `/tools/:slug`。

为什么先做：

- 工具配置、执行、测试和上线流程已经完成基础版。
- 下一步应把多工具入口做出来，让前台从单工具页升级为工具市场。

### 第二迭代：后台登录与基础权限

交付范围：

- 管理员登录。
- 管理 API 鉴权。
- 操作审计日志。
- 后台未登录跳转登录页。

为什么第二做：

- 工具配置和执行能力已经进入可用状态，需要尽快保护后台入口。

### 第三迭代：后台任务列表

交付范围：

- 后台任务记录读取 API。
- 任务列表、状态筛选、失败详情。
- RunningHub taskId 和本地 taskId 复制。
- 测试任务与用户任务区分。

为什么第三做：

- `execution_tasks` 已存在，后台任务列表能提升排查效率。

## 十四、关键风险与处理顺序

| 风险 | 影响 | 处理阶段 |
| --- | --- | --- |
| 前台仍写死工具配置 | 后台配置无法产生真实产品价值 | 阶段 1-2 |
| 没有本地任务记录 | 无法排查失败、无法做积分扣费 | 阶段 4 |
| 工具未测试就上线 | 用户遇到执行失败 | 阶段 5 |
| 后台未鉴权 | 工具配置可能被未授权修改 | 阶段 7 |
| 过早做会员和云盘 | 地基未稳，业务复杂度过高 | 阶段 8-9 |
| CDN 单页结构继续膨胀 | 后续维护困难 | 阶段 10 |

## 十五、完成定义

MVP 工具平台基础完成时，应同时满足：

- 后台能新增至少 3 个工具。
- 每个工具能配置输入节点和输出解析。
- 后台能测试工具并上线。
- 前台首页能展示上线工具。
- 用户能进入工具页执行 RunningHub 工作流。
- 每次执行都有本地任务记录。
- 成功结果可预览和下载。
- 失败结果有可读错误和后台排查信息。
