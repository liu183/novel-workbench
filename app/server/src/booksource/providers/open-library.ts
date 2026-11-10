import type { BookSource, BookSearchResult } from '../types.js';

interface OpenLibraryDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
}

/** Open Library 图书元数据检索（公版目录，无全文）。 */
export class OpenLibraryProvider implements BookSource {
  id = 'openlibrary';
  name = 'Open Library';
  type = 'catalog' as const;
  enabled = true;

  async search(query: string): Promise<BookSearchResult[]> {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,first_publish_year,cover_i,subject`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { docs?: OpenLibraryDoc[] };

    return (data.docs ?? []).map((d, i) => ({
      id: `ol-${(d.key ?? String(i)).replace(/\//g, '-')}`,
      title: d.title ?? '未命名',
      author: d.author_name?.slice(0, 2).join(', ') || '未知',
      source: 'Open Library',
      provider: 'openlibrary',
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : undefined,
      intro: d.first_publish_year ? `首版 ${d.first_publish_year}` : undefined,
      formats: [],
      detailUrl: d.key ? `https://openlibrary.org${d.key}` : undefined,
    }));
  }
}
