# RunningHub AI 工作流调用平台

> 一个简单易用的 Web 平台，调用 RunningHub 工作流完成 AI 图片处理

## 📋 项目简介

本项目旨在为用户提供一个简洁、高效的界面来调用 RunningHub AI 工作流。用户只需选择工作流、上传图片、配置参数，即可获得 AI 处理结果。

## 🎯 核心功能

- **工作流市场**：浏览、搜索、筛选 RunningHub 工作流
- **一键执行**：简单上传图片，快速调用 AI 工作流
- **实时跟踪**：实时查看处理进度和结果
- **用户中心**：账户管理、用量统计、积分充值

## 🛠️ 技术栈

### 前端
- Vue 3 + TypeScript
- Vite
- Element Plus
- Tailwind CSS
- Pinia
- Vue Router

### 后端
- Node.js + Express/NestJS
- TypeScript
- Prisma
- PostgreSQL
- Redis

## 🚀 快速开始

### 前置要求
- Node.js 18+
- npm 或 yarn
- PostgreSQL 15+
- Redis 7+

### 安装

```bash
# 克隆项目
git clone https://github.com/widecyruschan/runninghub-platform.git
cd runninghub-platform

# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写必要的配置

# 初始化数据库
npx prisma generate
npx prisma db push
```

### 运行

```bash
# 运行前端开发服务器
cd frontend
npm run dev

# 运行后端开发服务器
cd backend
npm run dev
```

## 📁 项目结构

```
runninghub-platform/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── api/          # API 封装
│   │   ├── components/   # 组件
│   │   ├── composables/  # 组合式函数
│   │   ├── stores/       # 状态管理
│   │   ├── views/        # 页面视图
│   │   ├── router/       # 路由配置
│   │   ├── types/        # 类型定义
│   │   └── utils/        # 工具函数
│   └── index.html        # 入口文件
│
├── backend/              # 后端项目
│   └── src/
│       ├── controllers/  # 控制器
│       ├── services/     # 业务逻辑
│       ├── repositories/ # 数据访问
│       ├── models/       # 数据模型
│       ├── routes/       # 路由
│       └── middlewares/  # 中间件
│
├── docs/                 # 文档
│   └── PRD.md           # 产品需求文档
│
└── scripts/             # 脚本
```

## 📖 文档

- [产品需求文档 (PRD)](docs/PRD.md)

## 🔧 开发指南

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 Vue 3 Composition API 最佳实践
- 使用 ESLint + Prettier 统一代码风格

### Git 提交规范
```
feat: 新功能
fix: 修复问题
refactor: 重构
docs: 文档更新
style: 代码格式
test: 测试
chore: 构建/工具
```

## 📝 许可证

MIT License

## 👤 作者

**widecyruschan**

## 📧 联系方式

如有问题或建议，请通过 GitHub Issues 联系。
