import type { AgentRuntimeInfo, RuntimeType } from './types.js';

/**
 * Runtime 注册表（内存）。保存扫描发现与手动添加的 Runtime 元信息。
 * 扫描结果每次刷新时重建；手动添加的远程 Runtime 单独持久（本次进程内）。
 */
export class RuntimeRegistry {
  private runtimes = new Map<string, AgentRuntimeInfo>();

  list(): AgentRuntimeInfo[] {
    return [...this.runtimes.values()];
  }

  get(id: string): AgentRuntimeInfo | undefined {
    return this.runtimes.get(id);
  }

  upsert(info: AgentRuntimeInfo): void {
    this.runtimes.set(info.id, info);
  }

  /** 清除上一次扫描产生的条目（port-/cli-/config- 前缀），保留手动添加的。 */
  clearScanResults(): void {
    for (const key of this.runtimes.keys()) {
      if (key.startsWith('port-') || key.startsWith('cli-') || key.startsWith('config-')) {
        this.runtimes.delete(key);
      }
    }
  }

  addRemote(input: {
    name: string;
    baseUrl: string;
    provider?: string;
    type?: RuntimeType;
    apiKey?: string;
  }): AgentRuntimeInfo {
    const id = `remote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const info: AgentRuntimeInfo = {
      id,
      name: input.name,
      type: input.type ?? 'remote',
      provider: input.provider ?? 'custom',
      baseUrl: input.baseUrl,
      models: [],
      capabilities: ['chat', 'stream'],
      status: 'available',
    };
    this.runtimes.set(id, info);
    return info;
  }
}

export const registry = new RuntimeRegistry();
