import { randomUUID } from 'node:crypto';
import { getDb } from '../db.js';

export interface NovelInput {
  title: string;
  genre?: string;
  audience?: string;
  language?: string;
  totalChapters?: number;
  wordsPerChapter?: number;
  premise?: string;
  outline?: string;
}

export interface Novel {
  id: string;
  title: string;
  genre?: string;
  audience?: string;
  language: string;
  totalChapters?: number;
  wordsPerChapter?: number;
  premise?: string;
  outline?: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

// 将 snake_case 列名映射为 camelCase（通过 SQL 别名）
const NOVEL_COLUMNS = `
  id, title, genre, audience, language,
  total_chapters AS totalChapters,
  words_per_chapter AS wordsPerChapter,
  premise, outline, status,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export function listNovels(): Novel[] {
  const db = getDb();
  return db
    .prepare(`SELECT ${NOVEL_COLUMNS} FROM novel ORDER BY updated_at DESC`)
    .all() as Novel[];
}

export function getNovel(id: string): Novel | undefined {
  const db = getDb();
  return db.prepare(`SELECT ${NOVEL_COLUMNS} FROM novel WHERE id = ?`).get(id) as Novel | undefined;
}

export function createNovel(input: NovelInput): Novel {
  const db = getDb();
  const now = Date.now();
  const novel: Novel = {
    id: randomUUID(),
    title: input.title,
    genre: input.genre,
    audience: input.audience,
    language: input.language ?? 'zh',
    totalChapters: input.totalChapters,
    wordsPerChapter: input.wordsPerChapter,
    premise: input.premise,
    outline: input.outline,
    status: 'writing',
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO novel (
      id, title, genre, audience, language, total_chapters,
      words_per_chapter, premise, outline, status, created_at, updated_at
    ) VALUES (
      @id, @title, @genre, @audience, @language, @totalChapters,
      @wordsPerChapter, @premise, @outline, @status, @createdAt, @updatedAt
    )`,
  ).run(novel);

  return novel;
}

export function updateNovel(id: string, input: Partial<NovelInput>): Novel | undefined {
  const existing = getNovel(id);
  if (!existing) return undefined;

  const updated: Novel = {
    ...existing,
    ...input,
    updatedAt: Date.now(),
  };

  getDb()
    .prepare(
      `UPDATE novel SET
        title = @title, genre = @genre, audience = @audience, language = @language,
        total_chapters = @totalChapters, words_per_chapter = @wordsPerChapter,
        premise = @premise, outline = @outline, updated_at = @updatedAt
      WHERE id = @id`,
    )
    .run(updated);

  return updated;
}

export function deleteNovel(id: string): boolean {
  const result = getDb().prepare('DELETE FROM novel WHERE id = ?').run(id);
  return result.changes > 0;
}
