# AI 图片与视频工具平台 PRD

> 文档版本：v2.8.0  
> 更新日期：2026-07-12  
> 状态：待评审  
> 参考产品：UI 风格参考 https://neural.love/tools ，功能与工具矩阵参考 https://www.picsman.ai/  
> 技术方向：Vue 前台工具平台 + Node.js 自研中文管理后台 + RunningHub 执行服务

---

## 一、项目概述

### 1.1 项目定位

本项目定位为一个类似 Picsman 的 AI 图片与视频编辑工具平台。用户在前台浏览不同 AI 工具，进入具体工具页后上传图片、填写提示词或选择参数，系统通过后端代理调用 `runninghub.cn` 工作流完成生成、抠图、增强、擦除、换背景、AI 换装、视频生成等任务。

后台允许运营人员新增和管理不同工具，不需要改前端代码即可配置：

- RunningHub workflowID
- 输入节点 nodeId
- 输入字段 fieldName
- 输入控件类型
- 默认值与校验规则
- 输出结果解析规则
- 工具分类、封面、排序、价格和上下线状态
- 前台中英文展示文案

### 1.2 参考产品拆解

视觉风格参考 neural.love tools 页，功能结构参考 Picsman 的页面结构与工具组合：

- UI 风格：参考 neural.love/tools 的深色工具目录、搜索框、胶囊分类切换和简洁卡片氛围。
- 功能结构：参考 Picsman 的工具入口、热门工具、全部工具、价格、Blog、API、登录/注册、用户头像/积分。
- 工具分类：MVP 先使用图像、视频、音频、文本四个主分类，后续再扩展 AI 生成、图片编辑、视频编辑、背景处理、增强修复、电商工具、证件照/头像、滤镜风格等二级分类。
- 工具页：上传区、参数面板、执行按钮、处理中状态、结果预览、下载、再次编辑、相关工具推荐。
- 付费体系：免费额度、积分/订阅、高清导出、批量处理、API 能力。

### 1.3 项目目标

**MVP 目标**

- 搭建类 Picsman 的工具市场首页。
- 支持后台添加工具并配置 RunningHub 工作流。
- 支持至少 3 个工具从后台配置后可在前台执行。
- 后端统一代理 RunningHub API，前端不暴露 API Key。
- 支持任务状态轮询、结果展示、下载和执行记录。

**中期目标**

- 支持用户登录、积分扣费、订单与套餐。
- 支持图片和视频类工作流。
- 支持批量处理、历史记录、收藏工具。
- 支持会员连接 Google Drive / Dropbox，从云盘选择文件夹或多张图片进行批量处理。
- 支持会员推荐注册奖励，每个账号最多推荐 5 人，每成功推荐 1 人奖励 100 积分。
- 支持前台中英双语展示，后台管理界面仅使用中文。
- 后台内容、工具配置、会员、订单、任务和 Blog 均采用 Node.js 自研后台实现。
- 支持管理后台的运营配置与数据统计。

**长期目标**

- 开放 API 平台。
- 支持多模型、多供应商工作流路由。
- 支持移动端 H5 / App 下载转化。

### 1.4 目标用户

| 用户类型 | 使用场景 | 核心需求 |
| --- | --- | --- |
| 电商运营 | 商品图抠图、换背景、去水印、批量生成营销图 | 快速、批量、低成本、可连接云盘处理整批素材 |
| 内容创作者 | 社媒配图、AI 头像、滤镜、短视频素材 | 工具丰富、操作简单、效果好 |
| 设计师 | 图片编辑、局部替换、扩图、风格化 | 参数可控、结果可迭代、高清导出 |
| 普通用户 | 修图、证件照、换装、去背景 | 不需要专业技能、免费试用 |
| 开发者/企业 | 通过 API 调用 AI 图片能力 | 稳定接口、用量统计、密钥管理 |

### 1.5 核心价值主张

> 像 Picsman 一样提供丰富、易用的 AI 图片与视频工具；通过后台配置 RunningHub 工作流，实现快速扩展工具矩阵。

---

## 二、产品范围

### 2.1 前台功能范围

| 模块 | 优先级 | 说明 |
| --- | --- | --- |
| 首页工具市场 | P0 | 参考 Picsman 首页，展示热门工具与全部工具 |
| 工具分类与搜索 | P0 | 支持按分类、关键词、热门程度查找工具 |
| 工具详情/执行页 | P0 | 上传输入、动态参数表单、执行、轮询、结果下载 |
| 用户登录注册 | P1 | 邮箱/第三方登录，保存历史与积分 |
| 执行历史 | P1 | 查看历史任务、重新下载、再次执行 |
| 积分套餐/价格页 | P1 | 展示免费额度、订阅和积分包 |
| 会员推荐奖励 | P1 | 会员邀请新用户注册，成功后奖励 100 积分，每账号最多 5 人 |
| 会员云盘批量处理 | P1 | 会员连接 Google Drive / Dropbox 后选择图片批量执行工具 |
| 前台中英双语 | P1 | 前台支持中文和英文切换，工具、FAQ、价格页、错误提示等均需双语 |
| API 页面 | P2 | 面向开发者展示 API 能力与文档入口 |
| Blog/教程 | P2 | 工具 SEO、使用教程、案例内容 |
| 下载 APP 入口 | P2 | iOS / Android 下载引导 |

### 2.2 后台功能范围

| 模块 | 优先级 | 说明 |
| --- | --- | --- |
| 工具管理 | P0 | 新增、编辑、上下线 AI 工具 |
| RunningHub 工作流配置 | P0 | 配置 workflowID、节点、字段、实例类型 |
| 输入参数配置 | P0 | 动态配置上传框、文本框、选择器、滑块等 |
| 输出解析配置 | P0 | 配置输出图片/视频/文本字段解析规则 |
| 分类与导航管理 | P0 | 首页分类、工具排序、热门推荐 |
| 用户与积分管理 | P1 | 用户查询、积分调整、封禁 |
| 推荐奖励管理 | P1 | 查看推荐关系、发放状态、奖励积分和风控异常 |
| 任务记录管理 | P1 | 查询任务状态、失败原因、重试 |
| 云盘连接管理 | P1 | 查看用户 Google Drive / Dropbox 授权状态，支持断开与异常排查 |
| 订单与套餐管理 | P1 | 积分包、订阅、订单状态 |
| 运营数据看板 | P2 | 工具使用量、成功率、消耗、收入 |
| 系统配置 | P2 | SEO、页脚、公告、前台语言、存储策略；后台界面固定中文 |

### 2.3 暂不包含

- 自研 AI 模型训练。
- RunningHub 工作流可视化编辑器。
- 移动原生 App 开发。
- 企业私有化部署。

---

## 三、前台页面需求

### 3.1 前台语言策略

#### 3.1.1 语言范围

前台网站必须支持中英双语：

- 繁体中文：`zh-HK`
- 英文：`en-US`

所有页面显示给用户看的中文均必须使用繁体中文，包括前台、后台、按钮、表单、提示、错误信息、FAQ、Blog、SEO 文案和系统通知。后台管理系统只需要中文界面，不需要英文后台。

#### 3.1.2 前台双语覆盖范围

| 内容 | 是否双语 | 说明 |
| --- | --- | --- |
| 导航菜单 | 是 | 工具、价格、下载 APP、Blog、API、登录等 |
| 首页营销文案 | 是 | Hero、热门工具、工具分类、FAQ、页脚 |
| 工具名称和描述 | 是 | 后台录入中英文，前台按语言展示 |
| 工具表单字段 | 是 | label、placeholder、helpText、option 文案 |
| 错误提示和状态 | 是 | 上传失败、处理中、任务失败、积分不足等 |
| 价格页 | 是 | 套餐名、权益、按钮、FAQ |
| 用户中心 | 是 | 会员、积分、历史、云盘连接等 |
| Blog / 教程 | 是 | 可按语言分别发布 |
| 后台管理界面 | 否 | 固定中文 |

#### 3.1.3 语言切换规则

