import type { BookSource, BookSearchResult } from '../types.js';

interface GutendexBook {
  id: number;
  title: string;
  authors: { name: string }[];
  formats: Record<string, string>;
  subjects?: string[];
}

/** Project Gutenberg（公版电子书）检索与全文下载，通过 Gutendex API。 */
export class GutendexProvider implements BookSource {
  id = 'gutendex';
  name = 'Project Gutenberg';
  type = 'open' as const;
  enabled = true;

  async search(query: string): Promise<BookSearchResult[]> {
    const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: GutendexBook[] };

    return (data.results ?? []).slice(0, 8).map((b) => {
      const txtUrl =
        b.formats['text/plain; charset=utf-8'] ??
        b.formats['text/plain'] ??
        Object.entries(b.formats).find(([k]) => k.startsWith('text/plain'))?.[1];

      return {
        id: `gutendex-${b.id}`,
        title: b.title.split('\n')[0].trim(),
        author: b.authors.map((a) => a.name).join(', ') || '未知',
        source: 'Project Gutenberg',
        provider: 'gutendex',
        intro: b.subjects?.slice(0, 3).join(' · '),
        formats: txtUrl ? ['txt'] : [],
        downloadUrl: txtUrl,
        detailUrl: `https://www.gutenberg.org/ebooks/${b.id}`,
      };
    });
  }

  async download(result: BookSearchResult): Promise<string> {
    if (!result.downloadUrl) throw new Error('该书目没有可用的纯文本全文');
    const res = await fetch(result.downloadUrl, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
    return res.text();
  }
}
