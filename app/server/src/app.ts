import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { AppDeps } from './types.js';
import { initSSE } from './sse.js';
import { registerRuntimeRoutes } from './api/runtimes.routes.js';
import { registerNovelRoutes } from './api/novels.routes.js';
import { registerChapterRoutes } from './api/chapters.routes.js';
import { registerWritingRoutes } from './api/writing.routes.js';
import { registerBooksRoutes } from './api/books.routes.js';
import { registerDeconstructRoutes } from './api/deconstruct.routes.js';
import { registerReviewRoutes } from './api/review.routes.js';
import { registerExportRoutes } from './api/export.routes.js';
import { registerKnowledgeRoutes } from './api/knowledge.routes.js';

/**
 * 构建 Fastify 应用实例，注册插件与路由。
 */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { db, config } = deps;
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  // 健康检查
  app.get('/api/health', async () => ({
    ok: true,
    service: 'novel-workbench-server',
    version: config.version,
    time: Date.now(),
  }));

  // 数据库状态
  app.get('/api/health/db', async () => {
    const row = db.prepare('SELECT 1 AS ok').get() as { ok: number };
    return { db: 'sqlite', ok: row.ok === 1 };
  });

  // SSE 流式通道演示：每秒推送一条消息，共 10 条后结束
  app.get('/api/stream/demo', async (_req, reply) => {
    const send = initSSE(reply);
    let count = 0;

    const timer = setInterval(() => {
      count += 1;
      send({
        id: String(count),
        event: 'message',
        data: { count, message: `第 ${count} 条消息`, time: Date.now() },
      });

      if (count >= 10) {
        clearInterval(timer);
        reply.raw.end();
      }
    }, 1000);
  });

  // AI Agent Runtime 抽象层路由（M2）
  await registerRuntimeRoutes(app);

  // 工作区与创作路由（M3）
  await registerNovelRoutes(app);
  await registerChapterRoutes(app);
  await registerWritingRoutes(app);

  // 拆文工作台路由（M4）
  await registerBooksRoutes(app);
  await registerDeconstructRoutes(app);

  // 增强能力路由（M5）
  await registerReviewRoutes(app);
  await registerExportRoutes(app);
  await registerKnowledgeRoutes(app);

  return app;
}
