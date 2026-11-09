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
