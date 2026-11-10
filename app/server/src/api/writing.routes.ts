import type { FastifyInstance } from 'fastify';
import { initSSE } from '../sse.js';
import { writeChapter } from '../services/writing.service.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function registerWritingRoutes(app: FastifyInstance): Promise<void> {
  // 写稿：SSE 流式回传（start → delta… → done / error）
  app.post('/api/chapters/:id/write', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { runtimeId?: string };
    const send = initSSE(reply);

    send({ event: 'start', data: JSON.stringify({ message: '正在撰写正文…' }) });

    try {
      const result = await writeChapter(id, body?.runtimeId);
      const content = result.content ?? '';
      const step = 120;

      for (let i = 0; i < content.length; i += step) {
        send({
          event: 'delta',
          data: JSON.stringify({ content: content.slice(i, i + step) }),
        });
        await sleep(12);
      }

      send({
        event: 'done',
        data: JSON.stringify({
          content,
          runtimeName: result.runtimeName,
          model: result.model,
        }),
      });
    } catch (err) {
      send({ event: 'error', data: JSON.stringify({ message: (err as Error).message }) });
    } finally {
      reply.raw.end();
    }
  });
}
