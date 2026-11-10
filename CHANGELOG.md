# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范，提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)。

## [Unreleased]

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
