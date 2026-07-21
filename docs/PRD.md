# RunningHub AI 工作流调用平台 - 产品需求文档

> 文档版本：v1.0.0
> 创建日期：2026-07-10
> 状态：待确认

---

## 一、项目概述

### 1.1 项目背景

随着 AI 技术的发展，RunningHub 等 AI 工作流平台提供了强大的图片处理能力（如扩图、修图、风格迁移等）。然而，直接使用 RunningHub 平台存在以下问题：

- 操作流程复杂，需要手动配置参数
- 界面不够友好，对非专业用户不友好
- 无法批量处理和历史记录管理
- 缺乏调用统计和费用管控

### 1.2 项目目标

**核心目标**：搭建一个简单易用的 Web 平台，让用户通过简单的操作调用 RunningHub 工作流，完成图片处理任务。

**商业目标**：
- 降低用户使用门槛，扩大用户群体
- 实现调用计费，创造营收
- 提供批量处理和历史管理，提升效率

### 1.3 目标用户

| 用户类型 | 使用场景 | 核心需求 |
|----------|----------|----------|
| 电商运营 | 产品图扩图、去水印 | 批量处理、快速高效 |
| 设计师 | 图片修图、风格迁移 | 高质量输出、操作便捷 |
| 摄影师 | 图片优化、批量处理 | 自动化流程、历史追溯 |
| 普通用户 | 日常图片处理 | 简单易用、价格实惠 |

### 1.4 核心价值主张

> **"三步完成 AI 图片处理"**
> 选择工作流 → 上传图片 → 获取结果

---

## 二、功能需求

### 2.1 功能模块总览

```
┌─────────────────────────────────────────────────────────────────┐
│                     RunningHub AI 工作流平台                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  工作流市场  │  │  执行中心   │  │  用户中心   │             │
│  │  Marketplace │  │ Execution   │  │   User      │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                    │
│  • 工作流浏览     • 图片上传        • 账户管理                   │
│  • 分类筛选       • 参数配置        • 用量统计                   │
│  • 搜索查找       • 执行提交        • 充值套餐                   │
│  • 详情预览       • 状态跟踪        • 订单记录                   │
│  • 示例展示       • 结果展示        • API Key                   │
│                  • 结果下载                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐       │
│  │                    管理后台 Admin                     │       │
│  │  • 工作流管理  • 用户管理  • 订单管理  • 运营统计     │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 模块一：工作流市场（Marketplace）

#### 2.2.1 功能描述

展示所有可用的 RunningHub 工作流，用户可以浏览、搜索、筛选和了解详情。

#### 2.2.2 功能清单

| 功能点 | 优先级 | 说明 |
|--------|--------|------|
| 工作流卡片列表 | P0 | 展示工作流名称、描述、封面图、标签 |
| 分类筛选 | P0 | 按类别筛选：扩图、修图、风格迁移、去水印等 |
| 搜索功能 | P0 | 支持按名称、关键词搜索 |
| 排序功能 | P1 | 按最新、最热、评分排序 |
| 工作流详情 | P0 | 弹窗展示详细参数说明、示例效果 |
| 热门推荐 | P1 | 首页展示热门工作流 |
| 新品标识 | P2 | 显示最新上线的工作流 |

#### 2.2.3 数据结构

```typescript
// 工作流
interface Workflow {
  id: string;                      // 唯一标识
  name: string;                    // 工作流名称
  description: string;             // 简短描述（限100字）
  coverImage: string;              // 封面图 URL
  category: WorkflowCategory;      // 分类
  tags: string[];                  // 标签列表
  parameters: WorkflowParameter[]; // 参数定义
  runningHubWorkflowId: string;    // RunningHub 工作流 ID
  runningHubWorkflowName: string;  // RunningHub 工作流名称
  creditCost: number;              // 每次调用消耗积分
  estimatedTime: string;           // 预估处理时间
  exampleInputs: string[];         // 示例输入图片
  exampleOutputs: string[];        // 示例输出图片
  isActive: boolean;               // 是否启用
  sortOrder: number;               // 排序顺序
  viewCount: number;               // 浏览次数
  useCount: number;                // 使用次数
  rating: number;                  // 评分
  createdAt: string;               // 创建时间
  updatedAt: string;               // 更新时间
}

// 工作流分类
type WorkflowCategory =
  | 'upscale'           // 扩图
  | 'inpaint'           // 修图
  | 'style-transfer'    // 风格迁移
  | 'remove-watermark'  // 去水印
  | 'enhance'           // 图片增强
  | 'other';            // 其他

// 工作流参数
interface WorkflowParameter {
  key: string;                        // 参数标识
  label: string;                      // 参数中文名
  type: ParameterType;                // 参数类型
  required: boolean;                  // 是否必填
  defaultValue?: any;                 // 默认值
  options?: ParameterOption[];        // 选项（select 类型）
  min?: number;                       // 最小值（slider 类型）
  max?: number;                       // 最大值（slider 类型）
  step?: number;                      // 步进值（slider 类型）
  description?: string;               // 参数说明
  placeholder?: string;               // 占位符（text 类型）
  accept?: string;                    // 接受的格式（image 类型）
  maxSize?: number;                   // 最大文件大小（image 类型）
}

// 参数类型
type ParameterType = 'image' | 'number' | 'select' | 'text' | 'slider' | 'textarea';

