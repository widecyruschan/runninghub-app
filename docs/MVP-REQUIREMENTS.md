# RunningHub AI 工作流平台 - MVP 需求文档

> **版本**: v1.0  
> **日期**: 2026-07-10  
> **状态**: 待开发

---

## 一、MVP 目标

在第一阶段，我们的目标是构建一个**最小可行产品**，验证核心业务流程：

1. 用户可以浏览和选择 RunningHub 工作流
2. 用户可以上传图片并配置参数
3. 系统调用 RunningHub API 执行工作流
4. 用户可以查看执行结果并下载

---

## 二、必须功能 (MVP)

### 2.1 用户系统

| 功能 | 优先级 | 描述 |
|------|--------|------|
| 用户注册 | P0 | 邮箱 + 密码注册 |
| 用户登录 | P0 | 邮箱 + 密码登录 |
| 退出登录 | P0 | 清除登录状态 |

**注册/登录字段**：
- 邮箱（唯一标识）
- 密码（最少 6 位）
- 昵称（可选）

### 2.2 工作流市场

| 功能 | 优先级 | 描述 |
|------|--------|------|
| 工作流列表 | P0 | 展示所有可用工作流 |
| 分类筛选 | P0 | 按类型筛选（扩图/修图/去水印等） |
| 搜索功能 | P1 | 按名称搜索工作流 |
| 工作流详情 | P0 | 查看工作流说明和参数 |

**工作流分类**：
- `upscale` - 扩图
- `inpaint` - 修图
- `remove-watermark` - 去水印
- `style-transfer` - 风格迁移
- `other` - 其他

### 2.3 执行中心

| 功能 | 优先级 | 描述 |
|------|--------|------|
| 图片上传 | P0 | 拖拽/点击上传（最大 10MB） |
| 参数配置 | P0 | 根据工作流动态配置参数 |
| 执行提交 | P0 | 提交任务到 RunningHub |
| 状态跟踪 | P0 | 轮询任务状态（3秒间隔） |
| 结果展示 | P0 | 展示处理后的图片 |
| 结果下载 | P0 | 下载单张或多张结果图 |

### 2.4 用户中心

| 功能 | 优先级 | 描述 |
|------|--------|------|
| 账户概览 | P0 | 显示余额和基本信息 |
| 执行历史 | P0 | 查看历史执行记录 |
| 退出登录 | P0 | 退出当前账户 |

---

## 三、RunningHub API 对接

### 3.1 API 配置

```
API 地址: https://www.runninghub.cn/openapi/v2
认证方式: Bearer Token
API Key: ae079bdc75d6461ba2905fbebd47ef3a
```

### 3.2 工作流调用流程

```
1. 用户上传图片 → 前端
2. 前端将图片转为 Base64 或上传到临时存储
3. 调用 RunningHub 执行接口
4. 获取任务 ID，开始轮询状态
5. 任务完成后，获取结果图片
6. 展示给用户
```

### 3.3 核心 API 端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/openapi/v2/run/workflow/{workflowID}` | POST | 执行工作流 |
| `/openapi/v2/workflow/task/{taskId}` | GET | 查询任务状态 |
| `/openapi/v2/workflow/task/{taskId}/result` | GET | 获取任务结果 |

---

## 四、页面清单

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 工作流市场 |
| 登录 | `/login` | 用户登录 |
| 注册 | `/register` | 用户注册 |
| 工作流详情 | `/workflow/:id` | 工作流详情和执行 |
| 用户中心 | `/user` | 用户账户信息 |
| 执行历史 | `/user/history` | 历史执行记录 |

---

## 五、数据模型

### 5.1 用户 (User)

```typescript
interface User {
  id: string;
  email: string;
  password: string;        // bcrypt 加密
  nickname: string;
  balance: number;         // 积分余额
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.2 工作流 (Workflow)

```typescript
interface Workflow {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  category: string;
  tags: string[];
  parameters: Parameter[];
  runningHubWorkflowId: string;
  creditCost: number;      // 消耗积分
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.3 执行记录 (Execution)

```typescript
interface Execution {
  id: string;
  userId: string;
  workflowId: string;
  runningHubTaskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputParameters: Record<string, any>;
  inputImages: string[];   // 输入图片 URL
  outputImages: string[];  // 输出图片 URL
  creditCost: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

---

## 六、技术实现

### 6.1 前端技术

- Vue 3 + Composition API
- TypeScript
- Vite
- Vue Router
- Pinia
- Element Plus
- Tailwind CSS
- Axios

### 6.2 后端技术

- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL
- Redis (可选，用于缓存和队列)
- JWT (认证)

### 6.3 文件存储

MVP 阶段：
- 输入图片：转为 Base64 或存储到数据库
- 输出图片：存储到本地文件系统或数据库

后续版本：
- 阿里云 OSS
- AWS S3
- 七牛云

---

## 七、开发任务分解

### 第一周：项目搭建

| 任务 | 负责 | 状态 |
|------|------|------|
| 项目结构初始化 | - | ⬜ |
| 前端项目配置 | - | ⬜ |
| 后端项目配置 | - | ⬜ |
| 数据库设计 | - | ⬜ |
| API 封装 | - | ⬜ |

### 第二周：用户系统

| 任务 | 负责 | 状态 |
|------|------|------|
| 用户注册 API | - | ⬜ |
| 用户登录 API | - | ⬜ |
| JWT 认证中间件 | - | ⬜ |
| 注册/登录页面 | - | ⬜ |
| 路由守卫 | - | ⬜ |

### 第三周：工作流 + 执行

| 任务 | 负责 | 状态 |
|------|------|------|
| 工作流列表 API | - | ⬜ |
| 工作流详情 API | - | ⬜ |
| RunningHub 调用服务 | - | ⬜ |
| 工作流列表页面 | - | ⬜ |
| 执行页面 | - | ⬜ |
| 结果展示 | - | ⬜ |

### 第四周：用户中心 + 完善

| 任务 | 负责 | 状态 |
|------|------|------|
| 用户中心 API | - | ⬜ |
| 执行历史 API | - | ⬜ |
| 用户中心页面 | - | ⬜ |
| 执行历史页面 | - | ⬜ |
| 样式优化 | - | ⬜ |
| 测试与修复 | - | ⬜ |

---

## 八、验收标准

### 8.1 功能验收

- [ ] 用户可以注册和登录
- [ ] 用户可以浏览工作流列表
- [ ] 用户可以筛选工作流
- [ ] 用户可以上传图片
- [ ] 用户可以执行工作流
- [ ] 用户可以查看执行结果
- [ ] 用户可以下载结果图片
- [ ] 用户可以查看执行历史

### 8.2 质量标准

- 页面加载时间 < 3 秒
- API 响应时间 < 500ms
- 支持 Chrome/Safari/Firefox/Edge
- 移动端响应式适配
- 错误提示友好

---

## 九、后续版本规划

### v1.1 - 完善功能
- 积分充值系统
- 套餐管理
- 管理后台（工作流管理、用户管理）

### v1.2 - 性能优化
- 批量处理
- 任务队列
- 缓存优化

### v1.3 - 高级功能
- API Key 开放平台
- Webhook 回调
- 高级统计

---

**文档结束**
