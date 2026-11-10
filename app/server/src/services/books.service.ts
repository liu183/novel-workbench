import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getDb, getDataDir } from '../db.js';
import {
  listSources,
  getSource,
  cacheResults,
  getCached,
  normalizeText,
  type BookSearchResult,
} from '../booksource/index.js';

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

const SOURCE_COLUMNS = `
  id, title, author, source, format,
  file_path AS filePath, word_count AS wordCount,
  status, meta, created_at AS createdAt
`;

export function listSourceInfo(): Array<{
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}> {
  return listSources().map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    enabled: s.enabled,
  }));
}

export interface SearchOutcome {
  results: BookSearchResult[];
  notice?: string;
}

// 在线源健康标记：一次超时后短暂跳过，5 分钟自动重试（避免每次搜索都等待超时）
const ONLINE_RETRY_MS = 5 * 60 * 1000;
let onlineBlockedUntil = 0;

/** 并行搜索在线书源；在线源不可达或无结果时，回退到内置示例库。 */
export async function searchBooks(query: string): Promise<SearchOutcome> {
  const all = listSources();
  const online = all.filter((s) => s.id !== 'demo');
  const offline = all.filter((s) => s.id === 'demo');

  let results: BookSearchResult[] = [];
  let onlineUnavailable = false;

  if (Date.now() >= onlineBlockedUntil) {
    const onlinePromise = Promise.all(
      online.map(async (s) => {
        try {
          return await s.search(query);
        } catch {
          return [];
        }
      }),
    ).then((arr) => arr.flat());

    // 在线源整体最多等待 3s，超时立即回退
    const timeoutPromise = new Promise<BookSearchResult[]>((resolve) => {
      setTimeout(() => resolve([]), 3000);
    });

    results = await Promise.race([onlinePromise, timeoutPromise]);
    if (results.length === 0) {
      onlineBlockedUntil = Date.now() + ONLINE_RETRY_MS;
      onlineUnavailable = true;
    }
  } else {
    onlineUnavailable = true;
  }

  let notice: string | undefined;
  if (results.length === 0) {
    const fallback = (
      await Promise.all(
        offline.map(async (s) => {
          try {
            return await s.search(query);
          } catch {
            return [];
          }
        }),
      )
    ).flat();
    results = fallback;
    notice = onlineUnavailable
      ? '在线书源暂不可用，已展示内置示例书目（可直接下载拆解）'
      : '未找到匹配书目，可使用「手动导入文本」';
  }

  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = `${r.title}|${r.author}`.toLowerCase().replace(/\s/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  cacheResults(deduped);
  return { results: deduped, notice };
}

/** 下载书目全文并入库。 */
export async function downloadBook(bookId: string): Promise<DeconstructSource> {
  const result = getCached(bookId);
  if (!result) throw new Error('书目不存在或搜索结果已过期，请重新搜索');

  const source = getSource(result.provider);
  if (!source?.download) {
    throw new Error('该书源仅提供元数据，不支持全文下载，请使用「手动导入文本」');
  }

  const raw = await source.download(result);
  const text = normalizeText(raw);
  if (text.length < 50) throw new Error('下载内容为空或过短');

  return saveSource({
    title: result.title,
    author: result.author,
    source: result.source,
    format: 'txt',
    content: text,
  });
}

/** 手动导入文本素材。 */
export function importText(input: {
  title: string;
  author?: string;
  content: string;
}): DeconstructSource {
  const text = normalizeText(input.content);
  if (text.length < 20) throw new Error('文本内容过短（至少 20 字）');

  return saveSource({
    title: input.title,
    author: input.author,
    source: '手动导入',
    format: 'txt',
    content: text,
  });
}

function saveSource(input: {
  title: string;
  author?: string;
  source: string;
  format: string;
  content: string;
}): DeconstructSource {
  const id = randomUUID();
  const dir = path.join(getDataDir(), 'deconstruct');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.txt`);
  fs.writeFileSync(filePath, input.content, 'utf8');

  const record: DeconstructSource = {
    id,
    title: input.title,
    author: input.author,
    source: input.source,
    format: input.format,
    filePath,
    wordCount: input.content.replace(/\s/g, '').length,
    status: 'ready',
    createdAt: Date.now(),
  };

  getDb()
    .prepare(
      `INSERT INTO deconstruct_source
        (id, title, author, source, format, file_path, word_count, status, meta, created_at)
       VALUES (@id, @title, @author, @source, @format, @filePath, @wordCount, @status, @meta, @createdAt)`,
    )
    .run({ ...record, meta: null });

  return record;
}

export function listDeconstructSources(): DeconstructSource[] {
  return getDb()
    .prepare(`SELECT ${SOURCE_COLUMNS} FROM deconstruct_source ORDER BY created_at DESC`)
    .all() as DeconstructSource[];
}

export function getSourceRecord(id: string): DeconstructSource | undefined {
  return getDb()
    .prepare(`SELECT ${SOURCE_COLUMNS} FROM deconstruct_source WHERE id = ?`)
    .get(id) as DeconstructSource | undefined;
}

export function getSourceText(id: string): string {
  const row = getSourceRecord(id);
  if (!row) throw new Error('素材不存在');
  return fs.readFileSync(row.filePath, 'utf8');
}