- 前台右上角提供语言切换入口。
- 默认语言根据浏览器语言判断；无法判断时默认中文。
- 用户切换语言后写入用户偏好或本地存储。
- 已登录用户的语言偏好保存到用户资料。
- URL 推荐使用路径前缀：`/zh-HK/...`、`/en-US/...`。
- 同一个工具在不同语言下保持相同 slug 或配置语言别名，避免 SEO 混乱。

#### 3.1.4 文案回退规则

- 如果英文文案缺失，前台优先回退到中文，并在后台标记“翻译缺失”。
- 后台保存工具时，应提示哪些前台必填文案缺少英文版本。
- 错误码使用统一 code，前台根据当前语言映射显示文案。

### 3.2 首页

#### 3.2.1 页面目标

参考 Picsman 首页，让用户快速理解平台能力，并能直接进入最常用工具。

#### 3.2.2 页面结构

1. 顶部导航
2. Hero 区
3. 最受欢迎 AI 工具
4. 探索所有图片/视频编辑工具
5. 更多工具快捷入口
6. 产品亮点
7. App 下载引导
8. 用户评价
9. FAQ
10. 页脚

#### 3.2.3 顶部导航

| 元素 | 说明 |
| --- | --- |
| Logo | 平台品牌标识 |
| 工具下拉菜单 | 展示 AI 生成、图片编辑、视频编辑等分组 |
| 价格 | 跳转价格页 |
| 下载 APP | 跳转 App 下载区 |
| Blog | 跳转教程/博客 |
| API | 跳转开发者 API 页 |
| 登录/注册 | 未登录展示 |
| 用户头像/积分 | 已登录展示 |

#### 3.2.4 Hero 区

| 字段 | 内容要求 |
| --- | --- |
| 主标题 | 突出“AI 图片与视频编辑工具” |
| 副标题 | 强调生成、编辑、增强、背景处理一站式完成 |
| 主按钮 | “免费开始创作” |
| 次按钮 | “探索全部工具” |
| 视觉 | 可展示多工具拼贴图、视频/图片生成案例 |

#### 3.2.5 热门工具卡片

首页首屏下方展示 9-15 个热门工具，卡片内容包括：

- 工具封面图
- 工具名称
- 简短描述
- 标签：热门、新品、免费、推荐
- 点击进入工具页

推荐初始热门工具：

| 工具 | 分类 | 说明 |
| --- | --- | --- |
| AI 图片生成器 | AI 生成 | 文生图/图生图 |
| AI 视频生成器 | AI 生成 | 文生视频/图生视频 |
| 图片背景移除 | 背景处理 | 生成透明 PNG |
| 消除笔 / Magic Eraser | 图片编辑 | 移除物体、人物、瑕疵 |
| 图片画质提升 | 增强修复 | 修复模糊、放大清晰 |
| AI 换装 | 电商/人像 | 人像服装替换 |
| 去水印 | 图片编辑 | 移除图片水印 |
| AI 滤镜 | 风格化 | 动漫、吉卜力、写实等风格 |
| 证件照制作 | 人像工具 | 背景、尺寸、证件照规范 |

#### 3.2.6 全部工具列表

按分类展示工具，支持卡片和紧凑列表两种布局。

| 分类 | 示例工具 |
| --- | --- |
| AI 生成 | AI 图片生成器、AI 视频生成器、GPT Image、Seedance、Veo |
| 背景处理 | 移除背景、白底图、AI 背景、背景换色、PNG Maker、模糊背景 |
| 图片编辑 | AI Photo Editor、局部替换、消除笔、加文字、裁剪、扩图 |
| 增强修复 | 图片增强、图片放大、老照片修复、清晰化 |
| 电商工具 | 商品白底图、模特换装、商品场景图、批量处理 |
| 人像工具 | 证件照、头像生成、发型试戴、纹身生成 |
| 风格滤镜 | AI 滤镜、卡通化、吉卜力风、素描风 |
| 视频编辑 | 视频生成、视频增强、视频去水印、Sora 去水印 |

#### 3.2.7 FAQ

FAQ 至少包含：

- 平台有哪些 AI 工具？
- 支持哪些图片/视频格式？
- 是否免费？
- 如何下载高清结果？
- 能否在手机上使用？
- 任务失败是否退还积分？

### 3.2 工具详情/执行页

#### 3.2.1 页面目标

用户进入某个工具后，能在一个页面完成输入、执行、结果查看与下载。

#### 3.2.2 页面结构

1. 工具标题与描述
2. 示例图/前后对比
3. 上传区或输入区
4. 动态参数面板
5. 执行按钮与积分提示
6. 任务状态
7. 结果预览
8. 下载/再次执行/继续编辑
9. 相关工具推荐
10. 工具教程与 FAQ

#### 3.2.3 动态输入控件

工具页不写死表单，全部由后台工具配置生成。

| 控件类型 | 用途 | 示例 |
| --- | --- | --- |
| image_upload | 图片上传 | 背景移除、增强、换装 |
| video_upload | 视频上传 | 视频增强、视频去水印 |
| text_prompt | 提示词 | AI 图片生成、视频生成 |
| textarea | 长文本提示词 | 复杂生成任务 |
| select | 单选项 | 风格、尺寸、模型 |
| radio | 少量互斥选项 | 背景类型：透明/白色/自定义 |
| checkbox | 多选项 | 是否保留阴影、是否高清 |
| slider | 数值范围 | 强度、相似度、清晰度 |
| number | 数字输入 | 宽度、高度、步数 |
| color | 颜色选择 | 背景色 |
| mask_editor | 蒙版编辑 | 消除笔、局部替换 |

#### 3.2.4 工具页状态

| 状态 | 展示要求 |
| --- | --- |
| 初始状态 | 展示上传/输入引导和示例 |
| 输入校验失败 | 明确指出缺少哪个字段 |
| 上传中 | 展示上传进度 |
| 排队中 | 展示任务已提交和 taskId |
| 处理中 | 展示轮询状态和预计等待提示 |
| 成功 | 展示结果、下载按钮、再次编辑 |
| 失败 | 展示友好错误、失败原因、重试 |

### 3.3 价格页

价格页参考用户提供的三列会员卡片，展示免费额度、三级订阅套餐、月付/年付切换和权益对比。前台价格页需要支持中英双语，后台套餐配置界面固定中文。

#### 3.3.1 订阅展示规则

- 价格页默认展示 `PRO`、`PRO+`、`PRO MAX` 三个会员套餐。
- `PRO+` 默认标记为 `Most Popular` / `最受欢迎`，卡片视觉需要比另外两档更突出。
- 支持月付和年付切换，年付默认显示 `Save 40%` / `节省 40%` 标签，实际折扣比例由后台配置。
- 价格展示格式：`US$9.99/mo`，年付切换后展示折算月费和年付总价说明。
- 按钮文案：`Subscribe Now` / `立即订阅`。
- 套餐权益使用勾选列表展示，支持重点数字加粗。
- 价格页底部提供 `Compare Plans and Features` / `比较套餐与权益` 展开区。

#### 3.3.2 默认三级会员套餐

| 套餐 | 月付价格 | 默认标记 | 核心定位 |
| --- | --- | --- | --- |
| PRO | US$9.99/月 | 无 | 入门会员，适合轻量图片处理 |
| PRO+ | US$29.99/月 | Most Popular | 主推会员，适合高频图片和视频处理 |
| PRO MAX | US$49.99/月 | 无 | 高阶会员，适合重度创作和批量处理 |

#### 3.3.3 套餐权益

| 权益 | PRO | PRO+ | PRO MAX |
| --- | --- | --- | --- |
| AI 工具使用次数 | 50 uses/day | 300 uses/day | Unlimited access |
| 每月高级模型与视频积分 | 300 credits/month | 1500 credits/month | 5000 credits/month |
| 每月高级模型图片额度 | Up to 150 images/month | Up to 750 images/month | Up to 2500 images/month |
| 每月高级模型视频额度 | Up to 30 videos/month | Up to 150 videos/month | Up to 500 videos/month |
| 生成优先级 | Standard generation priority | High generation priority | Highest generation priority |
| 高清无水印下载 | 支持 | 支持 | 支持 |
| Google Drive / Dropbox 批量处理 | 支持 | 支持 | 支持 |

后台可调整价格、折扣、额度、权益文案、热门标签和排序，但默认上线方案必须包含以上三档。

