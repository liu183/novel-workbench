import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDatabase } from '../db.js';
import { createNovel, listNovels, getNovel } from './novel.service.js';
import { createChapter, listChapters } from './chapter.service.js';
import type { AppConfig } from '../types.js';

beforeAll(() => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-test-'));
  const config: AppConfig = {
    port: 3000,
    host: '127.0.0.1',
    dataDir: testDir,
    dbPath: path.join(testDir, 'test.db'),
    version: 'test',
  };
  initDatabase(config);
});

describe('novel & chapter service', () => {
  it('创建并列出作品', () => {
    const novel = createNovel({ title: '测试作品', genre: '都市' });
    expect(novel.title).toBe('测试作品');
    expect(listNovels().length).toBeGreaterThan(0);
    expect(getNovel(novel.id)?.title).toBe('测试作品');
  });

  it('创建章节并自动排序', () => {
    const novel = createNovel({ title: '章节测试' });
    const c1 = createChapter(novel.id, { title: '第一章' });
    const c2 = createChapter(novel.id, { title: '第二章' });
    expect(c1?.seq).toBe(1);
    expect(c2?.seq).toBe(2);
    expect(listChapters(novel.id).length).toBe(2);
  });
});