// 参数选项
interface ParameterOption {
  label: string;      // 选项显示名
  value: any;         // 选项值
  description?: string; // 选项说明
}
```

#### 2.2.4 页面原型说明

**首页/工作流列表页**

```
┌──────────────────────────────────────────────────────────────────┐
│  🔍 搜索框                                    [登录] [注册]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              RunningHub AI 工作流平台                      │   │
│  │         "三步完成 AI 图片处理"                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  分类筛选：[全部] [扩图] [修图] [风格迁移] [去水印] [其他]        │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  扩图   │  │  修图   │  │ 风格迁移 │  │ 去水印  │            │
│  │  2x/4x  │  │         │  │         │  │         │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                  │
│  工作流列表（卡片网格）：                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │    封面图     │  │    封面图     │  │    封面图     │       │
│  │               │  │               │  │               │       │
│  │ 扩图 2x       │  │ 扩图 4x       │  │ 智能去水印    │       │
│  │ 将图片放大2倍 │  │ 将图片放大4倍 │  │ 移除水印/杂物 │       │
│  │ ⭐ 4.8  1.2k使用│  │ ⭐ 4.6  890使用│  │ ⭐ 4.9  2.3k使用│       │
│  │ 💰 5积分/次   │  │ 💰 8积分/次   │  │ 💰 10积分/次  │       │
│  │  [立即使用]   │  │  [立即使用]   │  │  [立即使用]   │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**工作流详情弹窗**

```
┌─────────────────────────────────────────────────────────────────┐
│  [×]                                                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                      示例效果对比                             │  │
│  │   [原图]  ───────────────>  [处理后]                        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  扩图 2x                                                            │
│  将图片分辨率放大 2 倍，同时保持图片质量                           │
│                                                                     │
│  分类：扩图    预估时间：30秒    消耗：5 积分                      │
│                                                                     │
│  ─────────────────────────────────────────────────────────────   │
│                                                                     │
│  📋 参数说明                                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 输入图片 *                                                 │  │
│  │ [拖拽或点击上传图片] 支持 JPG/PNG/WebP，最大 10MB          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 扩图模式                                                    │  │
│  │ ○ 等比扩图    ○ 自由扩图                                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 输出质量                                                    │  │
│  │ ─────────●──────────── 85%                                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│                              [取消]  [🚀 立即使用]                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 模块二：执行中心（Execution Center）

#### 2.3.1 功能描述

用户选择工作流后，上传图片、配置参数、提交执行、查看结果。

#### 2.3.2 功能清单

| 功能点 | 优先级 | 说明 |
|--------|--------|------|
| 图片上传 | P0 | 拖拽/点击上传，支持多图 |
| 图片粘贴 | P1 | 支持 Ctrl+V 粘贴截图 |
| 参数配置 | P0 | 根据工作流动态生成表单 |
| 执行提交 | P0 | 验证参数后提交执行 |
| 状态跟踪 | P0 | 实时显示处理进度 |
| 结果展示 | P0 | 原图对比、结果展示 |
| 结果下载 | P0 | 单张/批量下载结果 |
| 结果分享 | P2 | 生成分享链接 |
| 执行取消 | P1 | 取消进行中的任务 |
| 执行重试 | P1 | 失败任务可重试 |

#### 2.3.3 执行流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   选择工作流  │ -> │  上传图片    │ -> │  配置参数    │ -> │   提交执行   │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                   │
                                                                   v
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  保存/分享    │ <- │  下载结果   │ <- │  查看结果   │ <- │  任务排队   │
└─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘
                                                                   │
                                                                   v
                                                            ┌─────────────┐
                                                            │  RunningHub │
                                                            │   执行处理   │
                                                            └─────────────┘
```

#### 2.3.4 状态定义

```typescript
// 执行状态
type ExecutionStatus =
  | 'pending'      // 等待中（已提交，等待分配）
  | 'queued'       // 排队中（已分配，排队等待执行）
  | 'processing'   // 处理中（正在执行）
  | 'completed'    // 已完成（处理成功）
  | 'failed'       // 失败（处理失败）
  | 'cancelled';   // 已取消（用户取消）

// 执行记录
interface Execution {
  id: string;                          // 本地执行 ID
  userId: string;                      // 用户 ID
  workflowId: string;                  // 工作流 ID
  runningHubTaskId?: string;           // RunningHub 任务 ID
  status: ExecutionStatus;             // 执行状态
  progress: number;                    // 处理进度 0-100
  inputParameters: Record<string, any>; // 输入参数
  inputImages: ExecutionImage[];       // 输入图片
  outputImages: ExecutionImage[];      // 输出图片
  creditCost: number;                  // 消耗积分
  errorMessage?: string;               // 错误信息
  startedAt?: string;                  // 开始时间
  completedAt?: string;                // 完成时间
  createdAt: string;                   // 创建时间
}

// 执行图片
interface ExecutionImage {
  id: string;           // 图片 ID
  url: string;          // 图片 URL
  filename: string;     // 文件名
  size: number;         // 文件大小
  width?: number;       // 图片宽度
  height?: number;      // 图片高度
  format?: string;      // 图片格式
}
```

#### 2.3.5 页面原型说明

**执行页面**

