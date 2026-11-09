import type Database from 'better-sqlite3';

export interface AppConfig {
  port: number;
  host: string;
  dataDir: string;
  dbPath: string;
  version: string;
}

export type SqliteDatabase = Database.Database;

export interface AppDeps {
  db: SqliteDatabase;
  config: AppConfig;
}
