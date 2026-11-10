import type { FastifyInstance } from 'fastify';
import { exportNovel, type ExportFormat } from '../services/export.service.js';

export async function registerExportRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/novels/:id/export', async (req) => {
    const { id } = req.params as { id: string };
    const { format } = (req.query ?? {}) as { format?: string };
    const fmt: ExportFormat = format === 'txt' ? 'txt' : 'md';
    try {
      return { ok: true, ...exportNovel(id, fmt) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
}
