import type { SqliteDatabase } from './types.js';

/**
 * 初始化数据库表结构。
 * M3 将章节蓝图字段合并进 chapter 表（与章节 1:1），后续里程碑如需独立蓝图表再拆分。
 */
export function initSchema(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS novel (
      id                TEXT PRIMARY KEY,
      title             TEXT NOT NULL,
      genre             TEXT,
      audience          TEXT,
      language          TEXT DEFAULT 'zh',
      total_chapters    INTEGER,
      words_per_chapter INTEGER,
      premise           TEXT,
      outline           TEXT,
      status            TEXT DEFAULT 'writing',
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chapter (
      id         TEXT PRIMARY KEY,
      novel_id   TEXT NOT NULL,
      seq        INTEGER NOT NULL,
      title      TEXT,
      goal       TEXT,
      conflict   TEXT,
      hook       TEXT,
      cast       TEXT,
      status     TEXT DEFAULT 'draft',
      summary    TEXT,
      content    TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (novel_id) REFERENCES novel(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chapter_novel ON chapter(novel_id, seq);

    -- 书源（可配置的搜索下载源）
    CREATE TABLE IF NOT EXISTS book_source (
      id          TEXT PRIMARY KEY,
      name        TEXT,
      type        TEXT,
      provider    TEXT,
      config      TEXT,
      priority    INTEGER,
      enabled     INTEGER DEFAULT 1,
      created_at  INTEGER
    );

    -- 拆文素材（已下载书目 / 手动导入文本）
    CREATE TABLE IF NOT EXISTS deconstruct_source (
      id          TEXT PRIMARY KEY,
      title       TEXT,
      author      TEXT,
      source      TEXT,
      format      TEXT,
      file_path   TEXT,
      word_count  INTEGER,
      status      TEXT,
      meta        TEXT,
      created_at  INTEGER
    );

    -- 拆文报告（分析结果 JSON）
    CREATE TABLE IF NOT EXISTS deconstruct_report (
      id          TEXT PRIMARY KEY,
      source_id   TEXT,
      title       TEXT,
      analysis    TEXT,
      created_at  INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_report_source ON deconstruct_report(source_id);

    -- 手动添加的 Agent Runtime（持久化，重启不丢失）
    CREATE TABLE IF NOT EXISTS runtime (
      id            TEXT PRIMARY KEY,
      name          TEXT,
      type          TEXT,
      provider      TEXT,
      base_url      TEXT,
      capabilities  TEXT,
      status        TEXT,
      config        TEXT,
      created_at    INTEGER
    );

    -- 章节稿件版本历史
    CREATE TABLE IF NOT EXISTS draft (
      id          TEXT PRIMARY KEY,
      chapter_id  TEXT,
      version     INTEGER,
      kind        TEXT,
      content     TEXT,
      created_at  INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_draft_chapter ON draft(chapter_id, version);

    -- 审稿意见
    CREATE TABLE IF NOT EXISTS review (
      id          TEXT PRIMARY KEY,
      chapter_id  TEXT,
      items       TEXT,
      created_at  INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_review_chapter ON review(chapter_id);

    -- 知识库文档
    CREATE TABLE IF NOT EXISTS knowledge_doc (
      id          TEXT PRIMARY KEY,
      novel_id    TEXT,
      title       TEXT,
      content     TEXT,
      created_at  INTEGER
    );
  `);
}
