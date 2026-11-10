export interface HealthInfo {
  ok: boolean;
  service: string;
  version: string;
  time: number;
}

export interface DbHealth {
  db: string;
  ok: boolean;
}

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchDbHealth(): Promise<DbHealth> {
  const res = await fetch('/api/health/db');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ===== AI Agent Runtime =====

export type RuntimeStatus = 'scanning' | 'available' | 'unavailable' | 'error';
export type RuntimeType = 'llm' | 'agent-cli' | 'remote';

export interface AgentRuntimeInfo {
  id: string;
  name: string;
  type: RuntimeType;
  provider: string;
  baseUrl?: string;
  command?: string;
  models: string[];
  capabilities: string[];
  status: RuntimeStatus;
  health?: { latencyMs: number; lastCheck: number };
  error?: string;
}

export async function fetchRuntimes(): Promise<AgentRuntimeInfo[]> {
  const res = await fetch('/api/runtimes');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { runtimes: AgentRuntimeInfo[] };
  return data.runtimes;
}

export async function scanRuntimes(): Promise<{ runtimes: AgentRuntimeInfo[]; durationMs: number }> {
  const res = await fetch('/api/runtimes/scan', { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function addRuntime(input: {
  name: string;
  baseUrl: string;
  provider?: string;
}): Promise<{ ok: boolean; runtime?: AgentRuntimeInfo; error?: string }> {
  const res = await fetch('/api/runtimes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}
