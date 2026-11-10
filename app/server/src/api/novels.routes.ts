import type { FastifyInstance } from 'fastify';
import {
  listNovels,
  getNovel,
  createNovel,
  updateNovel,
  deleteNovel,
  type NovelInput,
} from '../services/novel.service.js';

export async function registerNovelRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/novels', async () => ({ novels: listNovels() }));

  app.post('/api/novels', async (req) => {
    const body = req.body as NovelInput;
    if (!body?.title) return { ok: false, error: 'title 必填' };
    return { ok: true, novel: createNovel(body) };
  });

  app.get('/api/novels/:id', async (req) => {
    const { id } = req.params as { id: string };
    const novel = getNovel(id);
    if (!novel) return { ok: false, error: '作品不存在' };
    return { ok: true, novel };
  });

  app.put('/api/novels/:id', async (req) => {
    const { id } = req.params as { id: string };
    const novel = updateNovel(id, req.body as Partial<NovelInput>);
    if (!novel) return { ok: false, error: '作品不存在' };
    return { ok: true, novel };
  });

  app.delete('/api/novels/:id', async (req) => {
    const { id } = req.params as { id: string };
    return { ok: deleteNovel(id) };
  });
}