### 3.4 会员与云盘批量处理

#### 3.4.1 页面目标

会员用户可以授权连接 Google Drive 或 Dropbox，从云盘选择文件夹或多张图片，将同一个 AI 工具批量应用到这些图片，并把结果下载为 ZIP 或回写到指定云盘文件夹。

#### 3.4.2 会员权益

| 权益 | Free | PRO | PRO+ | PRO MAX |
| --- | --- | --- | --- | --- |
| 单张图片处理 | 限量 | 支持 | 支持 | 支持 |
| 本地批量上传 | 不支持或限量 | 支持 | 支持 | 支持 |
| Google Drive 连接 | 不支持 | 支持 | 支持 | 支持 |
| Dropbox 连接 | 不支持 | 支持 | 支持 | 支持 |
| 每日 AI 工具使用次数 | 限量 | 50 | 300 | 不限 |
| 每月积分 | 免费额度 | 300 | 1500 | 5000 |
| 每月图片额度 | 免费额度 | 150 | 750 | 2500 |
| 每月视频额度 | 不支持或限量 | 30 | 150 | 500 |
| 批量任务并发 | 1 | 3 | 5 | 10 |
| 批量结果 ZIP 下载 | 限制 | 支持 | 支持 | 支持 |
| 结果回写云盘 | 不支持 | 支持 | 支持 | 支持 |
| 失败任务重试 | 手动单次 | 批量重试 | 批量重试 | 批量重试 + 高优先级 |
| 生成优先级 | 普通 | Standard | High | Highest |
| 高清无水印下载 | 限制 | 支持 | 支持 | 支持 |

#### 3.4.3 云盘连接入口

入口位置：

- 用户中心 -> 云盘连接
- 批量处理页 -> 选择云盘来源
- 工具详情页 -> 批量处理模式

连接状态：

| 状态 | 展示 |
| --- | --- |
| 未连接 | 展示“连接 Google Drive”“连接 Dropbox”按钮 |
| 已连接 | 展示账号邮箱、授权时间、最近同步时间、断开按钮 |
| 授权过期 | 展示重新授权按钮 |
| 权限不足 | 展示需要重新授权并说明原因 |

#### 3.4.4 批量处理页

页面结构：

1. 选择工具：背景移除、增强、去水印等支持批处理的工具。
2. 选择来源：本地上传、Google Drive、Dropbox。
3. 选择文件：支持多选图片或选择文件夹。
4. 参数配置：沿用工具的动态输入表单，参数应用到整批图片。
5. 处理设置：并发数、失败重试次数、输出命名规则、输出位置。
6. 费用预估：图片数量、单张积分、总积分、会员折扣。
7. 开始批量处理。
8. 任务进度列表：总进度、成功、失败、排队、处理中。
9. 结果操作：下载 ZIP、保存到云盘、只下载成功项、重试失败项。

#### 3.4.5 文件选择规则

| 来源 | 选择方式 | 限制 |
| --- | --- | --- |
| 本地上传 | 多文件拖拽/选择文件夹 | 按会员等级限制数量和大小 |
| Google Drive | Google Picker 选择多图或文件夹 | 仅读取用户主动选择或授权范围内文件 |
| Dropbox | Dropbox Chooser / 自建选择器 | 仅读取用户授权范围内文件 |

支持文件：

- 图片：JPG、JPEG、PNG、WebP。
- 单文件大小：默认 10MB，可由后台按套餐配置。
- 批量数量：Free 不开放云盘；PRO 默认 50 张/批；PRO+ 默认 150 张/批；PRO MAX 默认 500 张/批，具体数值可在后台配置。

#### 3.4.6 批量任务状态

| 状态 | 说明 |
| --- | --- |
| draft | 已选择文件，未提交 |
| validating | 正在校验文件和积分 |
| queued | 批量任务已排队 |
| processing | 子任务处理中 |
| partial_completed | 部分成功，部分失败 |
| completed | 全部成功 |
| failed | 全部失败或系统失败 |
| cancelled | 用户取消未完成任务 |

#### 3.4.7 云盘结果回写

会员可选择以下输出方式：

- 仅在平台下载 ZIP。
- 保存到原文件夹下的新文件夹，例如 `AI Results`。
- 保存到用户选择的目标文件夹。
- 保持原文件名并增加后缀，例如 `product-001-bg-removed.png`。

回写失败时不影响平台结果下载，任务详情中展示失败原因，并提供重新保存到云盘按钮。

#### 3.4.8 隐私和授权说明

- 平台只访问用户主动选择或授权范围内的文件。
- OAuth Token 加密存储，支持用户随时断开连接。
- 不长期保存原图，除非用户开启历史记录保存。
- 删除账号时需要清除云盘授权、任务记录和缓存文件。

### 3.5 用户中心

用户中心包含：

- 账户信息
- 会员等级与到期时间
- 积分余额
- 推荐奖励
- 执行历史
- 批量任务
- 云盘连接管理
- 下载历史
- 收藏工具
- 订单记录
- API Key 管理
- 账号设置

### 3.6 会员推荐奖励

#### 3.6.1 功能目标

会员可以生成自己的推荐链接，邀请新用户注册。被邀请用户完成注册并通过基础风控校验后，推荐人获得 100 积分奖励。每个账号最多可获得 5 次推荐奖励。

#### 3.6.2 推荐规则

| 规则 | 说明 |
| --- | --- |
| 推荐奖励 | 每成功推荐 1 个新用户，推荐人获得 100 积分 |
| 奖励上限 | 每个推荐人账号最多奖励 5 人，即最多 500 积分 |
| 被推荐人限制 | 仅新注册用户可作为被推荐人 |
| 自我推荐 | 不允许同一账号、同一邮箱、同一手机号或明显同设备自推 |
| 奖励发放 | 被推荐人完成注册并通过风控后发放 |
| 奖励状态 | pending / approved / rejected / rewarded |
| 入口 | 用户中心 -> 推荐奖励 |

#### 3.6.3 用户页面

推荐奖励页展示：

- 我的推荐码
- 推荐链接
- 复制链接按钮
- 已成功推荐人数，例如 `3/5`
- 已获得奖励积分
- 推荐记录列表：被推荐用户、注册时间、状态、奖励积分
- 规则说明：每成功推荐 1 人送 100 积分，最多 5 人

#### 3.6.4 推荐链接

推荐链接格式建议：

```text
https://example.com/zh-HK/register?ref=USER_REFERRAL_CODE
https://example.com/en-US/register?ref=USER_REFERRAL_CODE
```

如果用户通过推荐链接进入注册页：

- 注册页展示“您正在通过好友推荐注册”提示。
- 注册成功后绑定推荐关系。
- 如果推荐码无效或超过奖励上限，允许继续注册，但不产生奖励。

#### 3.6.5 风控要求

- 同一设备、同一 IP、同一邮箱域异常批量注册需要标记为风险。
- 被推荐人如果已存在账号，不产生奖励。
- 被推荐人与推荐人相同账号主体，不产生奖励。
- 管理员可手动驳回异常推荐记录。
- 被封禁用户不能产生推荐奖励。

---

## 四、后台管理需求

### 4.1 后台信息架构

```
管理后台
├── 仪表盘
├── 工具管理
│   ├── 工具列表
│   ├── 新增/编辑工具
│   ├── 输入参数配置
│   ├── RunningHub 工作流配置
│   └── 输出解析配置
├── 分类与导航
├── 任务记录
├── 批量任务
├── 云盘连接
├── 用户管理
├── 推荐奖励
├── 积分与订单
├── 内容管理
│   ├── Blog
│   ├── FAQ
│   └── SEO
└── 系统设置
```

### 4.2 工具管理

#### 4.2.1 工具基础信息

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| toolKey | 是 | 工具唯一标识，如 `remove-background` |
| nameI18n | 是 | 前台展示名称，中英文 |
| slug | 是 | URL 标识，如 `/tools/remove-background` |
| categoryId | 是 | 所属分类 |
| shortDescriptionI18n | 是 | 卡片描述，中英文 |
| longDescriptionI18n | 否 | 工具页详细介绍，中英文 |
| coverImage | 是 | 卡片封面 |
| heroImage | 否 | 工具页主视觉 |
| tags | 否 | 热门、新品、免费等 |
| sortOrder | 是 | 排序 |
| isFeatured | 是 | 是否首页热门 |
| status | 是 | draft / active / inactive |
| creditCost | 是 | 每次执行扣除积分 |
| estimatedSeconds | 否 | 预计耗时 |
| seoTitleI18n | 否 | SEO 标题，中英文 |
| seoDescriptionI18n | 否 | SEO 描述，中英文 |

