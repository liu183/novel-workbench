import type { FastifyInstance } from 'fastify';
import {
  analyzeSource,
  getReport,
  listReports,
  convertToNovel,
} from '../services/deconstruct.service.js';

interface AnalyzeBody {
  sourceId?: string;
}

export async function registerDeconstructRoutes(app: FastifyInstance): Promise<void> {
  // 发起拆解分析
  app.post('/api/deconstruct/analyze', async (req) => {
    const body = req.body as AnalyzeBody;
    if (!body?.sourceId) return { ok: false, error: '缺少 sourceId' };
    try {
      const report = await analyzeSource(body.sourceId);
      return { ok: true, report };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  // 报告列表
  app.get('/api/deconstruct/reports', async (req) => {
    const { sourceId } = (req.query ?? {}) as { sourceId?: string };
    return { reports: listReports(sourceId) };
  });

  // 报告详情
  app.get('/api/deconstruct/reports/:id', async (req) => {
    const { id } = req.params as { id: string };
    const report = getReport(id);
    if (!report) return { ok: false, error: '报告不存在' };
    return { ok: true, report };
  });

  // 反哺创作：拆文结论转新作品
  app.post('/api/deconstruct/reports/:id/convert', async (req) => {
    const { id } = req.params as { id: string };
    try {
      const novel = convertToNovel(id);
      if (!novel) return { ok: false, error: '报告不存在' };
      return { ok: true, novel };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
}
