import { loadConfig } from './config.js';
import { initDatabase } from './db.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const db = initDatabase(config);
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