```
┌─────────────────────────────────────────────────────────────────┐
│  < 返回列表                    扩图 2x                    [用户] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────┐  ┌─────────────────────────┐   │
│  │                             │  │  📋 参数配置             │   │
│  │                             │  │                          │   │
│  │     [拖拽图片到此处]        │  │  输入图片 *               │   │
│  │     或点击选择文件          │  │  [已上传 1 张图片]        │   │
│  │                             │  │                          │   │
│  │     支持 JPG/PNG/WebP       │  │  ┌────────────────────┐  │   │
│  │     最大 10MB               │  │  │  preview.jpg  [×]  │  │   │
│  │                             │  │  └────────────────────┘  │   │
│  │     [选择文件]              │  │                          │   │
│  │                             │  │  扩图模式                 │   │
│  │                             │  │  ○ 等比扩图               │   │
│  │                             │  │  ● 自由扩图 (推荐)        │   │
│  │                             │  │                          │   │
│  │                             │  │  输出质量     [===●===]  │   │
│  │                             │  │                  85%     │   │
│  │                             │  │                          │   │
│  │                             │  │  ──────────────────────  │   │
│  │                             │  │  💰 消耗 5 积分          │   │
│  │                             │  │  您的余额：100 积分       │   │
│  │                             │  │                          │   │
│  │                             │  │  [        开始执行      ]│   │
│  │                             │  │                          │   │
│  └─────────────────────────────┘  └─────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**执行结果页面**

```
┌─────────────────────────────────────────────────────────────────┐
│  < 返回                    执行结果                    [用户]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ 执行成功！                                                    │
│  处理时间：28秒    消耗积分：5                                    │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                     原图与结果对比                          │   │
│  │                                                             │   │
│  │   ┌─────────────┐                    ┌─────────────┐       │   │
│  │   │             │                    │             │       │   │
│  │   │    原图     │      ──────>       │   结果图    │       │   │
│  │   │  800×600    │                    │  1600×1200  │       │   │
│  │   │             │                    │   (2x)      │       │   │
│  │   └─────────────┘                    └─────────────┘       │   │
│  │                                                             │   │
│  │   滑动对比：[◄────────────────────────────►]                │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  其他结果图片：                                                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                          │
│  │ 结果1   │  │ 结果2   │  │ 结果3   │                          │
│  └─────────┘  └─────────┘  └─────────┘                          │
│                                                                   │
│  操作按钮：                                                        │
│  [下载当前结果]  [下载全部 (ZIP)]  [分享链接]  [再次执行]          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 模块三：用户中心（User Center）

#### 2.4.1 功能描述

管理用户账户信息、用量统计、充值套餐、订单记录。

#### 2.4.2 功能清单

| 功能点 | 优先级 | 说明 |
|--------|--------|------|
| 账户概览 | P0 | 余额、积分、使用量概览 |
| 用量明细 | P0 | 调用记录列表与统计 |
| 积分充值 | P0 | 购买积分或订阅套餐 |
| 订单管理 | P1 | 查看充值订单 |
| 账户设置 | P1 | 修改密码、头像等信息 |
| API Key | P2 | API 调用密钥管理 |

#### 2.4.3 数据结构

```typescript
// 用户信息
interface User {
  id: string;                    // 用户 ID
  email: string;                 // 邮箱
  nickname: string;              // 昵称
  avatar?: string;               // 头像 URL
  phone?: string;                // 手机号
  balance: number;               // 账户余额（积分）
  usedQuota: number;             // 已使用额度
  totalQuota: number;            // 总额度
  memberSince: string;           // 注册时间
  lastLoginAt: string;           // 最后登录时间
  status: UserStatus;            // 账户状态
}

// 用户状态
type UserStatus = 'active' | 'disabled' | 'locked';

// 套餐
interface Package {
  id: string;                    // 套餐 ID
  name: string;                  // 套餐名称
  description: string;           // 套餐描述
  creditAmount: number;          // 积分数量
  originalPrice: number;         // 原价
  price: number;                 // 现价
  validityDays: number;          // 有效期（天）
  features: string[];            // 套餐特性
  isPopular: boolean;            // 是否热门
  sortOrder: number;             // 排序
}

// 订单
interface Order {
  id: string;                    // 订单 ID
  userId: string;                // 用户 ID
  packageId: string;             // 套餐 ID
  packageName: string;           // 套餐名称
  creditAmount: number;          // 积分数量
  amount: number;                // 支付金额
  status: OrderStatus;           // 订单状态
  paidAt?: string;               // 支付时间
  createdAt: string;             // 创建时间
}

// 订单状态
type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

// 用量记录
interface UsageRecord {
  id: string;                    // 记录 ID
  userId: string;                // 用户 ID
  workflowId: string;            // 工作流 ID
  workflowName: string;          // 工作流名称
  creditCost: number;            // 消耗积分
  inputImageCount: number;       // 输入图片数量
  outputImageCount: number;      // 输出图片数量
  createdAt: string;             // 执行时间
}
```

#### 2.4.4 页面原型说明

**账户概览页**

