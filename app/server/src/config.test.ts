import { describe, it, expect, afterEach } from 'vitest';
import { loadConfig } from './config.js';

describe('loadConfig', () => {
  const original = { port: process.env.PORT, host: process.env.HOST, dataDir: process.env.DATA_DIR };

  afterEach(() => {
    process.env.PORT = original.port;
    process.env.HOST = original.host;
    process.env.DATA_DIR = original.dataDir;
  });

  it('默认端口为 3000', () => {
    delete process.env.PORT;
    expect(loadConfig().port).toBe(3000);
  });

  it('读取 PORT 环境变量', () => {
    process.env.PORT = '4000';
    expect(loadConfig().port).toBe(4000);
  });

  it('读取 DATA_DIR 环境变量', () => {
    process.env.DATA_DIR = '/tmp/test-data';
    expect(loadConfig().dbPath).toContain('novel-workbench.db');
  });
});