#### 4.2.2 RunningHub 配置

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| provider | 是 | 固定为 `runninghub`，预留多供应商 |
| workflowId | 是 | RunningHub workflowID |
| workflowName | 否 | 工作流备注名称 |
| instanceType | 是 | 如 `default` |
| usePersonalQueue | 是 | 是否使用个人队列 |
| addMetadata | 是 | 是否传 metadata |
| timeoutSeconds | 是 | 最大等待时间 |
| pollingIntervalMs | 是 | 轮询间隔 |
| apiBaseUrl | 否 | 默认读取系统配置 |
| taskApiBaseUrl | 否 | 默认读取系统配置 |
| isEnabled | 是 | 是否启用该配置 |

#### 4.2.3 输入节点配置

后台可以为每个工具配置多个输入字段，每个字段映射到 RunningHub 的 `nodeInfoList`。

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| key | 是 | 前端表单字段名 |
| labelI18n | 是 | 前台字段标签，中英文；后台表单编辑界面显示中文 |
| controlType | 是 | 上传、文本、选择器、滑块等 |
| nodeId | 是 | RunningHub 节点 ID |
| fieldName | 是 | RunningHub 节点字段名，如 `image`、`prompt`、`value` |
| valueType | 是 | string / number / boolean / imageUrl / videoUrl / json |
| required | 是 | 是否必填 |
| defaultValue | 否 | 默认值 |
| placeholderI18n | 否 | 前台占位说明，中英文 |
| helpTextI18n | 否 | 前台辅助说明，中英文 |
| validationRules | 否 | 文件大小、格式、范围、长度 |
| options | 否 | select/radio 选项，选项 label 需支持中英文 |
| sortOrder | 是 | 表单排序 |
| isAdvanced | 是 | 是否高级参数 |

示例：图片背景移除工具配置

```json
{
  "toolKey": "remove-background",
  "name": "图片背景移除",
  "runningHub": {
    "workflowId": "2075488908690935809",
    "instanceType": "default",
    "usePersonalQueue": false,
    "addMetadata": true
  },
  "inputs": [
    {
      "key": "image",
      "label": "上传图片",
      "controlType": "image_upload",
      "nodeId": "9",
      "fieldName": "image",
      "valueType": "imageUrl",
      "required": true,
      "validationRules": {
        "maxSizeMb": 10,
        "accept": ["jpg", "jpeg", "png", "webp"]
      }
    }
  ]
}
```

示例：AI 图片生成工具配置

```json
{
  "toolKey": "ai-image-generator",
  "name": "AI 图片生成器",
  "runningHub": {
    "workflowId": "后台填写",
    "instanceType": "default",
    "usePersonalQueue": false,
    "addMetadata": true
  },
  "inputs": [
    {
      "key": "prompt",
      "label": "提示词",
      "controlType": "textarea",
      "nodeId": "后台填写",
      "fieldName": "prompt",
      "valueType": "string",
      "required": true
    },
    {
      "key": "style",
      "label": "风格",
      "controlType": "select",
      "nodeId": "后台填写",
      "fieldName": "value",
      "valueType": "string",
      "required": false,
      "options": [
        { "label": "写实", "value": "realistic" },
        { "label": "动漫", "value": "anime" },
        { "label": "电商", "value": "ecommerce" }
      ]
    }
  ]
}
```

#### 4.2.4 输出解析配置

不同 RunningHub 工作流的返回结构可能不同，后台需要配置输出解析规则。

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| outputType | 是 | image / video / text / file / mixed |
| path | 否 | 从 outputs 中取值的路径，如 `fileUrl` |
| fallbackPaths | 否 | 备用路径，如 `url`、`download_url` |
| multiple | 是 | 是否多结果 |
| filenameTemplate | 否 | 下载文件名模板 |
| previewMode | 是 | image / video / before_after / gallery |

默认解析顺序：

1. `output.fileUrl`
2. `output.url`
3. `output.file_url`
4. `output.download_url`
5. 字符串 URL

### 4.3 任务记录管理

后台任务列表需展示：

- 本地任务 ID
- RunningHub taskId
- 用户
- 工具名称
- 输入摘要
- 状态
- 消耗积分
- 创建时间
- 完成时间
- 错误信息
- 操作：查看详情、重试、退款积分、复制 taskId

### 4.4 分类与导航管理

后台可管理首页和导航内容：

- 工具分类名称
- 分类图标
- 分类排序
- 是否显示在导航下拉菜单
- 是否显示在首页
- 首页热门工具排序
- 页脚工具列表

### 4.5 会员与云盘批处理管理

#### 4.5.1 会员套餐配置

后台可配置不同会员等级的权益。默认必须初始化 `PRO`、`PRO+`、`PRO MAX` 三档，后台允许后续调整价格、额度、排序和上下线状态，但不能删除仍有有效订阅用户的套餐。

| 字段 | 说明 |
| --- | --- |
| planKey | 套餐唯一标识：`pro`、`pro_plus`、`pro_max` |
| nameI18n | 前台套餐名称，中英文，例如 `PRO`、`PRO+`、`PRO MAX` |
| monthlyPriceUsd | 月付价格，默认 9.99 / 29.99 / 49.99 |
| yearlyPriceUsd | 年付总价，可为空时按月价和折扣自动计算 |
| yearlyDiscountPercent | 年付折扣，默认 40 |
| isPopular | 是否热门套餐，默认 `PRO+` 为 true |
| popularBadgeI18n | 热门徽标文案，中英文，例如 Most Popular / 最受欢迎 |
| dailyUses | 每日工具使用次数，PRO MAX 可用 `null` 表示不限 |
| monthlyCredits | 每月积分 |
| monthlyImages | 每月图片额度 |
| monthlyVideos | 每月视频额度 |
| generationPriority | 生成优先级：standard / high / highest |
| hdWatermarkFree | 是否支持高清无水印下载 |
| featureItemsI18n | 前台权益列表，中英文，可配置排序和重点数字 |
| batchEnabled | 是否允许批量处理 |
| cloudDriveEnabled | 是否允许连接云盘 |
| allowedCloudProviders | 允许的云盘来源：google_drive、dropbox |
| maxBatchItems | 单批最大图片数量 |
| maxFileSizeMb | 单文件最大大小 |
| batchConcurrency | 批量任务并发数 |
| canWriteBackToCloud | 是否允许结果回写云盘 |
| priorityQueue | 是否优先队列 |
| sortOrder | 排序 |
| status | active / inactive |

默认套餐配置：

| planKey | 月付价格 | dailyUses | monthlyCredits | monthlyImages | monthlyVideos | generationPriority | maxBatchItems |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pro | 9.99 | 50 | 300 | 150 | 30 | standard | 50 |
| pro_plus | 29.99 | 300 | 1500 | 750 | 150 | high | 150 |
| pro_max | 49.99 | 不限 | 5000 | 2500 | 500 | highest | 500 |

#### 4.5.2 云盘连接管理

后台只展示必要排障信息，不展示用户完整 OAuth Token。

| 字段 | 说明 |
| --- | --- |
| 用户 | 用户 ID、邮箱、会员等级 |
| 云盘类型 | Google Drive / Dropbox |
| 连接状态 | active / expired / revoked / error |
| 授权范围 | scope 摘要 |
| 授权时间 | 首次连接时间 |
| 最近使用 | 最近一次批量任务时间 |
| 操作 | 断开连接、标记异常、查看任务 |

#### 4.5.3 批量任务管理

后台批量任务列表需展示：

- 批量任务 ID
- 用户
- 工具名称
- 来源：local / google_drive / dropbox
- 文件总数
- 成功数、失败数、处理中数量
- 消耗积分
- 创建时间、完成时间
- 操作：查看子任务、重试失败项、导出 CSV、退款积分

