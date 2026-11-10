import { getDb } from '../db.js';
import type { AgentCapability, AgentRuntimeInfo, RuntimeType } from './types.js';

interface StoredConfig {
  apiKey?: string;
}

interface RuntimeRow {
  id: string;
  name: string;
  type: RuntimeType;
  provider: string;
  baseUrl?: string;
  capabilities: string;
  status: string;
  config: string | null;
  createdAt: number;
}

const RUNTIME_COLUMNS = `
  id, name, type, provider, base_url AS baseUrl,
  capabilities, status, config, created_at AS createdAt
`;

/**
 * Runtime 注册表。
 * - 扫描结果（port-/cli-/config-）每次扫描重建，仅内存。
 * - 手动添加的远程 Runtime 落 SQLite，重启后通过 loadPersisted() 恢复。
 * - 凭据（apiKey）只保存在服务端内存 + SQLite，不回传前端。
 */
export class RuntimeRegistry {
  private runtimes = new Map<string, AgentRuntimeInfo>();
  private credentials = new Map<string, StoredConfig>();

  list(): AgentRuntimeInfo[] {
    return [...this.runtimes.values()];
  }

  get(id: string): AgentRuntimeInfo | undefined {
    return this.runtimes.get(id);
  }

  getCredentials(id: string): StoredConfig | undefined {
    return this.credentials.get(id);
  }

  upsert(info: AgentRuntimeInfo): void {
    this.runtimes.set(info.id, info);
  }

  /** 清除上一次扫描产生的条目，保留手动添加的。 */
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
    if (input.apiKey) this.credentials.set(id, { apiKey: input.apiKey });

    getDb()
      .prepare(
        `INSERT INTO runtime (id, name, type, provider, base_url, capabilities, status, config, created_at)
         VALUES (@id, @name, @type, @provider, @baseUrl, @capabilities, @status, @config, @createdAt)`,
      )
      .run({
        id,
        name: info.name,
        type: info.type,
        provider: info.provider,
        baseUrl: info.baseUrl,
        capabilities: JSON.stringify(info.capabilities),
        status: info.status,
        config: JSON.stringify(input.apiKey ? { apiKey: input.apiKey } : {}),
        createdAt: Date.now(),
      });

    return info;
  }

  removeRemote(id: string): boolean {
    if (!id.startsWith('remote-')) return false;
    this.runtimes.delete(id);
    this.credentials.delete(id);
    const result = getDb().prepare('DELETE FROM runtime WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /** 服务启动时从 SQLite 恢复手动添加的 Runtime。 */
  loadPersisted(): void {
    const rows = getDb()
      .prepare(`SELECT ${RUNTIME_COLUMNS} FROM runtime ORDER BY created_at ASC`)
      .all() as RuntimeRow[];

    for (const row of rows) {
      let caps: AgentCapability[] = [];
      try {
        caps = JSON.parse(row.capabilities) as AgentCapability[];
      } catch {
        caps = ['chat', 'stream'];
      }

      this.runtimes.set(row.id, {
        id: row.id,
        name: row.name,
        type: row.type,
        provider: row.provider,
        baseUrl: row.baseUrl,
        models: [],
        capabilities: caps,
        status: 'available',
      });

      if (row.config) {
        try {
          const cfg = JSON.parse(row.config) as StoredConfig;
          if (cfg.apiKey) this.credentials.set(row.id, cfg);
        } catch {
          // 忽略损坏的配置
        }
      }
    }
  }
}

export const registry = new RuntimeRegistry();
