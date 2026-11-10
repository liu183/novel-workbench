import { registry } from './registry.js';
import { OpenAICompatRuntime } from './providers/openai-compat.js';
import { CliRuntime } from './providers/cli-runtime.js';
import type { AgentRuntime, AgentRuntimeInfo } from './types.js';

/**
 * 选择可用的 Runtime：
 * - 用户指定 runtimeId 优先；
 * - 其次 llm / remote（OpenAI 兼容 HTTP）；
 * - 最后 agent-cli（本机 CLI 子进程）。
 */
export function selectRuntime(runtimeId?: string): AgentRuntimeInfo | undefined {
  const all = registry
    .list()
    .filter((r) => r.status === 'available' && (r.baseUrl || r.command));
  if (all.length === 0) return undefined;

  if (runtimeId) {
    const found = all.find((r) => r.id === runtimeId);
    if (found) return found;
  }

  return all.find((r) => r.type === 'llm' || r.type === 'remote') ?? all[0];
}

/** 根据 Runtime 元信息创建统一的 AgentRuntime 实例。 */
export function createRuntime(info: AgentRuntimeInfo): AgentRuntime {
  if (info.type === 'agent-cli' && info.command) {
    return new CliRuntime({
      id: info.id,
      name: info.name,
      command: info.command,
      provider: info.provider,
      capabilities: info.capabilities,
    });
  }

  if (info.baseUrl) {
    const creds = registry.getCredentials(info.id);
    return new OpenAICompatRuntime({
      id: info.id,
      name: info.name,
      type: info.type === 'remote' ? 'remote' : 'llm',
      provider: info.provider,
      baseUrl: info.baseUrl,
      capabilities: info.capabilities,
      apiKey: creds?.apiKey,
    });
  }

  throw new Error(`Runtime「${info.name}」缺少 baseUrl 或 command，无法调用`);
}
