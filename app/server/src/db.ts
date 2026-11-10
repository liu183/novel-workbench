import fs from 'node:fs';
import Database from 'better-sqlite3';
import type { AppConfig, SqliteDatabase } from './types.js';
import { initSchema } from './schema.js';

let dbInstance: SqliteDatabase | null = null;

/**
 * 初始化 SQLite 数据库：创建数据目录、建表，并缓存为进程级单例。
 */
export function initDatabase(config: AppConfig): SqliteDatabase {
  fs.mkdirSync(config.dataDir, { recursive: true });

  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  dbInstance = db;

  return db;
}

/** 获取已初始化的数据库单例（供领域服务使用）。 */
export function getDb(): SqliteDatabase {
  if (!dbInstance) throw new Error('数据库未初始化，请先调用 initDatabase');
  return dbInstance;
}