```
┌─────────────────────────────────────────────────────────────────┐
│  用户中心                                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  欢迎回来，张三！                                                   │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐      │
│  │   💰 账户余额   │  │   📊 本月使用   │  │   📈 累计使用   │      │
│  │                │  │                │  │                │      │
│  │    1,280       │  │      720       │  │     5,430      │      │
│  │      积分      │  │      积分      │  │      积分      │      │
│  │                │  │   本月调用 48次 │  │   累计调用 326次│      │
│  └────────────────┘  └────────────────┘  └────────────────┘      │
│                                                                   │
│  积分充值                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   💎 基础版   │  │  ⭐ 进阶版   │  │   🔥 高级版   │            │
│  │              │  │   (推荐)     │  │              │            │
│  │   100 积分   │  │   500 积分   │  │  1000 积分   │            │
│  │              │  │              │  │              │            │
│  │   ¥ 10.00   │  │   ¥ 45.00   │  │   ¥ 80.00   │            │
│  │              │  │  省 ¥ 5.00  │  │  省 ¥ 20.00 │            │
│  │  有效期 30天  │  │  有效期 90天 │  │  有效期 180天 │            │
│  │              │  │              │  │              │            │
│  │  [立即购买]   │  │  [立即购买]   │  │  [立即购买]   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 模块四：管理后台（Admin Panel）

#### 2.5.1 功能描述

管理员管理系统工作流、用户、订单和运营数据。

#### 2.5.2 功能清单

| 功能点 | 优先级 | 说明 |
|--------|--------|------|
| 工作流管理 | P0 | CRUD 工作流、配置参数 |
| 用户管理 | P0 | 查看用户、封禁/解封 |
| 订单管理 | P0 | 查看订单、处理退款 |
| 运营统计 | P1 | 调用量、收入统计 |
| 系统设置 | P2 | 网站配置、公告管理 |

#### 2.5.3 页面原型说明

**工作流管理页**

```
┌─────────────────────────────────────────────────────────────────┐
│  管理后台                              [张三] [退出]              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  侧边栏：                                                          │
│  📊 仪表盘                                                         │
│  📋 工作流管理  ← 当前                                             │
│  👥 用户管理                                                        │
│  💳 订单管理                                                        │
│  📈 运营统计                                                        │
│                                                                   │
│  ─────────────────────────────────────────────────────────────   │
│                                                                   │
│  工作流管理                                           [+ 添加工作流]│
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 搜索：[输入工作流名称...]    分类：[全部 ▼]    状态：[全部 ▼]│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ ☐ │ 工作流名称    │ 分类  │ 积分  │ 状态  │ 使用次数 │ 操作│   │
│  ├───┼───────────────┼───────┼───────┼───────┼─────────┼─────┤   │
│  │ ☐ │ 扩图 2x       │ 扩图  │  5    │ 启用  │  1,234  │ 编辑│   │
│  │ ☐ │ 扩图 4x       │ 扩图  │  8    │ 启用  │   890   │ 编辑│   │
│  │ ☐ │ 智能去水印    │ 去水印│  10   │ 启用  │  2,345  │ 编辑│   │
│  │ ☐ │ 风格迁移      │ 风格  │  15   │ 停用  │   123   │ 编辑│   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  分页：  [<]  1 2 3 ... 10  [>]    每页 20 条  共 186 条          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 三、技术架构

### 3.1 技术栈选型

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.4+ | 前端框架 |
| TypeScript | 5.0+ | 类型安全 |
| Vite | 5.0+ | 构建工具 |
| Vue Router | 4.0+ | 路由管理 |
| Pinia | 2.0+ | 状态管理 |
| Element Plus | 2.4+ | UI 组件库 |
| Tailwind CSS | 3.4+ | 样式框架 |
| Axios | 1.6+ | HTTP 客户端 |
| VueUse | 10.0+ | 工具函数库 |

#### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20.0+ | 运行时 |
| Express / NestJS | 10.0+ | Web 框架 |
| TypeScript | 5.0+ | 类型安全 |
| Prisma | 5.0+ | ORM |
| PostgreSQL | 15.0+ | 主数据库 |
| Redis | 7.0+ | 缓存/队列 |
| Bull | 4.0+ | 任务队列 |
| JWT | - | 身份认证 |
| 阿里云 OSS | - | 文件存储 |

#### 部署技术栈

| 技术 | 用途 |
|------|------|
| Docker | 容器化 |
| Nginx | 反向代理 |
| PM2 | 进程管理 |
| GitHub Actions | CI/CD |

### 3.2 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              用户端 (Browser)                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     Vue 3 + TypeScript + Vite                    │   │
│   │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │   │
│   │  │ 工作流  │  │ 执行中心 │  │ 用户中心 │  │    管理后台     │  │   │
│   │  │ 市场    │  │          │  │          │  │                 │  │   │
│   │  └────┬────┘  └────┬─────┘  └────┬─────┘  └────────┬────────┘  │   │
│   └───────┼────────────┼────────────┼─────────────────┼────────────┘   │
└───────────┼────────────┼────────────┼─────────────────┼─────────────────┘
            │            │            │                 │
            └────────────┴─────┬──────┴─────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │      API 网关        │
                    │   (Nginx + HTTPS)   │
                    │  - 负载均衡          │
                    │  - SSL 终止          │
                    │  - 请求限流          │
                    └──────────┬──────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                              │              后端服务 (Node.js)           │
