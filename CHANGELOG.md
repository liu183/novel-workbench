# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范，提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)。

## [Unreleased]

### Changed

- **前端 UI 全面美化**：引入 `lucide-react` 图标库，重写设计系统（参考 Linear / Vercel 的深色美学）。
  - 精致配色与背景光晕、统一圆角 / 阴影 / 边框令牌、平滑过渡与入场动画。
  - 侧边栏导航图标化（带 active 指示条）、卡片 hover 微交互、按钮 / 输入框 / 徽章视觉升级。
  - 工作区 / 创作工作台 / AI 运行时三个面板的视觉重构（图标、空状态、状态条）。
  - 配色方案调整为暖色调（琥珀橙品牌色 + 暖调深色背景 + 暖色光晕）。

## [0.3.0] - 2026-11-10

### Added

- **M3 工作区与创作工作台**：
  - SQLite 持久化：`novel` / `chapter` 表结构（章节蓝图字段合并进 chapter）。
  - 领域服务：作品（CRUD）、章节（CRUD + 自动排序 + 蓝图）。
  - 写稿服务：组装 prompt → 调用可用 Runtime（llm / remote）→ 保存正文。
  - REST 路由：作品 `/api/novels`、章节 `/api/novels/:id/chapters`、写稿 `/api/chapters/:id/write`（SSE 流式）。
  - 前端「工作区」面板：作品列表 + 新建 + 系统状态条。
  - 前端「创作工作台」面板：作品详情 + 章节列表 + 蓝图 + AI 写稿（流式展示）。
- 单元测试：作品 / 章节服务 2 例。

### Fixed

- 修复 `SELECT *` 返回 snake_case 列名导致的字段映射错误（改用 SQL 别名映射 camelCase）。
- 修复 `cast` 为 SQL 关键字导致的语法错误（加双引号引用列名）。

## [0.2.0] - 2026-11-10

### Added

- **M2 AI Agent Runtime 抽象层**：
  - 统一 `AgentRuntime` 接口与类型定义（能力 / 状态 / 健康检查）。
  - 本地自动扫描：端口探测（Ollama / LM Studio / vLLM / llama.cpp 等）、命令探测（codex / claude / gemini / aider 等）、配置探测（识别已安装未启动的 Runtime）。
  - OpenAI 兼容 Provider（健康检查 / 模型列表 / 对话）。
  - Runtime 注册表 + 扫描编排（并行探测）。
  - REST 路由：`GET /api/runtimes`、`POST /api/runtimes/scan`、`POST /api/runtimes`、`GET /api/runtimes/:id/models`。
  - 前端「AI 运行时」面板：扫描展示、手动添加远程服务、能力 / 模型可视化。
- 单元测试：runtime 扫描器（端口 / 命令探测）3 例。

## [0.1.0] - 2026-11-09

### Added

- **M1 工程骨架**：初始化 pnpm monorepo（`app/client` + `app/server`）。
- 后端骨架：Fastify 服务、健康检查接口、SQLite 初始化、SSE 流式通道、CORS 支持。
- 前端骨架：React + Vite + TypeScript、应用布局与导航、运行时状态（Zustand）、服务端状态（TanStack Query）。
- 根目录工程化配置：TypeScript 基础配置、EditorConfig、Git 忽略规则。
- 设计文档定稿（M0）。
