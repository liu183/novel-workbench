import { spawn } from 'node:child_process';
import type {
  AgentRuntime,
  AgentRuntimeInfo,
  ChatRequest,
  ChatResponse,
  HealthResult,
} from '../types.js';

export interface CliProfile {
  /** 构造命令行参数；{prompt} 用实际文本替换 */
  buildArgs: (prompt: string) => string[];
}

/**
 * 常见 Agent CLI 的非交互调用参数模板。
 * 各 CLI 版本可能调整参数，可通过 CLI_PROFILES 扩展。
 */
export const CLI_PROFILES: Record<string, CliProfile> = {
  codex: { buildArgs: (p) => ['exec', '--skip-git-repo-check', p] },
  'claude-code': { buildArgs: (p) => ['-p', p] },
  'gemini-cli': { buildArgs: (p) => ['-p', p] },
  opencode: { buildArgs: (p) => ['run', p] },
  goose: { buildArgs: (p) => ['run', '--text', p] },
  aider: { buildArgs: (p) => ['--message', p, '--no-auto-commits'] },
};

export interface CliRuntimeOptions {
  id: string;
  name: string;
  command: string;
  provider: string;
  capabilities: AgentRuntimeInfo['capabilities'];
  timeoutMs?: number;
}

/** 执行本地 Agent CLI，返回 stdout 文本。 */
export function execCli(
  command: string,
  args: string[],
  timeoutMs = 120_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: process.platform === 'win32',
      windowsHide: true,
      env: { ...process.env, NO_COLOR: '1' },
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      child.kill();
      if (!settled) {
        settled = true;
        reject(new Error(`CLI 执行超时（${Math.round(timeoutMs / 1000)}s）`));
      }
    }, timeoutMs);

    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        reject(new Error(`CLI 启动失败：${err.message}`));
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      if (code !== 0) {
        reject(new Error(`CLI 退出码 ${code}${stderr ? `：${stderr.slice(0, 300)}` : ''}`));
        return;
      }
      const output = stdout.trim();
      if (!output) {
        reject(new Error(`CLI 未返回内容${stderr ? `：${stderr.slice(0, 200)}` : ''}`));
        return;
      }
      resolve(output);
    });
  });
}

/**
 * Agent CLI Runtime：通过子进程调用本机 CLI（codex / claude / gemini 等）生成文本。
 * 使扫描到的 Agent CLI 真正参与写稿、审稿与拆文分析。
 */
export class CliRuntime implements AgentRuntime {
  constructor(private readonly opts: CliRuntimeOptions) {}

  info(): AgentRuntimeInfo {
    return {
      id: this.opts.id,
      name: this.opts.name,
      type: 'agent-cli',
      provider: this.opts.provider,
      command: this.opts.command,
      models: [],
      capabilities: this.opts.capabilities,
      status: 'available',
    };
  }

  listModels(): Promise<string[]> {
    return Promise.resolve([]);
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const prompt = req.system
      ? `${req.system}\n\n${req.messages.map((m) => m.content).join('\n')}`
      : req.messages.map((m) => m.content).join('\n');

    const profile = CLI_PROFILES[this.opts.provider];
    const args = profile
      ? profile.buildArgs(prompt)
      : [prompt];

    const content = await execCli(
      this.opts.command,
      args,
      this.opts.timeoutMs ?? 120_000,
    );

    return { content, model: this.opts.provider };
  }

  async healthCheck(): Promise<HealthResult> {
    // CLI 存在性由扫描阶段保证，此处仅做轻量确认
    return { ok: true, latencyMs: 0 };
  }
}
