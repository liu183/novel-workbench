import type { FastifyInstance } from 'fastify';
import { registry, scanRuntimes, getRuntimes, getRuntimeModels } from '../runtime/index.js';

interface AddRuntimeBody {
  name?: string;
  baseUrl?: string;
  provider?: string;
}

export async function registerRuntimeRoutes(app: FastifyInstance): Promise<void> {
  // 列出所有 Runtime（含扫描结果）
  app.get('/api/runtimes', async () => ({ runtimes: getRuntimes() }));

  // 触发本地扫描（同步执行并返回结果）
  app.post('/api/runtimes/scan', async () => scanRuntimes());

  // 手动添加远程 Runtime
  app.post('/api/runtimes', async (req) => {
    const body = req.body as AddRuntimeBody;
    if (!body?.name || !body?.baseUrl) {
      return { ok: false, error: 'name 与 baseUrl 均为必填' };
    }
    const runtime = registry.addRemote({
      name: body.name,
      baseUrl: body.baseUrl,
      provider: body.provider,
    });
    return { ok: true, runtime };
  });

  // 获取指定 Runtime 的模型列表
  app.get('/api/runtimes/:id/models', async (req) => {
    const { id } = req.params as { id: string };
    if (!registry.get(id)) {
      return { ok: false, error: 'Runtime 不存在' };
    }
    return { ok: true, models: getRuntimeModels(id) };
  });
}
