import type { FastifyInstance } from 'fastify';
import {
  listSourceInfo,
  searchBooks,
  downloadBook,
  importText,
  listDeconstructSources,
} from '../services/books.service.js';

interface SearchBody {
  query?: string;
}

interface DownloadBody {
  bookId?: string;
}

interface ImportBody {
  title?: string;
  author?: string;
  content?: string;
}

export async function registerBooksRoutes(app: FastifyInstance): Promise<void> {
  // 书源列表
  app.get('/api/books/sources', async () => ({ sources: listSourceInfo() }));

  // 书名搜索（并行多书源）
  app.post('/api/books/search', async (req) => {
    const body = req.body as SearchBody;
    if (!body?.query?.trim()) return { ok: false, error: '请输入书名或关键词' };
    try {
      const outcome = await searchBooks(body.query.trim());
      return { ok: true, results: outcome.results, notice: outcome.notice };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  // 下载书目全文并入库
  app.post('/api/books/download', async (req) => {
    const body = req.body as DownloadBody;
    if (!body?.bookId) return { ok: false, error: '缺少 bookId' };
    try {
      const source = await downloadBook(body.bookId);
      return { ok: true, source };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  // 手动导入文本
  app.post('/api/books/import', async (req) => {
    const body = req.body as ImportBody;
    if (!body?.title?.trim() || !body?.content?.trim()) {
      return { ok: false, error: '标题与正文均为必填' };
    }
    try {
      const source = importText({
        title: body.title.trim(),
        author: body.author?.trim(),
        content: body.content,
      });
      return { ok: true, source };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  // 已导入素材列表
  app.get('/api/deconstruct/sources', async () => ({
    sources: listDeconstructSources(),
  }));
}
