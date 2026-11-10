export interface ChapterSection {
  title: string;
  content: string;
}

/** 文本归一化：统一换行、去 BOM、合并多余空行。 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\uFEFF/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/** 按"第X章/回/节"切分章节；若无章节标题，退化为按空行分段。 */
export function splitChapters(text: string): ChapterSection[] {
  const heading = /(?:^|\n)\s*(第[一二三四五六七八九十百千零〇两0-9]+[章节回卷部篇集][^\n]{0,40})\s*(?=\n|$)/g;
  const matches = [...text.matchAll(heading)];

  if (matches.length >= 2) {
    const result: ChapterSection[] = [];
    for (let i = 0; i < matches.length; i += 1) {
      const start = (matches[i].index ?? 0) + matches[i][0].length;
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
      result.push({
        title: matches[i][1].trim(),
        content: text.slice(start, end).trim(),
      });
    }
    return result.filter((c) => c.content.length > 0);
  }

  const parts = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (parts.length === 0) return [{ title: '全文', content: text }];
  return parts.map((p, i) => ({ title: `段落 ${i + 1}`, content: p.trim() }));
}
