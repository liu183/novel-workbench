import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AgentRuntimeInfo, RuntimeType } from '../types.js';

export interface ConfigFingerprint {
  name: string;
  provider: string;
  type: RuntimeType;
  paths: string[];
  hint: string;
}

/** 已知 Runtime 配置目录指纹，用于识别"已安装但未启动"的 Runtime。 */
export const CONFIG_FINGERPRINTS: ConfigFingerprint[] = [
  {
    name: 'Ollama',
    provider: 'ollama',
    type: 'llm',
    paths: ['.ollama'],
    hint: '已安装，运行 `ollama serve` 启动服务',
  },
  {
    name: 'Codex CLI',
    provider: 'codex',
    type: 'agent-cli',
    paths: ['.codex'],
    hint: '已配置，运行 `codex` 登录后可用',
  },
  {
    name: 'Claude Code',
    provider: 'claude-code',
    type: 'agent-cli',
    paths: ['.claude', '.claude.json'],
    hint: '已配置，运行 `claude` 登录后可用',
  },
  {
    name: 'Gemini CLI',
    provider: 'gemini-cli',
    type: 'agent-cli',
    paths: ['.gemini'],
    hint: '已配置，运行 `gemini` 登录后可用',
  },
  {
    name: 'Aider',
    provider: 'aider',
    type: 'agent-cli',
    paths: ['.aider.conf.yml', '.aider'],
    hint: '已配置，运行 `aider` 后可用',
  },
];

/** 扫描用户主目录下已存在的 Runtime 配置，标记为 unavailable 并附启动提示。 */
export function findConfigured(): AgentRuntimeInfo[] {
  const home = os.homedir();
  const result: AgentRuntimeInfo[] = [];

  for (const f of CONFIG_FINGERPRINTS) {
    const found = f.paths.some((p) => fs.existsSync(path.join(home, p)));
    if (found) {
      result.push({
        id: `config-${f.provider}`,
        name: f.name,
        type: f.type,
        provider: f.provider,
        models: [],
        capabilities: [],
        status: 'unavailable',
        error: f.hint,
      });
    }
  }

  return result;
}
