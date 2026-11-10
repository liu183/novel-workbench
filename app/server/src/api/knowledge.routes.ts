import type { FastifyInstance } from 'fastify';
import {
  createDoc,
  listDocs,
  getDoc,
  deleteDoc,
  searchDocs,
} from '../services/knowledge.service.js';

interface CreateDocBody {
  title?: string;
  content?: string;
  novelId?: string;
}

export async function registerKnowledgeRoutes(app: FastifyInstance): Promise<void> {
  // 全文检索
  app.get('/api/knowledge/search', async (req) => {
    const { q, novelId } = (req.query ?? {}) as { q?: string; novelId?: string };
    if (!q?.trim()) return { hits: [] };
    return { hits: searchDocs(q.trim(), novelId) };
  });

  // 文档列表
  app.get('/api/knowledge/docs', async (req) => {
    const { novelId } = (req.query ?? {}) as { novelId?: string };
    return { docs: listDocs(novelId) };
  });

  // 新建文档
  app.post('/api/knowledge/docs', async (req) => {
    const body = (req.body ?? {}) as CreateDocBody;
    if (!body.title?.trim() || !body.content?.trim()) {
      return { ok: false, error: '标题与内容均为必填' };
    }
    const doc = createDoc({
      title: body.title.trim(),
      content: body.content,
      novelId: body.novelId,
    });
    return { ok: true, doc };
  });

  // 文档详情
  app.get('/api/knowledge/docs/:id', async (req) => {
    const { id } = req.params as { id: string };
    const doc = getDoc(id);
    if (!doc) return { ok: false, error: '文档不存在' };
    return { ok: true, doc };
  });

  // 删除文档
  app.delete('/api/knowledge/docs/:id', async (req) => {
    const { id } = req.params as { id: string };
    return { ok: deleteDoc(id) };
  });
}