│                    ┌─────────▼─────────┐                                │
│                    │   Express/NestJS   │                                │
│                    │   API Server       │                                │
│                    │                    │                                │
│                    │  ┌──────────────┐  │                                │
│                    │  │ Auth Module  │  │  ┌──────────────┐             │
│                    │  │ (JWT)        │  │  │ Upload Module│             │
│                    │  └──────────────┘  │  │ (OSS)        │             │
│                    │  ┌──────────────┐  │  └──────────────┘             │
│                    │  │ User Module  │  │  ┌──────────────┐             │
│                    │  │ (CRUD)       │  │  │ Workflow     │             │
│                    │  └──────────────┘  │  │ Module       │             │
│                    │  ┌──────────────┐  │  └──────────────┘             │
│                    │  │ Order Module │  │  ┌──────────────┐             │
│                    │  │ (Payment)    │  │  │ Execution    │             │
│                    │  └──────────────┘  │  │ Module       │             │
│                    │                    │  └──────────────┘             │
│                    └─────────┬──────────┘                                │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                      │
│         │                    │                    │                      │
│  ┌──────▼──────┐     ┌───────▼──────┐    ┌───────▼──────┐              │
│  │ PostgreSQL  │     │    Redis      │    │  阿里云 OSS   │              │
│  │  主数据库    │     │  缓存/队列    │    │  文件存储     │              │
│  └─────────────┘     └──────────────┘    └──────────────┘              │
│                                                                           │
│                              ┌──────────┐                                │
│                              │ Bull     │                                │
│                              │ 任务队列  │                                │
│                              └────┬─────┘                                │
│                                   │                                      │
│                    ┌──────────────┼──────────────┐                      │
│                    │              │              │                      │
│             ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐               │
│             │  Worker 1   │ │ Worker 2  │ │ Worker 3  │               │
│             │ (执行工作流) │ │ (执行工作流)│ │ (执行工作流)│               │
│             └──────┬──────┘ └─────┬─────┘ └─────┬─────┘               │
│                    │              │              │                      │
└────────────────────┼──────────────┼──────────────┼──────────────────────┘
                     │              │              │
                     └──────────────┴──────────────┘
                                   │
                                   v
                    ┌──────────────────────────────┐
                    │     RunningHub API           │
                    │   https://runninghub.cn      │
                    └──────────────────────────────┘
