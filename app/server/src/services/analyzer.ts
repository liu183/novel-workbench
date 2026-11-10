import { splitChapters } from '../booksource/parser.js';

export interface ChapterStat {
  title: string;
  chars: number;
  paragraphCount: number;
}

export interface WordFreq {
  word: string;
  count: number;
}

export interface AnalysisResult {
  title: string;
  totalChars: number;
  chapterCount: number;
  paragraphCount: number;
  avgChapterChars: number;
  dialogueRatio: number;
  avgSentenceLength: number;
  maxSentenceLength: number;
  chapters: ChapterStat[];
  rhythm: number[];
  topWords: WordFreq[];
  sentenceDist: { short: number; medium: number; long: number };
  aiEnhanced: boolean;
  aiSummary?: string;
  generatedAt: number;
}

const COMMON_BIGRAMS = new Set([
  '的了', '是了', '我们', '他们', '一个', '自己', '这个', '那个', '什么',
  '可以', '已经', '因为', '所以', '没有', '就是', '不是', '于是', '时候',
  '起来', '出来', '知道', '看到', '虽然', '但是', '如果', '这样', '那样',
]);

/**
 * 本地文本分析（不依赖 AI）：章节切分、字数、对话占比、句长、节奏、高频词。
 * 这是拆文报告的基础层，有 AI Runtime 时再叠加文风总结。
 */
export function analyzeText(text: string, title: string): AnalysisResult {
  const chapters = splitChapters(text);
  const clean = text.replace(/\s/g, '');
  const totalChars = clean.length;

  // 对话占比（中英文引号）
  const dialogues = text.match(/[「“"'][^」”"']{1,300}[」”"']/g) ?? [];
  const dialogueChars = dialogues.reduce(
    (sum, m) => sum + m.replace(/\s/g, '').length,
    0,
  );

  // 句子切分与句长
  const sentences = text
    .split(/[。！？!?；;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceLengths = sentences.map((s) => s.replace(/\s/g, '').length);
  const avgSentenceLength = sentenceLengths.length
    ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length)
    : 0;

  // 高频 2-gram（中文无分词库时的近似用词特征）
  const bigrams = new Map<string, number>();
  const plain = clean.replace(/[^\u4e00-\u9fa5]/g, '');
  for (let i = 0; i < plain.length - 1; i += 1) {
    const g = plain.slice(i, i + 2);
    bigrams.set(g, (bigrams.get(g) ?? 0) + 1);
  }
  const topWords = [...bigrams.entries()]
    .filter(([w, c]) => c >= 3 && !COMMON_BIGRAMS.has(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ word, count }));

  const chapterStats: ChapterStat[] = chapters.map((c) => ({
    title: c.title,
    chars: c.content.replace(/\s/g, '').length,
    paragraphCount: c.content.split(/\n\s*\n/).filter((p) => p.trim()).length || 1,
  }));

  return {
    title,
    totalChars,
    chapterCount: chapters.length,
    paragraphCount: text.split(/\n\s*\n/).filter((p) => p.trim()).length || 1,
    avgChapterChars: chapters.length
      ? Math.round(totalChars / chapters.length)
      : totalChars,
    dialogueRatio: totalChars
      ? Math.round((dialogueChars / totalChars) * 100)
      : 0,
    avgSentenceLength,
    maxSentenceLength: sentenceLengths.length ? Math.max(...sentenceLengths) : 0,
    chapters: chapterStats,
    rhythm: chapterStats.map((c) => c.chars),
    topWords,
    sentenceDist: {
      short: sentenceLengths.filter((l) => l <= 15).length,
      medium: sentenceLengths.filter((l) => l > 15 && l <= 40).length,
      long: sentenceLengths.filter((l) => l > 40).length,
    },
    aiEnhanced: false,
    generatedAt: Date.now(),
  };
}
