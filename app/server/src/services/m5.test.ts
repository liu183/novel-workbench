import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDatabase } from '../db.js';
import { parseReviewItems } from './review.service.js';
import { exportNovel } from './export.service.js';
import { createNovel } from './novel.service.js';
import { createChapter } from './chapter.service.js';
import { createDoc, searchDocs, deleteDoc } from './knowledge.service.js';
import { registry, RuntimeRegistry } from '../runtime/index.js';
import type { AppConfig } from '../types.js';

beforeAll(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-m5-'));
  const config: AppConfig = {
    port: 3000,
    host: '127.0.0.1',
    dataDir: dir,
    dbPath: path.join(dir, 'test.db'),
    version: 'test',
  };
  initDatabase(config);
});

describe('审稿意见解析', () => {
  it('解析 JSON 数组', () => {
    const items = parseReviewItems('```json\n["节奏偏慢","动机不清"]\n```');
    expect(items.length).toBe(2);
    expect(items[0].text).toBe('节奏偏慢');
    expect(items[0].checked).toBe(false);
  });

  it('降级解析带序号的纯文本', () => {
    const items = parseReviewItems('1. 开头节奏偏慢\n2. 人物动机不清');
    expect(items.length).toBe(2);
    expect(items[0].text).toBe('开头节奏偏慢');
  });
});

describe('导出', () => {
  it('输出 Markdown 与 TXT', () => {
    const novel = createNovel({ title: '导出测试' });
    createChapter(novel.id, { title: '第一章' });

    const md = exportNovel(novel.id, 'md');
    expect(md.filename).toBe('导出测试.md');
    expect(md.content).toContain('# 导出测试');
    expect(md.content).toContain('## 第 1 章');

    const txt = exportNovel(novel.id, 'txt');
    expect(txt.filename).toBe('导出测试.txt');
    expect(txt.content).toContain('导出测试');
  });
});

describe('知识库', () => {
  it('导入、全文检索与删除', () => {
    const doc = createDoc({ title: '设定集', content: '主角李小白，师承青云门，擅长剑法。' });
    const hits = searchDocs('李小白');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].excerpt).toContain('李小白');
    expect(hits[0].matches).toBeGreaterThanOrEqual(1);
    expect(deleteDoc(doc.id)).toBe(true);
  });
});

describe('远程 Runtime 持久化', () => {
  it('落库后可在新实例中恢复（含凭据）', () => {
    const info = registry.addRemote({
      name: '测试服务',
      baseUrl: 'http://127.0.0.1:9999/v1',
      apiKey: 'sk-test-key',
    });
    expect(registry.get(info.id)?.name).toBe('测试服务');

    const fresh = new RuntimeRegistry();
    fresh.loadPersisted();
    expect(fresh.get(info.id)?.name).toBe('测试服务');
    expect(fresh.getCredentials(info.id)?.apiKey).toBe('sk-test-key');

    // 清理
    registry.removeRemote(info.id);
  });
});