```

### 3.3 目录结构

```
runninghub-platform/
│
├── frontend/                          # 前端项目
│   ├── src/
│   │   ├── api/                       # API 封装
│   │   │   ├── request.ts             # axios 封装
│   │   │   ├── auth.ts                # 认证 API
│   │   │   ├── workflow.ts            # 工作流 API
│   │   │   ├── execution.ts           # 执行 API
│   │   │   ├── user.ts                # 用户 API
│   │   │   └── order.ts               # 订单 API
│   │   │
│   │   ├── components/                # 组件
│   │   │   ├── common/                # 通用组件
│   │   │   │   ├── AppHeader.vue      # 头部导航
│   │   │   │   ├── AppFooter.vue      # 底部
│   │   │   │   ├── ImageUploader.vue  # 图片上传
│   │   │   │   ├── ImageCompare.vue   # 图片对比
│   │   │   │   └── LoadingOverlay.vue # 加载遮罩
│   │   │   │
│   │   │   ├── workflow/              # 工作流组件
│   │   │   │   ├── WorkflowCard.vue   # 工作流卡片
│   │   │   │   ├── WorkflowFilter.vue # 筛选组件
│   │   │   │   └── WorkflowForm.vue   # 参数表单
│   │   │   │
│   │   │   ├── execution/             # 执行组件
│   │   │   │   ├── ExecutionStatus.vue# 状态展示
│   │   │   │   └── ExecutionResult.vue# 结果展示
│   │   │   │
│   │   │   └── admin/                 # 管理后台组件
│   │   │       ├── DataTable.vue      # 数据表格
│   │   │       └── StatCard.vue       # 统计卡片
│   │   │
│   │   ├── composables/               # 组合式函数
│   │   │   ├── useAuth.ts             # 认证逻辑
│   │   │   ├── useWorkflow.ts         # 工作流逻辑
│   │   │   ├── useExecution.ts        # 执行逻辑
│   │   │   ├── useUpload.ts           # 上传逻辑
│   │   │   └── usePagination.ts       # 分页逻辑
│   │   │
│   │   ├── stores/                    # Pinia Store
│   │   │   ├── auth.ts                # 认证状态
│   │   │   ├── workflow.ts            # 工作流状态
│   │   │   ├── execution.ts           # 执行状态
│   │   │   └── app.ts                 # 全局状态
│   │   │
│   │   ├── views/                     # 页面视图
│   │   │   ├── HomeView.vue           # 首页（工作流市场）
│   │   │   ├── workflow/
│   │   │   │   ├── WorkflowDetail.vue # 工作流详情
│   │   │   │   └── WorkflowExecute.vue# 执行页面
│   │   │   │
│   │   │   ├── user/
│   │   │   │   ├── LoginView.vue      # 登录页
│   │   │   │   ├── RegisterView.vue   # 注册页
│   │   │   │   ├── UserCenter.vue     # 用户中心
│   │   │   │   └── UsageHistory.vue   # 用量历史
│   │   │   │
│   │   │   └── admin/                 # 管理后台页面
│   │   │       ├── Dashboard.vue      # 仪表盘
│   │   │       ├── WorkflowManage.vue # 工作流管理
│   │   │       ├── UserManage.vue     # 用户管理
│   │   │       └── OrderManage.vue    # 订单管理
│   │   │
│   │   ├── router/                    # 路由配置
│   │   │   └── index.ts
│   │   │
│   │   ├── types/                     # TypeScript 类型
│   │   │   ├── api.ts                 # API 类型
│   │   │   ├── workflow.ts            # 工作流类型
│   │   │   ├── execution.ts           # 执行类型
│   │   │   ├── user.ts                # 用户类型
│   │   │   └── order.ts               # 订单类型
│   │   │
│   │   ├── utils/                     # 工具函数
│   │   │   ├── format.ts              # 格式化工具
│   │   │   ├── validate.ts            # 验证工具
│   │   │   └── storage.ts             # 存储工具
│   │   │
│   │   ├── styles/                    # 全局样式
│   │   │   ├── variables.css          # CSS 变量
│   │   │   └── global.css             # 全局样式
│   │   │
│   │   ├── App.vue                    # 根组件
│   │   └── main.ts                    # 入口文件
│   │
│   ├── public/                        # 静态资源
│   ├── .env                           # 环境变量
│   ├── .env.example                   # 环境变量示例
│   ├── index.html                     # HTML 入口
│   ├── package.json                   # 依赖配置
│   ├── tsconfig.json                  # TypeScript 配置
│   ├── vite.config.ts                 # Vite 配置
│   └── tailwind.config.js             # Tailwind 配置
│
├── backend/                           # 后端项目
│   ├── src/
│   │   ├── controllers/               # 控制器
│   │   │   ├── authController.ts
│   │   │   ├── workflowController.ts
│   │   │   ├── executionController.ts
│   │   │   ├── userController.ts
│   │   │   └── orderController.ts
│   │   │
│   │   ├── services/                  # 业务逻辑
│   │   │   ├── authService.ts
│   │   │   ├── workflowService.ts
│   │   │   ├── executionService.ts
│   │   │   ├── userService.ts
│   │   │   ├── orderService.ts
│   │   │   └── runningHubService.ts   # RunningHub API
│   │   │
│   │   ├── repositories/              # 数据访问
│   │   │   ├── userRepository.ts
│   │   │   ├── workflowRepository.ts
│   │   │   ├── executionRepository.ts
│   │   │   └── orderRepository.ts
│   │   │
│   │   ├── models/                    # 数据模型
│   │   │   ├── User.ts
│   │   │   ├── Workflow.ts
│   │   │   ├── Execution.ts
│   │   │   └── Order.ts
│   │   │
│   │   ├── routes/                    # 路由
│   │   │   ├── auth.ts
│   │   │   ├── workflow.ts
│   │   │   ├── execution.ts
│   │   │   ├── user.ts
│   │   │   └── order.ts
│   │   │
│   │   ├── middlewares/               # 中间件
│   │   │   ├── auth.ts                # 认证中间件
│   │   │   ├── validator.ts           # 验证中间件
│   │   │   ├── rateLimit.ts           # 限流中间件
│   │   │   └── errorHandler.ts        # 错误处理
│   │   │
│   │   ├── jobs/                      # 后台任务
│   │   │   ├── executionWorker.ts     # 执行 Worker
│   │   │   └── statusChecker.ts       # 状态检查
│   │   │
│   │   ├── utils/                     # 工具函数
│   │   │   ├── response.ts            # 响应封装
│   │   │   ├── logger.ts              # 日志工具
│   │   │   ├── crypto.ts              # 加密工具
│   │   │   └── oss.ts                 # OSS 工具
│   │   │
│   │   ├── config/                    # 配置文件
│   │   │   ├── database.ts            # 数据库配置
│   │   │   ├── redis.ts               # Redis 配置
│   │   │   └── runninghub.ts          # RunningHub 配置
│   │   │
│   │   ├── types/                     # TypeScript 类型
│   │   └── app.ts                     # 应用入口
│   │
│   ├── prisma/                        # Prisma 配置
│   │   └── schema.prisma              # 数据模型
│   │
│   ├── .env                           # 环境变量
│   ├── .env.example                   # 环境变量示例
│   ├── package.json                   # 依赖配置
│   ├── tsconfig.json                  # TypeScript 配置
│   └── .gitignore
│
├── docs/                              # 文档
│   ├── api.md                         # API 文档
│   ├── database.md                    # 数据库设计
│   └── deployment.md                  # 部署文档
│
├── docker/                            # Docker 配置
│   ├── frontend.Dockerfile
│   ├── backend.Dockerfile
│   └── docker-compose.yml
│
├── .gitignore
├── README.md                          # 项目说明
└── package.json                       # 根目录 package.json
```

## 四、API 设计

### 4.1 API 规范

#### 基础规范

- 基础路径：`/api/v1`
- 认证方式：Bearer Token (JWT)
- 请求格式：JSON
- 响应格式：统一包装

#### 响应格式

```typescript
// 成功响应
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}

// 失败响应
{
  "success": false,
  "message": "操作失败",
  "error": {
    "code": "ERROR_CODE",
    "details": "详细错误信息"
  }
}
```

#### 错误代码

| 代码 | 说明 |
|------|------|
| `AUTH_TOKEN_EXPIRED` | Token 过期 |
| `AUTH_TOKEN_INVALID` | Token 无效 |
| `AUTH_PERMISSION_DENIED` | 权限不足 |
| `USER_NOT_FOUND` | 用户不存在 |
| `USER_DISABLED` | 账户已禁用 |
| `WORKFLOW_NOT_FOUND` | 工作流不存在 |
| `WORKFLOW_DISABLED` | 工作流已禁用 |
| `EXECUTION_NOT_FOUND` | 执行记录不存在 |
| `EXECUTION_FAILED` | 执行失败 |
| `INSUFFICIENT_BALANCE` | 余额不足 |
| `VALIDATION_ERROR` | 参数验证失败 |
| `RATE_LIMIT_EXCEEDED` | 请求过于频繁 |
| `INTERNAL_ERROR` | 服务器内部错误 |

### 4.2 认证相关 API

#### 用户注册
```
POST /api/v1/auth/register
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "张三"
}

Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "nickname": "..." },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 用户登录
```
POST /api/v1/auth/login
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "nickname": "..." },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 4.3 工作流相关 API

#### 获取工作流列表
```
GET /api/v1/workflows
Authorization: Bearer {token}
Query: category, search, page, pageSize, sort

