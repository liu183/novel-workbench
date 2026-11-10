import { randomUUID } from 'node:crypto';
import { getDb } from '../db.js';
import { getChapter, updateChapter } from './chapter.service.js';
import { selectRuntime, createRuntime } from '../runtime/index.js';

export interface ReviewItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ReviewRecord {
  id: string;
  chapterId: string;
  items: ReviewItem[];
  createdAt: number;
}

const REVIEW_COLUMNS = `id, chapter_id AS chapterId, items, created_at AS createdAt`;
const DRAFT_COLUMNS = `id, chapter_id AS chapterId, version, kind, content, created_at AS createdAt`;

/** 解析 AI 返回的审稿意见（容忍 Markdown 代码块 / 纯文本行）。 */
export function parseReviewItems(raw: string): ReviewItem[] {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .map((x, i) => ({
          id: String(i + 1),
          text: typeof x === 'string' ? x : String((x as { text?: string })?.text ?? ''),
          checked: false,
        }))
        .filter((it) => it.text.length > 0)
        .slice(0, 10);
    }
  } catch {
    // 降级为按行解析
  }

  return cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 4)
    .slice(0, 10)
    .map((l, i) => ({
      id: String(i + 1),
      text: l.replace(/^[\d一二三四五六七八九十]+[.、)．]\s*/, '').replace(/^[-*]\s*/, ''),
      checked: false,
    }));
}

/** AI 审稿：生成逐条可勾选的修改意见。 */
export async function reviewChapter(
  chapterId: string,
  runtimeId?: string,
): Promise<ReviewRecord> {
  const chapter = getChapter(chapterId);
  if (!chapter) throw new Error('章节不存在');
  if (!chapter.content?.trim()) throw new Error('章节尚无正文，请先写稿');

  const target = selectRuntime(runtimeId);
  if (!target) throw new Error('没有可用的 AI 运行时，请先在「AI 运行时」配置');

  const prompt = [
    '你是资深网文编辑，请审阅以下章节正文，列出 3-6 条具体、可执行的修改意见，聚焦情节逻辑、人物一致性、节奏张弛与文字表达。',
    '只输出 JSON 数组，格式如：["意见一","意见二"]，不要任何解释文字。',
    '',
    `章节标题：${chapter.title ?? '未命名'}`,
    chapter.goal ? `主角小目标：${chapter.goal}` : '',
    '',
    '正文：',
    chapter.content.slice(0, 8000),
  ]
    .filter(Boolean)
    .join('\n');

  const runtime = createRuntime(target);
  const resp = await runtime.chat({ messages: [{ role: 'user', content: prompt }] });
  const items = parseReviewItems(resp.content);
  if (items.length === 0) throw new Error('AI 未返回有效的审稿意见');

  const record: ReviewRecord = {
    id: randomUUID(),
    chapterId,
    items,
    createdAt: Date.now(),
  };

  getDb()
    .prepare(`INSERT INTO review (id, chapter_id, items, created_at) VALUES (@id, @chapterId, @items, @createdAt)`)
    .run({ ...record, items: JSON.stringify(items) });

  return record;
}

export function listReviews(chapterId: string): ReviewRecord[] {
  const rows = getDb()
    .prepare(`SELECT ${REVIEW_COLUMNS} FROM review WHERE chapter_id = ? ORDER BY created_at DESC`)
    .all(chapterId) as Array<{ id: string; chapterId: string; items: string; createdAt: number }>;

  return rows.map((r) => ({ ...r, items: JSON.parse(r.items) as ReviewItem[] }));
}

/** 按勾选意见修稿；旧稿存入版本历史，不直接丢弃。 */
export async function reviseChapter(
  chapterId: string,
  selectedTexts: string[],
  reviewId: string | undefined,
  runtimeId?: string,
): Promise<{ content: string; version: number }> {
  const chapter = getChapter(chapterId);
  if (!chapter) throw new Error('章节不存在');
  if (!chapter.content?.trim()) throw new Error('章节尚无正文');

  let opinions = selectedTexts;
  if (opinions.length === 0 && reviewId) {
    const record = listReviews(chapterId).find((r) => r.id === reviewId);
    opinions = (record?.items ?? []).filter((i) => i.checked).map((i) => i.text);
  }
  if (opinions.length === 0) throw new Error('请至少勾选一条修改意见');

  const target = selectRuntime(runtimeId);
  if (!target) throw new Error('没有可用的 AI 运行时');

  const prompt = [
    '你是网文作者，请根据以下修改意见重写章节正文。要求：保留原有情节主线与人物设定，仅针对意见做针对性修改。',
    '直接输出修改后的完整正文，不要解释、不要标题、不要 markdown 标记。',
    '',
    '修改意见：',
    ...opinions.map((t, i) => `${i + 1}. ${t}`),
    '',
    '原文：',
    chapter.content.slice(0, 8000),
  ].join('\n');

  const runtime = createRuntime(target);
  const resp = await runtime.chat({ messages: [{ role: 'user', content: prompt }] });
  const newContent = resp.content.trim();
  if (!newContent) throw new Error('AI 未返回修稿内容');

  // 旧稿归档
  const version = (getDb()
    .prepare('SELECT COALESCE(MAX(version), 0) AS v FROM draft WHERE chapter_id = ?')
    .get(chapterId) as { v: number }).v + 1;

  getDb()
    .prepare(`INSERT INTO draft (id, chapter_id, version, kind, content, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(randomUUID(), chapterId, version, 'pre-revise', chapter.content, Date.now());

  updateChapter(chapterId, { content: newContent, status: 'revising' });

  return { content: newContent, version };
}

export function listDrafts(chapterId: string) {
  return getDb()
    .prepare(`SELECT ${DRAFT_COLUMNS} FROM draft WHERE chapter_id = ? ORDER BY version DESC`)
    .all(chapterId);
}
