import path from 'node:path';
import type { AppConfig } from './types.js';

/**
 * 加载运行配置。默认数据目录为 monorepo 顶层 `data/`，
 * 可通过环境变量 DATA_DIR 覆盖。
 *
 * 说明：pnpm 在包目录（app/server）内启动脚本，故 `../../data` 指向顶层 data。
 */
export function loadConfig(): AppConfig {
  const dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), '../../data');

  return {
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? '127.0.0.1',
    dataDir,
    dbPath: path.join(dataDir, 'novel-workbench.db'),
    version: '0.1.0',
  };
}
