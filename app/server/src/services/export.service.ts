import { getNovel } from './novel.service.js';
import { listChapters } from './chapter.service.js';

export type ExportFormat = 'md' | 'txt';

/** 导出整部作品为 Markdown 或纯文本。 */
export function exportNovel(novelId: string, format: ExportFormat): {
  filename: string;
  content: string;
  mime: string;
} {
  const novel = getNovel(novelId);
  if (!novel) throw new Error('作品不存在');
  const chapters = listChapters(novelId);

  const safeTitle = novel.title.replace(/[\\/:*?"<>|]/g, '_');
  const lines: string[] = [];

  if (format === 'md') {
    lines.push(`# ${novel.title}`, '');
    const meta = [
      novel.genre ? `> 类型：${novel.genre}` : '',
      novel.premise ? `> 故事前提：${novel.premise}` : '',
      novel.wordsPerChapter ? `> 每章目标：${novel.wordsPerChapter} 字` : '',
    ].filter(Boolean);
    if (meta.length > 0) lines.push(...meta, '');
    for (const c of chapters) {
      lines.push(`## 第 ${c.seq} 章 ${c.title ?? ''}`.trim(), '');
      lines.push((c.content ?? '（本章暂无正文）').trim(), '');
    }
  } else {
    lines.push(novel.title, '');
    if (novel.genre) lines.push(`类型：${novel.genre}`);
    if (novel.premise) lines.push(`故事前提：${novel.premise}`);
    lines.push('');
    for (const c of chapters) {
      lines.push(`第 ${c.seq} 章 ${c.title ?? ''}`.trim(), '');
      lines.push((c.content ?? '（本章暂无正文）').trim(), '', '');
    }
  }

  return {
    filename: `${safeTitle}.${format}`,
    content: lines.join('\n'),
    mime: format === 'md' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8',
  };
}
