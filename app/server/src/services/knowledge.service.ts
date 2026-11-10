import { randomUUID } from 'node:crypto';
import { getDb } from '../db.js';

export interface KnowledgeDoc {
  id: string;
  novelId?: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface SearchHit {
  id: string;
  title: string;
  excerpt: string;
  matches: number;
}

const DOC_COLUMNS = `id, novel_id AS novelId, title, content, created_at AS createdAt`;

export function createDoc(input: {
  title: string;
  content: string;
  novelId?: string;
}): KnowledgeDoc {
  const doc: KnowledgeDoc = {
    id: randomUUID(),
    novelId: input.novelId,
    title: input.title,
    content: input.content,
    createdAt: Date.now(),
  };
  getDb()
    .prepare(
      `INSERT INTO knowledge_doc (id, novel_id, title, content, created_at)
       VALUES (@id, @novelId, @title, @content, @createdAt)`,
    )
    .run(doc);
  return doc;
}

export function listDocs(novelId?: string): Array<Omit<KnowledgeDoc, 'content'> & { chars: number }> {
  const rows = (
    novelId
      ? getDb()
          .prepare(`SELECT ${DOC_COLUMNS} FROM knowledge_doc WHERE novel_id = ? ORDER BY created_at DESC`)
          .all(novelId)
      : getDb()
          .prepare(`SELECT ${DOC_COLUMNS} FROM knowledge_doc ORDER BY created_at DESC`)
          .all()
  ) as KnowledgeDoc[];

  return rows.map(({ content, ...rest }) => ({ ...rest, chars: content.length }));
}

export function getDoc(id: string): KnowledgeDoc | undefined {
  return getDb()
    .prepare(`SELECT ${DOC_COLUMNS} FROM knowledge_doc WHERE id = ?`)
    .get(id) as KnowledgeDoc | undefined;
}

export function deleteDoc(id: string): boolean {
  return getDb().prepare('DELETE FROM knowledge_doc WHERE id = ?').run(id).changes > 0;
}

/** 全文检索：标题 + 正文关键词匹配，返回上下文片段。 */
export function searchDocs(query: string, novelId?: string): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  const like = `%${q}%`;

  const rows = (
    novelId
      ? getDb()
          .prepare(
            `SELECT ${DOC_COLUMNS} FROM knowledge_doc
             WHERE novel_id = ? AND (title LIKE ? OR content LIKE ?)
             ORDER BY created_at DESC LIMIT 50`,
          )
          .all(novelId, like, like)
      : getDb()
          .prepare(
            `SELECT ${DOC_COLUMNS} FROM knowledge_doc
             WHERE title LIKE ? OR content LIKE ?
             ORDER BY created_at DESC LIMIT 50`,
          )
          .all(like, like)
  ) as KnowledgeDoc[];

  return rows.map((doc) => {
    const idx = doc.content.indexOf(q);
    const start = Math.max(0, idx - 50);
    const excerpt = (idx >= 0 ? doc.content.slice(start, start + 160) : doc.content.slice(0, 160))
      .replace(/\n/g, ' ')
      .trim();
    const matches = doc.content.split(q).length - 1;
    return { id: doc.id, title: doc.title, excerpt, matches: Math.max(matches, 1) };
  });
}
