# 小说创作与拆文工作台

面向网络小说作者与内容创作者的 **Web 端一体化创作平台**，覆盖「拆文 → 设定 → 大纲 → 正文 → 审稿 → 定稿」完整创作链路，并通过统一的 **Agent Runtime 抽象层** 接入本地与远程 AI 能力。

> 设计文档见 [`docs/小说创作与拆文工作台-设计方案.md`](docs/小说创作与拆文工作台-设计方案.md)

## 技术栈

| 层面 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Zustand + TanStack Query |
| 后端 | Node.js + Fastify + TypeScript |
| 持久化 | SQLite（better-sqlite3）+ 文件系统 |
| 流式通信 | SSE（Server-Sent Events） |
| 包管理 | pnpm（monorepo） |
| 测试 | Vitest |

## 目录结构

```
.
├── app/
│   ├── client/        # 前端（React + Vite）
│   └── server/        # 后端（Fastify + SQLite + SSE）
├── docs/              # 设计文档
├── data/              # 运行时数据目录（SQLite + 作品文件，本地生成）
└── package.json       # monorepo 根配置
```

## 快速开始

要求：Node.js ≥ 22.14，pnpm ≥ 9。

```bash
# 安装依赖
pnpm install

# 同时启动前后端（开发模式）
pnpm dev

# 或分开启动
pnpm dev:server   # 后端 http://127.0.0.1:3000
pnpm dev:client   # 前端 http://127.0.0.1:5173
```

## 里程碑

| 里程碑 | 内容 | 状态 |
|--------|------|------|
| M0 设计评审 | 设计方案定稿 | ✅ 完成 |
| M1 工程骨架 | monorepo 初始化、前后端骨架、SQLite、SSE 通道 | ✅ 完成 |
| M2 Runtime 抽象层 | 统一接口 + 本地扫描 + Provider | ✅ 完成 |
| M3 工作区与创作 | 书房、设定、蓝图、正文写稿（流式） | ✅ 完成 |
| M4 拆文工作台 | 书名搜索下载、结构/文风/爽点拆解 | 待开始 |
| M5 增强 | Agent CLI、知识库、Skill、导出 | 待开始 |
| M6 打磨发布 | 多用户、部署、测试 | 待开始 |

## 许可证

MIT
