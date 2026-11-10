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
  apiKey?: string;
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

// ===== 拆文工作台（M4） =====

export interface BookSourceInfo {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

export interface BookResult {
  id: string;
  title: string;
  author: string;
  source: string;
  provider: string;
  cover?: string;
  intro?: string;
  formats: string[];
  detailUrl?: string;
}

export interface DeconstructSource {
  id: string;
  title: string;
  author?: string;
  source: string;
  format: string;
  filePath: string;
  wordCount: number;
  status: string;
  createdAt: number;
}

export interface ChapterStat {
  title: string;
  chars: number;
  paragraphCount: number;
}

export interface WordFreq {
  word: string;
  count: number;
}

export interface AnalysisResult {
  title: string;
  totalChars: number;
  chapterCount: number;
  paragraphCount: number;
  avgChapterChars: number;
  dialogueRatio: number;
  avgSentenceLength: number;
  maxSentenceLength: number;
  chapters: ChapterStat[];
  rhythm: number[];
  topWords: WordFreq[];
  sentenceDist: { short: number; medium: number; long: number };
  aiEnhanced: boolean;
  aiSummary?: string;
  generatedAt: number;
}

export interface DeconstructReport {
  id: string;
  sourceId: string;
  title: string;
  analysis: AnalysisResult;
  createdAt: number;
}

export async function fetchBookSources(): Promise<BookSourceInfo[]> {
  const res = await fetch('/api/books/sources');
  return (await res.json()).sources;
}

export async function searchBooks(
  query: string,
): Promise<{ ok: boolean; results: BookResult[]; notice?: string; error?: string }> {
  const res = await fetch('/api/books/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

export async function downloadBook(
  bookId: string,
): Promise<{ ok: boolean; source?: DeconstructSource; error?: string }> {
  const res = await fetch('/api/books/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId }),
  });
  return res.json();
}

export async function importBookText(input: {
  title: string;
  author?: string;
  content: string;
}): Promise<{ ok: boolean; source?: DeconstructSource; error?: string }> {
  const res = await fetch('/api/books/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function fetchDeconstructSources(): Promise<DeconstructSource[]> {
  const res = await fetch('/api/deconstruct/sources');
  return (await res.json()).sources;
}

export async function analyzeDeconstruct(
  sourceId: string,
): Promise<{ ok: boolean; report?: DeconstructReport; error?: string }> {
  const res = await fetch('/api/deconstruct/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId }),
  });
  return res.json();
}

export async function fetchReports(): Promise<DeconstructReport[]> {
  const res = await fetch('/api/deconstruct/reports');
  return (await res.json()).reports;
}

export async function convertReport(
  reportId: string,
): Promise<{ ok: boolean; novel?: Novel; error?: string }> {
  const res = await fetch(`/api/deconstruct/reports/${reportId}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.json();
}

// ===== M5 增强能力 =====

export async function fetchCapableRuntimes(): Promise<{
  capable: AgentRuntimeInfo[];
  preferredId: string | null;
}> {
  const res = await fetch('/api/runtimes/capable');
  return res.json();
}

export async function deleteRuntime(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/runtimes/${id}`, { method: 'DELETE' });
  return res.json();
}

// --- 审稿 / 修稿 ---

export interface ReviewItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ReviewRecord {
  id: string;
  chapterId: string;
  items: ReviewItem[];
  createdAt: number;
}

export async function reviewChapter(
  chapterId: string,
  runtimeId?: string,
): Promise<{ ok: boolean; record?: ReviewRecord; error?: string }> {
  const res = await fetch(`/api/chapters/${chapterId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runtimeId }),
  });
  return res.json();
}

export async function fetchReviews(chapterId: string): Promise<ReviewRecord[]> {
  const res = await fetch(`/api/chapters/${chapterId}/reviews`);
  return (await res.json()).reviews;
}

export async function reviseChapter(
  chapterId: string,
  selectedTexts: string[],
  reviewId?: string,
  runtimeId?: string,
): Promise<{ ok: boolean; content?: string; version?: number; error?: string }> {
  const res = await fetch(`/api/chapters/${chapterId}/revise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedTexts, reviewId, runtimeId }),
  });
  return res.json();
}

export async function fetchDrafts(chapterId: string): Promise<
  Array<{ id: string; version: number; kind: string; content: string; createdAt: number }>
> {
  const res = await fetch(`/api/chapters/${chapterId}/drafts`);
  return (await res.json()).drafts;
}

// --- 导出 ---

export async function exportNovel(
  novelId: string,
  format: 'md' | 'txt',
): Promise<{ ok: boolean; filename?: string; content?: string; mime?: string; error?: string }> {
  const res = await fetch(`/api/novels/${novelId}/export?format=${format}`);
  return res.json();
}

// --- 知识库 ---

export interface KnowledgeDoc {
  id: string;
  novelId?: string;
  title: string;
  chars: number;
  createdAt: number;
}

export interface KnowledgeHit {
  id: string;
  title: string;
  excerpt: string;
  matches: number;
}

export async function fetchKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  const res = await fetch('/api/knowledge/docs');
  return (await res.json()).docs;
}

export async function createKnowledgeDoc(input: {
  title: string;
  content: string;
  novelId?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/knowledge/docs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function deleteKnowledgeDoc(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/knowledge/docs/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function searchKnowledge(q: string): Promise<KnowledgeHit[]> {
  const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(q)}`);
  return (await res.json()).hits;
}
