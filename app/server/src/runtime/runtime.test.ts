import { describe, it, expect } from 'vitest';
import { canConnect } from './scanner/port-scan.js';
import { commandExists } from './scanner/command-scan.js';

describe('runtime scanner', () => {
  it('canConnect 对关闭的端口返回 false', async () => {
    const open = await canConnect('127.0.0.1', 1, 500);
    expect(open).toBe(false);
  });

  it('commandExists 识别系统命令 node', async () => {
    expect(await commandExists('node')).toBe(true);
  });

  it('commandExists 对不存在的命令返回 false', async () => {
    expect(await commandExists('definitely-not-a-real-cmd-xyz')).toBe(false);
  });
});
