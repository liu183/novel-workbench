import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AgentCapability, AgentRuntimeInfo } from '../types.js';

const execFileAsync = promisify(execFile);

export interface CliFingerprint {
  command: string;
  name: string;
  provider: string;
  capabilities: AgentCapability[];
}

/** 已知 Agent CLI 指纹表（通过系统 PATH 探测）。 */
export const CLI_FINGERPRINTS: CliFingerprint[] = [
  {
    command: 'codex',
    name: 'Codex CLI',
    provider: 'codex',
    capabilities: ['chat', 'agent-task', 'tool-call'],
  },
  {
    command: 'claude',
    name: 'Claude Code',
    provider: 'claude-code',
    capabilities: ['chat', 'agent-task', 'tool-call'],
  },
  {
    command: 'gemini',
    name: 'Gemini CLI',
    provider: 'gemini-cli',
    capabilities: ['chat', 'agent-task', 'tool-call'],
  },
  {
    command: 'aider',
    name: 'Aider',
    provider: 'aider',
    capabilities: ['chat', 'agent-task'],
  },
  {
    command: 'opencode',
    name: 'OpenCode',
    provider: 'opencode',
    capabilities: ['chat', 'agent-task'],
  },
  {
    command: 'goose',
    name: 'Goose',
    provider: 'goose',
    capabilities: ['chat', 'agent-task'],
  },
];

/** 探测命令是否存在于系统 PATH（Windows 用 where，Unix 用 which）。 */
export async function commandExists(command: string): Promise<boolean> {
  const locator = process.platform === 'win32' ? 'where' : 'which';
  try {
    await execFileAsync(locator, [command], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export function cliToInfo(f: CliFingerprint): AgentRuntimeInfo {
  return {
    id: `cli-${f.provider}`,
    name: f.name,
    type: 'agent-cli',
    provider: f.provider,
    command: f.command,
    models: [],
    capabilities: f.capabilities,
    status: 'scanning',
  };
}
