import type { FastifyInstance } from 'fastify';
import {
  listChapters,
  getChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  type ChapterInput,
} from '../services/chapter.service.js';

export async function registerChapterRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/novels/:novelId/chapters', async (req) => {
    const { novelId } = req.params as { novelId: string };
    return { chapters: listChapters(novelId) };
  });

  app.post('/api/novels/:novelId/chapters', async (req) => {
    const { novelId } = req.params as { novelId: string };
    const chapter = createChapter(novelId, req.body as ChapterInput);
    if (!chapter) return { ok: false, error: '作品不存在' };
    return { ok: true, chapter };
  });

  app.get('/api/chapters/:id', async (req) => {
    const { id } = req.params as { id: string };
    const chapter = getChapter(id);
    if (!chapter) return { ok: false, error: '章节不存在' };
    return { ok: true, chapter };
  });

  app.put('/api/chapters/:id', async (req) => {
    const { id } = req.params as { id: string };
    const chapter = updateChapter(
      id,
      req.body as ChapterInput & { content?: string; status?: string; summary?: string },
    );
    if (!chapter) return { ok: false, error: '章节不存在' };
    return { ok: true, chapter };
  });

  app.delete('/api/chapters/:id', async (req) => {
    const { id } = req.params as { id: string };
    return { ok: deleteChapter(id) };
  });
}
