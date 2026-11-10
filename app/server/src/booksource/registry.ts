import { GutendexProvider } from './providers/gutendex.js';
import { OpenLibraryProvider } from './providers/open-library.js';
import { DemoLibraryProvider } from './providers/demo-library.js';
import type { BookSource, BookSearchResult } from './types.js';

// 在线源优先，内置示例库作为离线兜底
const sources: BookSource[] = [
  new GutendexProvider(),
  new OpenLibraryProvider(),
  new DemoLibraryProvider(),
];

export function listSources(): BookSource[] {
  return sources;
}

export function getSource(id: string): BookSource | undefined {
  return sources.find((s) => s.id === id);
}

// 搜索结果缓存：download 时按 id 取回完整结果（含下载地址）
const searchCache = new Map<string, BookSearchResult>();

export function cacheResults(results: BookSearchResult[]): void {
  for (const r of results) searchCache.set(r.id, r);
}

export function getCached(id: string): BookSearchResult | undefined {
  return searchCache.get(id);
}