#### 4.5.4 工具批量能力配置

每个工具可配置是否支持批量处理：

| 字段 | 说明 |
| --- | --- |
| batchEnabled | 是否支持批量执行 |
| batchInputKey | 批量图片对应的输入字段 key，如 `image` |
| maxBatchItemsOverride | 覆盖套餐默认单批数量 |
| outputNamingTemplate | 输出命名模板 |
| allowCloudInput | 是否允许云盘作为输入 |
| allowCloudWriteBack | 是否允许结果回写云盘 |

### 4.6 推荐奖励管理

后台推荐奖励管理需要支持：

- 查看推荐人、被推荐人、推荐码、注册时间、奖励状态。
- 查看推荐人已成功奖励人数和剩余名额。
- 配置推荐奖励积分，默认 100。
- 配置每个账号可奖励人数上限，默认 5。
- 手动通过、驳回或撤销推荐奖励。
- 查看风控原因，例如同 IP 高频注册、同设备、自我推荐。
- 导出推荐记录 CSV。

后台字段：

| 字段 | 说明 |
| --- | --- |
| referrerUserId | 推荐人 |
| referredUserId | 被推荐人 |
| referralCode | 推荐码 |
| rewardCredits | 奖励积分，默认 100 |
| status | pending / approved / rejected / rewarded |
| riskFlags | 风控标记 |
| rewardedAt | 奖励发放时间 |
| rejectedReason | 驳回原因 |

### 4.7 Node.js 自研后台方案

#### 4.7.1 调整结论

Cockpit Headless CMS 需要引入 PHP 运行环境，和当前项目以 Node.js 为核心的技术方向不一致，因此本项目不再采用 Cockpit 作为后台或 Blog CMS。后台、内容管理、工具配置、会员、订单、任务和 Blog 均采用 Node.js 自研实现，保持单一技术栈和部署链路。

推荐架构：

```
前台 Web
  -> Node.js API
      -> 自研数据库：工具、分类、页面、Blog、FAQ、SEO、用户、会员、订单、任务、云盘 token、执行记录
      -> RunningHub API：上传、执行、状态、输出
  -> Node.js 中文管理后台：运营配置工具、内容和业务数据
```

#### 4.7.2 自研后台承载模块

| 模块 | 说明 |
| --- | --- |
| 工具基础信息 | 工具名称、描述、封面、分类、排序、上下线 |
| 前台中英文内容 | 使用 `LocalizedText` 结构保存 `zh-HK` 与 `en-US` |
| SEO 配置 | title、description、canonical、slug、hreflang 映射 |
| Blog / 教程 / FAQ | 由自研后台提供文章、分类、作者、发布和 SEO 管理 |
| 首页热门工具与导航 | 使用后台配置驱动前台展示 |
| RunningHub workflowID 配置 | 保存 workflowID、instanceType、usePersonalQueue，并通过测试执行校验 |
| 输入字段 nodeId / fieldName 配置 | 使用结构化表单管理动态输入字段 |
| 输出解析规则 | 配置图片、视频、文本结果的解析路径和 fallback 规则 |
| 用户、会员和积分 | 与订单、扣费、推荐奖励、风控统一管理 |
| 批量任务和云盘连接 | 使用队列和加密存储处理 Google Drive / Dropbox 授权 |

#### 4.7.3 后台数据模型建议

| 模型 | 用途 |
| --- | --- |
| `Tool` | AI 工具配置 |
| `ToolCategory` | 工具分类 |
| `PageConfig` | 首页、价格页、导航、页脚等页面配置 |
| `PricingPlan` | 会员套餐与权益配置 |
| `Faq` | FAQ 内容 |
| `BlogPost` | Blog / 教程文章 |
| `BlogCategory` | Blog 分类 |
| `SeoSetting` | 全站 SEO 默认值 |
| `User` | 用户基础信息 |
| `Membership` | 会员等级、有效期和权益快照 |
| `CreditLedger` | 积分流水 |
| `TaskRecord` | 单任务执行记录 |
| `BatchTask` | 批量任务记录 |
| `CloudDriveConnection` | Google Drive / Dropbox 授权状态和加密 token |
| `ReferralRecord` | 推荐关系和奖励状态 |

`Tool` 模型字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `toolKey` | string | 工具唯一标识 |
| `nameI18n` | LocalizedText | 前台双语名称 |
| `slug` | string | 默认 slug |
| `localizedSlugs` | LocalizedText | 语言化 slug |
| `categoryId` | string | 关联分类 |
| `coverImage` | string | 封面图 |
| `shortDescriptionI18n` | LocalizedText | 双语卡片描述 |
| `longDescriptionI18n` | LocalizedText | 双语详情描述 |
| `runningHubConfig` | object | workflowID、instanceType、queue 配置 |
| `inputFields` | array | nodeId、fieldName、controlType、labelI18n 等 |
| `outputConfig` | object | 输出解析规则 |
| `batchConfig` | object | 是否支持批量和云盘输入 |
| `seoI18n` | object | 双语 SEO |
| `status` | enum | draft / active / inactive |
| `sortOrder` | number | 排序 |

#### 4.7.4 实现原则

- 前台只调用 Node.js API，不直接调用 RunningHub。
- 后台界面固定中文，但所有前台展示字段必须支持中英文录入。
- 工作流配置保存前必须支持“测试执行”，避免 nodeId / fieldName 配错后上线。
- API Key、OAuth Token、支付密钥只存环境变量或加密存储，不进入前端和普通内容表。
- Blog、FAQ、SEO 与工具配置走同一套权限和审计日志。
- 批量任务使用队列执行，避免管理后台请求长时间阻塞。

#### 4.7.5 Cockpit 方案撤销说明

本项目曾评估 Cockpit Headless CMS，但因其核心运行环境为 PHP，会增加部署、运维和二次开发复杂度。当前决策为撤销 Cockpit POC，回到 Node.js 自研后台方案。若未来需要独立 CMS，也应优先选择 Node.js 生态方案或在明确收益后重新评估。

---

## 五、核心业务流程

### 5.1 用户执行工具流程

```
进入首页
  -> 搜索/点击工具
  -> 进入工具页
  -> 上传图片或填写参数
  -> 前端提交表单
  -> 后端校验工具配置与用户额度
  -> 文件上传到 RunningHub 媒体接口
  -> 后端组装 nodeInfoList
  -> 调用 RunningHub workflow
  -> 保存本地任务记录
  -> 前端轮询本地任务状态
  -> 后端轮询/查询 RunningHub 状态
  -> 成功后获取 outputs
  -> 前端展示结果
  -> 用户下载或再次编辑
```

### 5.2 后台新增工具流程

```
管理员登录后台
  -> 新增工具
  -> 填写名称、分类、封面、描述
  -> 填写 RunningHub workflowID
  -> 添加输入字段并配置 nodeId / fieldName
  -> 配置输出解析规则
  -> 保存为草稿
  -> 使用测试图片执行测试
  -> 测试成功后上线
  -> 首页/工具列表自动展示
```

### 5.3 扣费流程

MVP 可先不扣费；正式版按如下流程：

1. 用户提交任务前检查积分。
2. 创建本地任务时冻结积分。
3. RunningHub 成功后扣除冻结积分。
4. RunningHub 失败后释放冻结积分。
5. 管理员可手动补偿或退款积分。

### 5.3.1 推荐奖励发放流程

```
推荐人进入用户中心
  -> 复制推荐链接
  -> 被推荐人打开注册链接
  -> 系统记录 referralCode
  -> 被推荐人完成注册
  -> 后端校验推荐码、推荐人状态、奖励上限、自我推荐、风险规则
  -> 创建 ReferralRecord
  -> 若通过校验，将状态置为 approved
  -> 给推荐人增加 100 积分并写入积分流水
  -> ReferralRecord 置为 rewarded
  -> 推荐人可在用户中心查看进度
```

奖励不发放场景：

- 推荐码不存在或已停用。
- 推荐人已获得 5 次推荐奖励。
- 被推荐人不是新用户。
- 被推荐人与推荐人为同一账号主体。
- 风控判断异常并被管理员驳回。

### 5.4 会员云盘批量处理流程