Response:
{
  "success": true,
  "data": {
    "list": [ /* Workflow[] */ ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### 获取工作流详情
```
GET /api/v1/workflows/:id
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": { /* Workflow */ }
}
```

### 4.4 执行相关 API

#### 创建执行任务
```
POST /api/v1/executions
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
{
  "workflowId": "workflow_id",
  "parameters": "{}",
  "images": [ /* image files */ ]
}

Response:
{
  "success": true,
  "data": {
    "id": "execution_id",
    "runningHubTaskId": "rh_task_id",
    "status": "queued",
    "creditCost": 5
  }
}
```

#### 获取执行状态
```
GET /api/v1/executions/:id
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "execution_id",
    "status": "processing",
    "progress": 45,
    "inputImages": [...],
    "outputImages": [...],
    "errorMessage": null
  }
}
```

#### 获取执行历史
```
GET /api/v1/executions
Authorization: Bearer {token}
Query: page, pageSize, status, workflowId

Response:
{
  "success": true,
  "data": {
    "list": [ /* Execution[] */ ],
    "pagination": { ... }
  }
}
```

### 4.5 用户相关 API

#### 获取用户信息
```
GET /api/v1/user/profile
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": { /* User */ }
}
```

#### 获取用量统计
```
GET /api/v1/user/usage
Authorization: Bearer {token}
Query: startDate, endDate

Response:
{
  "success": true,
  "data": {
    "totalUsed": 5430,
    "monthlyUsed": 720,
    "dailyUsage": [
      { "date": "2026-07-01", "count": 25, "credits": 125 }
    ]
  }
}
```

### 4.6 订单相关 API

#### 获取套餐列表
```
GET /api/v1/packages
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [ /* Package[] */ ]
}
```

#### 创建订单
```
POST /api/v1/orders
Authorization: Bearer {token}
Content-Type: application/json

Request:
{
  "packageId": "package_id"
}

Response:
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "amount": 45.00,
    "paymentUrl": "https://..." // 支付链接
  }
}
```

## 五、数据库设计

### 5.1 ER 图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │   Package   │       │   Workflow  │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ email       │       │ name        │       │ name        │
│ password    │       │ description │       │ description │
│ nickname    │       │ creditAmount│       │ coverImage  │
│ avatar      │       │ price       │       │ category    │
│ balance     │       │ validityDays│       │ creditCost  │
│ status      │       │ isActive    │       │ isActive    │
│ createdAt   │       │ createdAt   │       │ createdAt   │
└──────┬──────┘       └──────┬──────┘       └─────────────┘
       │                     │
       │ 1:N                 │ 1:N
       │                     │
┌──────▼──────┐       ┌──────▼──────┐
│    Order    │       │  Execution  │
├─────────────┤       ├─────────────┤
│ id          │       │ id          │
│ userId      │       │ userId      │
│ packageId   │       │ workflowId  │
│ creditAmount│       │ status      │
│ amount      │       │ progress    │
│ status      │       │ creditCost  │
│ paidAt      │       │ errorMessage│
│ createdAt   │       │ createdAt   │
└─────────────┘       └──────┬──────┘
                             │
                             │ 1:N
                             │
                      ┌──────▼──────┐
                      │ Execution   │
                      │   Image     │
                      ├─────────────┤
                      │ id          │
                      │ executionId │
                      │ type        │
                      │ url         │
                      │ filename    │
                      │ size        │
                      │ width       │
                      │ height      │
                      │ createdAt   │
                      └─────────────┘
```

### 5.2 数据表定义

#### users 表
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  avatar VARCHAR(500),
  phone VARCHAR(20),
  balance INTEGER DEFAULT 0,
  totalRecharged INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  lastLoginAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

#### workflows 表
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  cover_image VARCHAR(500),
  category VARCHAR(50) NOT NULL,
  tags TEXT[],
  parameters JSONB,
  runninghub_workflow_id VARCHAR(100) NOT NULL,
  runninghub_workflow_name VARCHAR(200),
  credit_cost INTEGER DEFAULT 1,
  estimated_time VARCHAR(50),
  example_inputs TEXT[],
  example_outputs TEXT[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  use_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workflows_category ON workflows(category);
CREATE INDEX idx_workflows_active ON workflows(is_active);
CREATE INDEX idx_workflows_sort ON workflows(sort_order);
```

#### executions 表
```sql
CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  workflow_id UUID REFERENCES workflows(id),
  runninghub_task_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  input_parameters JSONB,
  credit_cost INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_executions_user ON executions(user_id);
CREATE INDEX idx_executions_workflow ON executions(workflow_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_created ON executions(createdAt);
```

#### execution_images 表
```sql
CREATE TABLE execution_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'input' or 'output'
  url VARCHAR(500) NOT NULL,
  filename VARCHAR(255),
  size INTEGER,
  width INTEGER,
  height INTEGER,
  format VARCHAR(20),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_execution_images_execution ON execution_images(execution_id);
```

#### packages 表
```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  credit_amount INTEGER NOT NULL,
  original_price DECIMAL(10,2),
  price DECIMAL(10,2) NOT NULL,
  validity_days INTEGER DEFAULT 365,
  features TEXT[],
  is_popular BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### orders 表
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  package_id UUID REFERENCES packages(id),
  package_name VARCHAR(100),
  credit_amount INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_no ON orders(order_no);
```

## 六、非功能需求

### 6.1 性能需求

| 指标 | 要求 |
|------|------|
| 页面首屏加载 | < 3 秒 |
| API 响应时间 | < 500ms |
| 并发用户数 | ≥ 100 |
| 图片上传限制 | 最大 10MB |
| 图片处理超时 | 5 分钟 |
| 状态轮询间隔 | 3 秒 |

### 6.2 安全需求

| 安全项 | 要求 |
|--------|------|
| 密码存储 | bcrypt 加密 |
| 认证方式 | JWT Token |
| Token 过期 | 7 天 |
| HTTPS | 必须启用 |
| SQL 注入 | 参数化查询 |
| XSS | 输入输出转义 |
| CSRF | Token 验证 |
| 限流 | 100 次/分钟 |

### 6.3 可用性需求

| 指标 | 要求 |
|------|------|
| 系统可用性 | ≥ 99.9% |
| 数据备份 | 每日全量 |
| 错误重试 | 最多 3 次 |
| 日志保存 | 30 天 |

### 6.4 兼容性需求

| 项目 | 要求 |
|------|------|
| Chrome | 最近 2 个版本 |
| Safari | 最近 2 个版本 |
| Firefox | 最近 2 个版本 |
| Edge | 最近 2 个版本 |
| 移动端 | iOS 12+, Android 8+ |
| 图片格式 | JPG, PNG, WebP |

## 七、开发计划

### 7.1 第一阶段：MVP（2-3 周）

**目标**：完成核心功能，可上线测试

| 模块 | 功能 | 工期 |
|------|------|------|
| 项目搭建 | 前端项目初始化、技术选型 | 1 天 |
| 用户系统 | 注册、登录、Token 认证 | 2 天 |
| 工作流展示 | 列表、筛选、详情 | 2 天 |
| 执行功能 | 图片上传、参数配置、提交执行 | 3 天 |
| 结果展示 | 状态跟踪、结果展示、下载 | 2 天 |
| RunningHub 对接 | API 对接、任务轮询 | 3 天 |
| 用户中心 | 账户概览、用量统计 | 2 天 |
| 套餐系统 | 套餐展示、充值流程 | 2 天 |
| 部署上线 | 服务器部署、域名配置 | 2 天 |

**MVP 交付物**：
- 工作流浏览与选择
- 图片上传与参数配置
- 执行调用与结果展示
- 用户注册登录
- 积分充值

### 7.2 第二阶段：完善（2-3 周）

**目标**：完善功能，提升体验

| 模块 | 功能 | 工期 |
|------|------|------|
| 管理后台 | 工作流管理、用户管理、订单管理 | 5 天 |
| 执行历史 | 历史记录、筛选、详情 | 2 天 |
| 运营统计 | 看板、数据报表 | 3 天 |
| 性能优化 | 缓存、CDN、懒加载 | 2 天 |
| 错误处理 | 全局错误处理、用户提示 | 2 天 |
| 移动端适配 | 响应式布局、触摸优化 | 3 天 |

### 7.3 第三阶段：高级功能（2-3 周）

**目标**：丰富功能，增加竞争力

| 模块 | 功能 | 工期 |
|------|------|------|
| 批量处理 | 多图批量执行 | 3 天 |
| 处理预设 | 参数组合保存 | 2 天 |
| Webhook | 主动推送结果 | 2 天 |
| API Key | 开放平台 API | 3 天 |
| 高级统计 | 用户画像、漏斗分析 | 3 天 |
| 通知系统 | 邮件/短信通知 | 2 天 |

---

## 八、风险与对策

| 风险 | 影响 | 概率 | 对策 |
|------|------|------|------|
| RunningHub API 不稳定 | 高 | 中 | 实现重试机制、显示友好错误 |
| 并发量超预期 | 高 | 低 | 限流、队列优化、扩容 |
| 用户恶意刷单 | 中 | 中 | 验证码、行为检测、人工审核 |
| 图片安全审核 | 中 | 低 | 接入第三方审核服务 |
| 服务器成本超支 | 中 | 低 | 优化资源使用、按需扩容 |

---

## 九、附录

### 9.1 环境变量说明

**前端 (.env)**
```
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_TITLE=RunningHub AI 工作流平台
```

**后端 (.env)**
```
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/runninghub

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# RunningHub
RUNNINGHUB_API_KEY=your-api-key
RUNNINGHUB_API_URL=https://www.runninghub.cn/openapi/v2

# 阿里云 OSS
OSS_ACCESS_KEY_ID=your-access-key
OSS_ACCESS_KEY_SECRET=your-secret
OSS_BUCKET=your-bucket
OSS_REGION=oss-cn-hangzhou

# 支付（可选）
PAYMENT_APP_ID=your-app-id
PAYMENT_APP_SECRET=your-secret
```

### 9.2 第三方服务

| 服务 | 用途 | 费用 |
|------|------|------|
| RunningHub | AI 工作流 | 按调用计费 |
| 阿里云 OSS | 文件存储 | ¥0.12/GB/月 |
| 阿里云 RDS | 数据库 | ¥35/月起 |
| 阿里云 Redis | 缓存 | ¥20/月起 |
| 阿里云 ECS | 服务器 | ¥60/月起 |

### 9.3 联系方式

**项目负责人**：[待定]
**技术支持**：[待定]
**商务合作**：[待定]

---

**文档结束**

> 如有疑问或建议，请联系项目负责人。
> 本文档将根据项目进展持续更新。
