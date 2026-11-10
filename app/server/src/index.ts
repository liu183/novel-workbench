import { loadConfig } from './config.js';
import { initDatabase } from './db.js';
import { buildApp } from './app.js';
import { registry, scanRuntimes } from './runtime/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = initDatabase(config);
  registry.loadPersisted();
  // 启动时自动扫描本机 Runtime，使 Agent CLI 无需手动点击即可参与 AI 任务
  await scanRuntimes();
  const app = await buildApp({ db, config });

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    db.close();
    process.exit(1);
  }
}

void main();