```
会员进入批量处理页
  -> 选择支持批量的工具
  -> 选择 Google Drive / Dropbox 作为来源
  -> 若未连接则发起 OAuth 授权
  -> 用户在云盘选择多张图片或文件夹
  -> 后端拉取文件元数据并校验数量、大小、格式、会员权益
  -> 用户确认统一参数和费用预估
  -> 创建 BatchTask
  -> 为每张图片创建 ExecutionTask 子任务
  -> 按会员并发限制逐个上传到 RunningHub 并执行工作流
  -> 汇总成功和失败结果
  -> 用户下载 ZIP 或保存结果到云盘
```

### 5.5 Google Drive 集成要求

- 使用 OAuth 2.0 授权。
- 优先使用 Google Picker 让用户主动选择文件或文件夹。
- 权限遵循最小权限原则，优先使用只访问用户选择文件的范围。
- 后端保存 refresh token 时必须加密。
- 仅下载任务所需图片，不扫描用户整个网盘。
- 支持用户在用户中心断开 Google Drive。

推荐权限策略：

| 权限 | 用途 |
| --- | --- |
| `drive.file` | 访问用户通过 Picker 选择或由应用创建的文件 |
| `drive.readonly` | 仅在需要读取用户选择文件夹内文件时申请，需明确说明用途 |

### 5.6 Dropbox 集成要求

- 使用 OAuth 2.0 授权。
- 使用细粒度 scopes 申请文件列表和文件读取权限。
- 若支持回写结果，需要额外申请文件写入权限。
- 后端保存 access token / refresh token 时必须加密。
- 支持用户在用户中心断开 Dropbox。

推荐权限策略：

| Scope | 用途 |
| --- | --- |
| `files.metadata.read` | 读取用户选择文件/文件夹的元数据 |
| `files.content.read` | 下载待处理图片 |
| `files.content.write` | 将处理结果写回 Dropbox，只有开启回写时申请 |

---

## 六、数据模型

### 6.0 通用本地化类型

```typescript
type Locale = 'zh-HK' | 'en-US';

interface LocalizedText {
  'zh-HK': string;
  'en-US': string;
}

interface LocalizedOptionalText {
  'zh-HK'?: string;
  'en-US'?: string;
}
```

### 6.1 Tool

```typescript
interface Tool {
  id: string;
  toolKey: string;
  nameI18n: LocalizedText;
  slug: string;
  localizedSlugs?: Partial<Record<Locale, string>>;
  categoryId: string;
  shortDescriptionI18n: LocalizedText;
  longDescriptionI18n?: LocalizedOptionalText;
  coverImage: string;
  heroImage?: string;
  tags: string[];
  creditCost: number;
  batchEnabled: boolean;
  batchInputKey?: string;
  estimatedSeconds?: number;
  sortOrder: number;
  isFeatured: boolean;
  status: 'draft' | 'active' | 'inactive';
  seoTitleI18n?: LocalizedOptionalText;
  seoDescriptionI18n?: LocalizedOptionalText;
  createdAt: string;
  updatedAt: string;
}
```

### 6.2 ToolWorkflowConfig

```typescript
interface ToolWorkflowConfig {
  id: string;
  toolId: string;
  provider: 'runninghub';
  workflowId: string;
  workflowName?: string;
  instanceType: string;
  usePersonalQueue: boolean;
  addMetadata: boolean;
  timeoutSeconds: number;
  pollingIntervalMs: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 6.3 ToolInputField

```typescript
type ControlType =
  | 'image_upload'
  | 'video_upload'
  | 'text_prompt'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'slider'
  | 'number'
  | 'color'
  | 'mask_editor';

type ValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'imageUrl'
  | 'videoUrl'
  | 'json';

