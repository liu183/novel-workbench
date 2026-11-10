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

// ===== 作品与章节 =====

export interface Novel {
  id: string;
  title: string;
  genre?: string;
  audience?: string;
  language: string;
  totalChapters?: number;
  wordsPerChapter?: number;
  premise?: string;
  outline?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export interface NovelInput {
  title: string;
  genre?: string;
  audience?: string;
  language?: string;
  totalChapters?: number;
  wordsPerChapter?: number;
  premise?: string;
  outline?: string;
}

export interface Chapter {
  id: string;
  novelId: string;
  seq: number;
  title?: string;
  goal?: string;
  conflict?: string;
  hook?: string;
  cast?: string;
  status: string;
  summary?: string;
  content?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChapterInput {
  title?: string;
  goal?: string;
  conflict?: string;
  hook?: string;
  cast?: string;
}

export async function fetchNovels(): Promise<Novel[]> {
  const res = await fetch('/api/novels');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { novels: Novel[] };
  return data.novels;
}

export async function createNovel(input: NovelInput): Promise<Novel> {
  const res = await fetch('/api/novels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { ok: boolean; novel: Novel };
  return data.novel;
}

export async function fetchNovel(id: string): Promise<Novel> {
  const res = await fetch(`/api/novels/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { ok: boolean; novel: Novel };
  return data.novel;
}

export async function fetchChapters(novelId: string): Promise<Chapter[]> {
  const res = await fetch(`/api/novels/${novelId}/chapters`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { chapters: Chapter[] };
  return data.chapters;
}

export async function createChapter(novelId: string, input: ChapterInput): Promise<Chapter> {
  const res = await fetch(`/api/novels/${novelId}/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { ok: boolean; chapter: Chapter };
  return data.chapter;
}

// ===== 写稿（SSE 流式） =====

export interface WriteEvent {
  type: 'start' | 'delta' | 'done' | 'error';
  content?: string;
  message?: string;
  runtimeName?: string;
  model?: string;
}

export async function streamWriteChapter(
  chapterId: string,
  runtimeId: string | undefined,
  onEvent: (e: WriteEvent) => void,
): Promise<void> {
  const res = await fetch(`/api/chapters/${chapterId}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runtimeId }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const parsed = parseSSEEvent(rawEvent);
      if (parsed) onEvent(parsed);
    }
  }
}

function parseSSEEvent(raw: string): WriteEvent | null {
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of raw.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }

  if (dataLines.length === 0) return null;
  const data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
  return { type: eventName as WriteEvent['type'], ...data };
}
