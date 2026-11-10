import { PORT_FINGERPRINTS, canConnect, portToInfo } from './scanner/port-scan.js';
import { CLI_FINGERPRINTS, commandExists, cliToInfo } from './scanner/command-scan.js';
import { findConfigured } from './scanner/config-scan.js';
import { OpenAICompatRuntime } from './providers/openai-compat.js';
import { registry } from './registry.js';
import type { AgentRuntimeInfo } from './types.js';

export interface ScanResult {
  runtimes: AgentRuntimeInfo[];
  durationMs: number;
}

/**
 * 扫描本地可用的 Agent Runtime：
 * 1. 端口探测（并行）——发现本地 OpenAI 兼容推理服务；
 * 2. 命令探测（并行）——发现已安装的 Agent CLI；
 * 3. 对开放端口做健康检查 + 模型列表验证；
 * 4. 配置探测——识别"已安装但未启动"的 Runtime。
 */
export async function scanRuntimes(): Promise<ScanResult> {
  const start = Date.now();
  registry.clearScanResults();

  const openPorts = (
    await Promise.all(
      PORT_FINGERPRINTS.map(async (f) =>
        (await canConnect(f.host, f.port)) ? portToInfo(f) : null,
      ),
    )
  ).filter((r): r is AgentRuntimeInfo => r !== null);

  const cliFound = (
    await Promise.all(
      CLI_FINGERPRINTS.map(async (f) =>
        (await commandExists(f.command)) ? cliToInfo(f) : null,
      ),
    )
  ).filter((r): r is AgentRuntimeInfo => r !== null);

  const verifiedPorts: AgentRuntimeInfo[] = [];
  await Promise.all(
    openPorts.map(async (info) => {
      const runtime = new OpenAICompatRuntime({
        id: info.id,
        name: info.name,
        type: 'llm',
        provider: info.provider,
        baseUrl: info.baseUrl!,
        capabilities: info.capabilities,
      });

      const health = await runtime.healthCheck();
      if (!health.ok) return;

      try {
        await runtime.listModels();
      } catch {
        // 模型列表获取失败不阻断，保留空列表
      }

      const full = runtime.info();
      full.status = 'available';
      full.health = { latencyMs: health.latencyMs, lastCheck: Date.now() };
      verifiedPorts.push(full);
    }),
  );

  const cliVerified = cliFound.map((info) => ({ ...info, status: 'available' as const }));

  // 配置探测：仅报告"有配置但未运行"的（排除已 available 的 provider，避免重复）
  const availableProviders = new Set([...verifiedPorts, ...cliVerified].map((r) => r.provider));
  const configured = findConfigured().filter((r) => !availableProviders.has(r.provider));

  for (const r of [...verifiedPorts, ...cliVerified, ...configured]) {
    registry.upsert(r);
  }

  return { runtimes: registry.list(), durationMs: Date.now() - start };
}

export function getRuntimes(): AgentRuntimeInfo[] {
  return registry.list();
}

export function getRuntimeModels(id: string): string[] {
  return registry.get(id)?.models ?? [];
}