interface ToolInputField {
  id: string;
  toolId: string;
  key: string;
  labelI18n: LocalizedText;
  controlType: ControlType;
  nodeId: string;
  fieldName: string;
  valueType: ValueType;
  required: boolean;
  defaultValue?: unknown;
  placeholderI18n?: LocalizedOptionalText;
  helpTextI18n?: LocalizedOptionalText;
  validationRules?: {
    maxSizeMb?: number;
    accept?: string[];
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  options?: Array<{
    labelI18n: LocalizedText;
    value: string | number | boolean;
    descriptionI18n?: LocalizedOptionalText;
  }>;
  sortOrder: number;
  isAdvanced: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 6.4 ToolOutputConfig

```typescript
interface ToolOutputConfig {
  id: string;
  toolId: string;
  outputType: 'image' | 'video' | 'text' | 'file' | 'mixed';
  path?: string;
  fallbackPaths: string[];
  multiple: boolean;
  filenameTemplate?: string;
  previewMode: 'image' | 'video' | 'before_after' | 'gallery';
  createdAt: string;
  updatedAt: string;
}
```

### 6.5 ExecutionTask

```typescript
type ExecutionStatus =
  | 'pending'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface ExecutionTask {
  id: string;
  userId?: string;
  toolId: string;
  batchTaskId?: string;
  sourceProvider?: 'local' | 'google_drive' | 'dropbox';
  sourceFileId?: string;
  runningHubTaskId?: string;
  status: ExecutionStatus;
  inputValues: Record<string, unknown>;
  nodeInfoList: Array<{
    nodeId: string;
    fieldName: string;
    fieldValue: unknown;
  }>;
  outputValues?: unknown[];
  outputUrls: string[];
  creditCost: number;
  errorCode?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 6.6 User

```typescript
interface User {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  role: 'user' | 'admin';
  preferredLocale: Locale;
  referralCode: string;
  rewardedReferralCount: number;
  membershipPlanId?: string;
  membershipExpiresAt?: string;
  creditBalance: number;
  status: 'active' | 'disabled';
  createdAt: string;
  updatedAt: string;
}
```

### 6.6.1 ReferralRecord

```typescript
type ReferralStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'rewarded';

interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referralCode: string;
  rewardCredits: number;
  status: ReferralStatus;
  riskFlags: string[];
  rejectedReason?: string;
  approvedAt?: string;
  rewardedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 6.6.2 CreditLedger

```typescript
type CreditLedgerType =
  | 'purchase'
  | 'execution_cost'
  | 'execution_refund'
  | 'referral_reward'
  | 'admin_adjustment';

interface CreditLedger {
  id: string;
  userId: string;
  type: CreditLedgerType;
  amount: number;
  balanceAfter: number;
  relatedId?: string;
  note?: string;
  createdAt: string;
}
```

### 6.7 MembershipPlan

```typescript
type MembershipPlanKey = 'pro' | 'pro_plus' | 'pro_max';
type GenerationPriority = 'standard' | 'high' | 'highest';

interface MembershipPlan {
  id: string;
  planKey: MembershipPlanKey;
  nameI18n: LocalizedText;
  monthlyPriceUsd: number;
  yearlyPriceUsd?: number;
  yearlyDiscountPercent: number;
  isPopular: boolean;
  popularBadgeI18n?: LocalizedText;
  dailyUses: number | null;
  monthlyCredits: number;
  monthlyImages: number;
  monthlyVideos: number;
  generationPriority: GenerationPriority;
  hdWatermarkFree: boolean;
  featureItemsI18n: Array<{
    label: LocalizedText;
    highlightedValue?: string;
    tooltip?: LocalizedText;
    sortOrder: number;
  }>;
  batchEnabled: boolean;
  cloudDriveEnabled: boolean;
  allowedCloudProviders: Array<'google_drive' | 'dropbox'>;
  maxBatchItems: number;
  maxFileSizeMb: number;
  batchConcurrency: number;
  canWriteBackToCloud: boolean;
  priorityQueue: boolean;
  sortOrder: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
```

### 6.8 CloudDriveConnection

```typescript
interface CloudDriveConnection {
  id: string;
  userId: string;
  provider: 'google_drive' | 'dropbox';
  providerAccountId: string;
  providerEmail?: string;
  scopes: string[];
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  tokenExpiresAt?: string;
  status: 'active' | 'expired' | 'revoked' | 'error';
  connectedAt: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 6.9 BatchTask

```typescript
type BatchTaskStatus =
  | 'draft'
  | 'validating'
  | 'queued'
  | 'processing'
  | 'partial_completed'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface BatchTask {
  id: string;
  userId: string;
  toolId: string;
  sourceProvider: 'local' | 'google_drive' | 'dropbox';
  cloudDriveConnectionId?: string;
  status: BatchTaskStatus;
  totalCount: number;
  successCount: number;
  failedCount: number;
  processingCount: number;
  inputValues: Record<string, unknown>;
  outputMode: 'zip_download' | 'cloud_write_back' | 'both';
  outputFolderId?: string;
  outputNamingTemplate: string;
  estimatedCreditCost: number;
  finalCreditCost?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
```

### 6.10 BatchTaskItem

```typescript
interface BatchTaskItem {
  id: string;
  batchTaskId: string;
  executionTaskId?: string;
  sourceFileId: string;
  sourceFileName: string;
  sourceMimeType: string;
  sourceSize: number;
  status: ExecutionStatus;
  outputUrl?: string;
  cloudOutputFileId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 七、后端 API 需求

### 7.1 前台 API

| Method | URL | 说明 |
| --- | --- | --- |
| GET | `/api/tools` | 工具列表 |
| GET | `/api/tools/:slug` | 工具详情和表单配置 |
| POST | `/api/tools/:toolId/execute` | 执行工具 |
| GET | `/api/tasks/:taskId` | 查询本地任务状态 |
| GET | `/api/tasks/:taskId/outputs` | 查询任务输出 |
| GET | `/api/categories` | 工具分类 |
| GET | `/api/me` | 当前用户信息 |
| GET | `/api/me/tasks` | 我的执行历史 |
| GET | `/api/me/referrals` | 我的推荐码、推荐链接、推荐记录和奖励进度 |
| POST | `/api/referrals/validate` | 注册前校验推荐码是否可用 |
| GET | `/api/membership/plans` | 会员套餐列表 |
| GET | `/api/me/cloud-drives` | 我的云盘连接 |
| POST | `/api/me/cloud-drives/:provider/connect` | 发起 Google Drive / Dropbox OAuth |
| POST | `/api/me/cloud-drives/:provider/callback` | OAuth 回调绑定 |
| DELETE | `/api/me/cloud-drives/:id` | 断开云盘连接 |
| GET | `/api/cloud-drives/:id/files` | 浏览已授权范围内的文件或文件夹 |
| POST | `/api/batch-tasks/estimate` | 批量任务费用和限制预估 |
| POST | `/api/batch-tasks` | 创建批量处理任务 |
| GET | `/api/batch-tasks/:id` | 查询批量任务进度 |
| POST | `/api/batch-tasks/:id/retry-failed` | 重试失败项 |
| POST | `/api/batch-tasks/:id/write-back` | 将结果保存到云盘 |

前台 API 需要根据 `Accept-Language`、URL locale 前缀或用户 `preferredLocale` 返回当前语言文案，同时可在管理端保留完整 i18n 字段。

### 7.2 后台 API

| Method | URL | 说明 |
| --- | --- | --- |
| GET | `/api/admin/tools` | 后台工具列表 |
| POST | `/api/admin/tools` | 新增工具 |
| PUT | `/api/admin/tools/:id` | 更新工具 |
| POST | `/api/admin/tools/:id/test` | 测试工作流配置 |
| PATCH | `/api/admin/tools/:id/status` | 上下线工具 |
| GET | `/api/admin/tasks` | 任务记录 |
| GET | `/api/admin/users` | 用户列表 |
| GET | `/api/admin/referrals` | 推荐奖励记录 |
| PATCH | `/api/admin/referrals/:id/status` | 手动通过、驳回或撤销推荐奖励 |
| GET | `/api/admin/credit-ledgers` | 积分流水查询 |
| GET | `/api/admin/membership-plans` | 会员套餐管理，默认包含 PRO / PRO+ / PRO MAX |
| PUT | `/api/admin/membership-plans/:id` | 更新会员套餐权益 |
| GET | `/api/admin/cloud-drive-connections` | 云盘连接排障列表 |
| GET | `/api/admin/batch-tasks` | 批量任务列表 |
| GET | `/api/admin/batch-tasks/:id/items` | 批量任务子项列表 |
| GET | `/api/admin/stats` | 运营统计 |

所有后台 API 均由 Node.js 自研服务提供，内容型数据和业务型数据统一鉴权、统一审计、统一错误格式。

### 7.3 RunningHub 代理 API

后端统一代理 RunningHub，不允许前端直接调用 RunningHub 或暴露 API Key。

| Method | URL | 说明 |
| --- | --- | --- |
| POST | `/api/runninghub/upload` | 上传图片/视频到 RunningHub |
| POST | `/api/runninghub/workflow/:workflowId` | 创建 RunningHub 工作流任务 |
| POST | `/api/runninghub/status` | 查询 RunningHub 任务状态 |
| POST | `/api/runninghub/outputs` | 获取 RunningHub 任务输出 |

### 7.4 执行工具请求示例

```json
{
  "inputValues": {
    "image": "local-upload-file-id",
    "backgroundType": "transparent"
  }
}
```

后端根据后台配置转换为 RunningHub 请求：

```json
{
  "addMetadata": true,
  "nodeInfoList": [
    {
      "nodeId": "9",
      "fieldName": "image",
      "fieldValue": "https://runninghub-upload-url/example.png"
    }
  ],
  "instanceType": "default",
  "usePersonalQueue": false
}
```

---

## 八、权限与安全

### 8.1 权限角色

| 角色 | 权限 |
| --- | --- |
| 游客 | 浏览工具、试用免费工具、查看价格 |
| 登录用户 | 执行工具、查看历史、下载结果、购买积分 |
| 管理员 | 管理工具、用户、订单、任务和系统配置 |

### 8.2 安全要求

- RunningHub API Key 只能保存在后端环境变量或密钥管理系统。
- `.env` 不允许提交到 Git。
- Google Drive / Dropbox OAuth Client Secret 只能保存在后端环境变量或密钥管理系统。
- 云盘 access token / refresh token 必须加密存储，禁止明文入库。
- 断开云盘连接时必须删除本地 token，并停止未开始的云盘批量任务。
- 所有上传文件需校验 MIME、扩展名、大小。
- 不允许直接使用用户上传文件名作为存储文件名。
- 后台接口必须鉴权并校验管理员角色。
- 所有外部输入必须做服务端验证。
- 错误响应不返回系统堆栈。
- 日志不得记录完整 API Key、Token、密码、支付信息。
- 云盘文件读取遵循最小权限原则，只读取用户选择或授权范围内的文件。
- 推荐奖励需要防止自我推荐、批量虚假注册、同设备/同 IP 滥用。
- 积分变动必须写入积分流水，不允许只改用户余额。

---

## 九、非功能需求

### 9.1 性能

- 首页首屏核心内容加载时间目标小于 2.5 秒。
- 工具列表支持分页或懒加载。
- 图片资源使用 WebP/AVIF 优先。
- 上传文件最大默认 10MB，可由后台配置。
- 批量任务需要进入队列执行，避免一次性提交过多 RunningHub 任务。
- 同一用户批量并发数按会员套餐限制，默认 Pro 为 3-5。
- 任务轮询默认 3 秒一次，超时默认 10 分钟。

### 9.2 可用性

- RunningHub 调用失败时，前台展示友好错误和重试入口。
- 任务成功率、失败率和耗时需要被记录。
- 后台测试工具配置失败时，应展示 RunningHub 原始错误摘要。
- 批量任务支持部分成功，失败项可单独重试，不阻塞成功结果下载。

### 9.3 SEO

- 每个工具有独立 slug、title、description。
- 工具页包含教程、FAQ、相关工具。
- 首页和分类页生成可索引内容。
- 前台中英文页面需要分别生成 title、description、canonical 和 `hreflang`。
- 推荐路由结构为 `/zh-HK/tools/remove-background` 与 `/en-US/tools/remove-background`。
- Blog / 教程可按语言独立发布，缺少英文版本时不要生成英文索引页。

### 9.4 响应式

- 桌面端：三列工具卡片、顶部完整导航。
- 平板端：两列工具卡片。
- 移动端：单列工具卡片、底部或折叠菜单。

### 9.5 国际化

- 前台所有用户可见文案必须走 i18n 字典或后台本地化字段。
- 后台管理界面固定中文，不提供语言切换。
- 所有中文显示文案必须使用繁体中文，不允许在页面中出现简体中文。
- 后台录入前台内容时，需要支持中文和英文两个输入区。
- 前台新增错误码时必须同时补充中文和英文错误文案。
- 日期、数字、金额展示按当前语言 locale 格式化。

---

## 十、MVP 里程碑

### 阶段一：工具平台基础

- [ ] 首页工具市场
- [ ] 工具分类与搜索
- [ ] 工具详情页
- [ ] 前台中英双语框架
- [ ] 后端 RunningHub 代理
- [ ] 图片背景移除工具配置化

### 阶段二：后台配置能力

- [ ] 后台登录
- [ ] Node.js 自研中文管理后台框架
- [ ] 工具 CRUD
- [ ] RunningHub workflowID 配置
- [ ] 输入字段 nodeId / fieldName 配置
- [ ] 工具和表单字段中英文录入
- [ ] 输出解析配置
- [ ] 工具测试执行

### 阶段三：用户与任务

- [ ] 用户注册/登录
- [ ] 推荐码生成和推荐注册绑定
- [ ] 推荐奖励积分发放和上限控制
- [ ] 执行历史
- [ ] 积分余额
- [ ] 积分扣费与失败退回
- [ ] 任务管理后台

### 阶段四：会员与云盘批量处理

- [ ] 三级会员套餐配置：PRO、PRO+、PRO MAX
- [ ] 价格页月付/年付切换和 PRO+ 热门标记
- [ ] Google Drive OAuth 连接
- [ ] Dropbox OAuth 连接
- [ ] 云盘文件选择和文件夹读取
- [ ] 批量任务队列
- [ ] 批量结果 ZIP 下载
- [ ] 结果回写云盘

### 阶段五：商业化与内容

- [ ] 价格页
- [ ] 套餐订单
- [ ] API 页面
- [ ] Blog/教程接入 Node.js 自研内容管理
- [ ] SEO 优化

---

## 十一、验收标准

### 11.1 前台验收

- 用户能在首页看到热门工具和全部工具。
- 用户能在前台切换中文和英文，导航、工具、表单、状态和错误提示随语言切换。
- 用户能搜索并进入指定工具页。
- 工具页能根据后台配置动态渲染输入表单。
- 用户上传图片后能执行 RunningHub 工作流。
- 任务成功后能预览并下载结果。
- 任务失败时能看到友好错误信息。
- 价格页能展示 PRO、PRO+、PRO MAX 三档会员，PRO+ 默认显示最受欢迎标记。
- 会员能在月付和年付之间切换，并看到年付折扣提示。
- PRO / PRO+ / PRO MAX 会员能连接 Google Drive 或 Dropbox 并选择多张图片创建批量任务。
- 批量任务能展示总进度、成功数、失败数，并支持下载 ZIP。
- 会员能复制推荐链接，成功推荐新用户注册后获得 100 积分。
- 每个账号最多只能获得 5 次推荐奖励。

### 11.2 后台验收

- Node.js 自研后台中能配置工具、分类、首页、FAQ、Blog 和 SEO，并由前台读取展示。
- 管理员能新增一个工具并配置 workflowID。
- 管理员能在中文后台为前台工具录入中文和英文名称、描述、SEO、表单字段和选项文案。
- 管理员能配置至少一个图片上传字段，填写 nodeId 和 fieldName。
- 管理员能配置输出解析规则。
- 管理员能在后台测试该工具，成功后上线。
- 工具上线后自动出现在前台工具列表。
- 管理员能配置 PRO、PRO+、PRO MAX 的价格、折扣、积分、图片额度、视频额度、每日使用次数、热门标记、批量数量、云盘权限、并发数和是否允许云盘回写。
- 管理员能查看推荐记录、奖励状态、风险标记，并可手动驳回异常推荐。
- 管理员能查看批量任务和云盘连接状态，但看不到明文 OAuth Token。

### 11.3 技术验收

- 自研 Node API 能从数据库读取工具配置并生成前台所需结构。
- API Key、OAuth Token、支付密钥不得出现在前端、日志或普通内容表中。
- 前端不包含 RunningHub API Key。
- 后端通过环境变量读取 RunningHub API Key。
- 所有工具调用统一经过后端代理。
- 任务状态和输出结果有本地记录。
- 推荐奖励发放必须写入 `ReferralRecord` 和 `CreditLedger`，并保证同一被推荐用户不能重复奖励。
- Google Drive / Dropbox Token 加密存储，并支持用户主动断开连接。
- 批量任务进入队列执行，并受会员并发限制约束。
- 前台 API 能根据 locale 返回对应语言文案；后台接口保持中文管理体验。
- 通过基础 lint/test 检查。

---

## 十二、风险与待确认问题

### 12.1 风险

| 风险 | 影响 | 方案 |
| --- | --- | --- |
| RunningHub 工作流节点字段不稳定 | 工具执行失败 | 后台提供测试执行，保存可用配置 |
| 不同工作流输出结构不同 | 无法展示结果 | 输出解析规则配置化 |
| 视频任务耗时较长 | 用户等待体验差 | 增加历史任务和通知机制 |
| 免费滥用 | 成本不可控 | 登录、限流、验证码、免费额度 |
| 推荐奖励被刷 | 积分成本失控 | 限制每账号最多 5 人、同设备/IP 风控、管理员审核异常记录 |
| 图片版权/敏感内容 | 合规风险 | 用户协议、内容审核、举报 |
| 云盘 OAuth 授权过期 | 批量任务中断 | 任务前检查 token，有效期不足时提示重新授权 |
| 批量文件过多 | 队列拥堵和成本过高 | 按会员等级限制数量、并发和每日额度 |
| 云盘回写失败 | 用户无法在云盘获取结果 | 平台保留结果下载，支持重新回写 |
| 后台配置误填 nodeId / fieldName | 工具上线后执行失败 | 上线前必须通过自研 API 测试工作流配置 |

### 12.2 待确认问题

- 前台英文 slug 是否需要独立配置，还是中英文共用同一 slug？
- MVP 是否先支持图片工具，视频工具放到第二阶段？
- 是否需要支持游客免费试用？
- 积分定价与 RunningHub 消耗之间的换算规则是什么？
- 推荐奖励是否要求被推荐人完成邮箱验证或首次任务后再发放？
- 输出文件是否需要转存到自有对象存储？
- 后台是否需要工作流版本管理和回滚？
- Google Drive / Dropbox 是否只对 Pro 会员开放，还是 Team/API 才允许回写云盘？
- 批量处理结果需要保留多久？
- 自研后台数据库优先使用 PostgreSQL 还是 SQLite 作为 MVP 存储？

---

## 十三、首批工具建议

| 工具 | 优先级 | RunningHub 配置方式 |
| --- | --- | --- |
| 图片背景移除 | P0 | 已知 workflowID `2075488908690935809`，图片节点 `9` |
| 图片增强/高清修复 | P0 | 后台填写 workflowID、图片节点、强度节点 |
| 消除笔 | P0 | 图片节点 + mask 节点 + prompt 节点 |
| AI 图片生成器 | P1 | prompt 节点 + 风格/尺寸节点 |
| AI 背景生成 | P1 | 图片节点 + prompt 节点 |
| 去水印 | P1 | 图片节点，可选 mask 节点 |
| AI 换装 | P1 | 人像图片节点 + 服装图片/风格节点 |
| AI 视频生成器 | P2 | prompt / image 节点 + 视频参数节点 |

---

## 十四、附录：参考来源

- neural.love tools：UI 视觉风格、深色工具目录、搜索与分类切换参考，https://neural.love/tools
- Picsman 官网首页与工具导航：功能结构、工具矩阵和内容模块参考，https://www.picsman.ai/
- Google Drive API OAuth / Picker 集成文档：https://developers.google.com/drive/api
- Dropbox OAuth / 文件 API 文档：https://www.dropbox.com/developers/documentation/http/documentation
- RunningHub API 代理端点：当前项目 `server.js`
- 当前演示工具：图片背景移除，workflowID `2075488908690935809`，加载图像 nodeId `9`
