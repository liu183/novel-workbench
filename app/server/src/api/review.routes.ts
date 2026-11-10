import type { FastifyInstance } from 'fastify';
import {
  reviewChapter,
  listReviews,
  reviseChapter,
  listDrafts,
} from '../services/review.service.js';

interface ReviseBody {
  selectedTexts?: string[];
  reviewId?: string;
  runtimeId?: string;
}

export async function registerReviewRoutes(app: FastifyInstance): Promise<void> {
  // AI 审稿
  app.post('/api/chapters/:id/review', async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { runtimeId?: string };
    try {
      const record = await reviewChapter(id, body.runtimeId);
      return { ok: true, record };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  // 审稿记录
  app.get('/api/chapters/:id/reviews', async (req) => {
    const { id } = req.params as { id: string };
    return { reviews: listReviews(id) };
  });

  // 按勾选意见修稿
  app.post('/api/chapters/:id/revise', async (req) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as ReviseBody;
    try {
      const result = await reviseChapter(
        id,
        body.selectedTexts ?? [],
        body.reviewId,
        body.runtimeId,
      );
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  // 版本历史
  app.get('/api/chapters/:id/drafts', async (req) => {
    const { id } = req.params as { id: string };
    return { drafts: listDrafts(id) };
  });
}
