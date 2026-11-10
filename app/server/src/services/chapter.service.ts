import { randomUUID } from 'node:crypto';
import { getDb } from '../db.js';
import { getNovel } from './novel.service.js';

export interface ChapterInput {
  title?: string;
  goal?: string;
  conflict?: string;
  hook?: string;
  cast?: string;
}

export interface Chapter {
  id: string;
  novelId: string;
  seq: number;
  title?: string;
  goal?: string;
  conflict?: string;
  hook?: string;
  cast?: string;
  status: string;
  summary?: string;
  content?: string;
  createdAt: number;
  updatedAt: number;
}

// snake_case → camelCase（SQL 别名）
const CHAPTER_COLUMNS = `
  id,
  novel_id AS novelId,
  seq, title, goal, conflict, hook, "cast", status, summary, content,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

export function listChapters(novelId: string): Chapter[] {
  const db = getDb();
  return db
    .prepare(`SELECT ${CHAPTER_COLUMNS} FROM chapter WHERE novel_id = ? ORDER BY seq ASC`)
    .all(novelId) as Chapter[];
}

export function getChapter(id: string): Chapter | undefined {
  const db = getDb();
  return db.prepare(`SELECT ${CHAPTER_COLUMNS} FROM chapter WHERE id = ?`).get(id) as Chapter | undefined;
}

export function createChapter(novelId: string, input: ChapterInput): Chapter | undefined {
  if (!getNovel(novelId)) return undefined;

  const db = getDb();
  const now = Date.now();
  const nextSeq = (db
    .prepare('SELECT COALESCE(MAX(seq), 0) AS maxSeq FROM chapter WHERE novel_id = ?')
    .get(novelId) as { maxSeq: number }).maxSeq + 1;

  const chapter: Chapter = {
    id: randomUUID(),
    novelId,
    seq: nextSeq,
    title: input.title,
    goal: input.goal,
    conflict: input.conflict,
    hook: input.hook,
    cast: input.cast,
    status: 'draft',
    content: '',
    createdAt: now,
    updatedAt: now,
  };

  db.prepare(
    `INSERT INTO chapter (
      id, novel_id, seq, title, goal, conflict, hook, "cast", status, content, created_at, updated_at
    ) VALUES (
      @id, @novelId, @seq, @title, @goal, @conflict, @hook, @cast, @status, @content, @createdAt, @updatedAt
    )`,
  ).run(chapter);

  return chapter;
}

export function updateChapter(
  id: string,
  input: Partial<ChapterInput> & { content?: string; status?: string; summary?: string },
): Chapter | undefined {
  const existing = getChapter(id);
  if (!existing) return undefined;

  const updated: Chapter = {
    ...existing,
    ...input,
    updatedAt: Date.now(),
  };

  getDb()
    .prepare(
      `UPDATE chapter SET
        title = @title, goal = @goal, conflict = @conflict, hook = @hook,
        "cast" = @cast, status = @status, summary = @summary, content = @content,
        updated_at = @updatedAt
      WHERE id = @id`,
    )
    .run(updated);

  return updated;
}

export function deleteChapter(id: string): boolean {
  const result = getDb().prepare('DELETE FROM chapter WHERE id = ?').run(id);
  return result.changes > 0;
}
