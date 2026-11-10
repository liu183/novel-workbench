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
  `);
}
