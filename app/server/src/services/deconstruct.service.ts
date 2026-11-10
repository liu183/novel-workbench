import { randomUUID } from 'node:crypto';
import { getDb } from '../db.js';
import { getSourceRecord, getSourceText } from './books.service.js';
import { analyzeText, type AnalysisResult } from './analyzer.js';
import { createNovel, type Novel } from './novel.service.js';
import { selectRuntime, createRuntime } from '../runtime/index.js';

export interface DeconstructReport {
  id: string;
  sourceId: string;
  title: string;
  analysis: AnalysisResult;
  createdAt: number;
}

const REPORT_COLUMNS = `id, source_id AS sourceId, title, analysis, created_at AS createdAt`;

/** 分析素材 → 本地统计 + 可选 AI 文风总结 → 落库报告。 */
export async function analyzeSource(sourceId: string): Promise<DeconstructReport> {
  const source = getSourceRecord(sourceId);
  if (!source) throw new Error('素材不存在');

  const text = getSourceText(sourceId);
  const analysis = analyzeText(text, source.title);

  const aiSummary = await maybeAiSummary(text, source.title);
  if (aiSummary) {
    analysis.aiEnhanced = true;
    analysis.aiSummary = aiSummary;
  }

  const report: DeconstructReport = {
    id: randomUUID(),
    sourceId,
    title: source.title,
    analysis,
    createdAt: Date.now(),
  };

  getDb()
    .prepare(
      `INSERT INTO deconstruct_report (id, source_id, title, analysis, created_at)
       VALUES (@id, @sourceId, @title, @analysis, @createdAt)`,
    )
    .run({ ...report, analysis: JSON.stringify(analysis) });

  return report;
}

/**
 * 有 HTTP 型 Runtime 时叠加一段 AI 文风分析；失败静默降级为纯本地统计。
 * 注意：不自动调用 Agent CLI（子进程耗时较长），避免拖慢拆文分析。
 */
async function maybeAiSummary(text: string, title: string): Promise<string | undefined> {
  const target = selectRuntime();
  if (!target || target.type === 'agent-cli') return undefined;

  try {
    const runtime = createRuntime(target);
    const excerpt = text.slice(0, 2000);
    const resp = await runtime.chat({
      messages: [
        {
          role: 'user',
          content: `请用 200 字以内分析小说《${title}》以下片段的文风特点与叙事结构特点：\n\n${excerpt}`,
        },
      ],
      model: target.models[0],
    });
    return resp.content.trim() || undefined;
  } catch {
    return undefined;
  }
}

export function getReport(id: string): DeconstructReport | undefined {
  const row = getDb()
    .prepare(`SELECT ${REPORT_COLUMNS} FROM deconstruct_report WHERE id = ?`)
    .get(id) as
    | { id: string; sourceId: string; title: string; analysis: string; createdAt: number }
    | undefined;
  if (!row) return undefined;
  return { ...row, analysis: JSON.parse(row.analysis) as AnalysisResult };
}

export function listReports(sourceId?: string): DeconstructReport[] {
  const rows = sourceId
    ? (getDb()
        .prepare(`SELECT ${REPORT_COLUMNS} FROM deconstruct_report WHERE source_id = ? ORDER BY created_at DESC`)
        .all(sourceId) as Array<{ id: string; sourceId: string; title: string; analysis: string; createdAt: number }>)
    : (getDb()
        .prepare(`SELECT ${REPORT_COLUMNS} FROM deconstruct_report ORDER BY created_at DESC`)
        .all() as Array<{ id: string; sourceId: string; title: string; analysis: string; createdAt: number }>);

  return rows.map((r) => ({ ...r, analysis: JSON.parse(r.analysis) as AnalysisResult }));
}

/** 反哺创作：将拆文结论转为新作品设定。 */
export function convertToNovel(reportId: string): Novel | undefined {
  const report = getReport(reportId);
  if (!report) return undefined;
  const a = report.analysis;

  return createNovel({
    title: `${a.title} · 仿写`,
    genre: '仿写',
    premise:
      a.aiSummary ??
      `仿写自《${a.title}》：共 ${a.chapterCount} 章结构，对话占比约 ${a.dialogueRatio}%，平均句长 ${a.avgSentenceLength} 字。`,
    wordsPerChapter: a.avgChapterChars || 2000,
  });
}
