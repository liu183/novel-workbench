import fs from 'node:fs';
import Database from 'better-sqlite3';
import type { AppConfig, SqliteDatabase } from './types.js';

/**
 * 初始化 SQLite 数据库，创建数据目录并启用 WAL 与外键约束。
 */
export function initDatabase(config: AppConfig): SqliteDatabase {
  fs.mkdirSync(config.dataDir, { recursive: true });

  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}
