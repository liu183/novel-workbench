import { getChapter, updateChapter, type Chapter } from './chapter.service.js';
import { getNovel, type Novel } from './novel.service.js';
import { selectRuntime, createRuntime, type AgentRuntimeInfo } from '../runtime/index.js';

export interface WriteResult {
  content: string;
  runtimeName: string;
  model: string;
}

/** 选择可用的写稿 Runtime（llm / remote / agent-cli 均可）。 */
export function selectWritableRuntime(runtimeId?: string): AgentRuntimeInfo | undefined {
  return selectRuntime(runtimeId);
}

/** 写稿：组装 prompt → 调用 Runtime → 保存正文。 */
export async function writeChapter(chapterId: string, runtimeId?: string): Promise<WriteResult> {
  const chapter = getChapter(chapterId);
  if (!chapter) throw new Error('章节不存在');
  const novel = getNovel(chapter.novelId);
  if (!novel) throw new Error('作品不存在');

  const target = selectWritableRuntime(runtimeId);
  if (!target) {
    throw new Error('没有可用的 AI 运行时，请先在「AI 运行时」扫描本机 Agent CLI 或添加远程服务');
  }

  const prompt = buildPrompt(novel, chapter);
  const runtime = createRuntime(target);

  const resp = await runtime.chat({
    messages: [{ role: 'user', content: prompt }],
    model: target.models[0],
    temperature: 0.8,
    maxTokens: novel.wordsPerChapter ? Math.round(novel.wordsPerChapter * 1.6) : undefined,
  });

  const content = resp.content.trim();
  if (!content) throw new Error('AI 未返回正文内容');
  updateChapter(chapterId, { content, status: 'draft' });

  return {
    content,
    runtimeName: target.name,
    model: resp.model || target.provider,
  };
}

export function buildPrompt(novel: Novel, chapter: Chapter): string {
  const lines = [
    '你是一位网络小说作家，请根据以下设定撰写本章正文，直接输出正文内容，不要任何解释或标题。',
    '',
    `作品：《${novel.title}》`,
    `类型：${novel.genre ?? '未指定'}`,
    novel.premise ? `故事前提：${novel.premise}` : '',
    '',
    '本章蓝图：',
    chapter.goal ? `- 主角小目标：${chapter.goal}` : '',
    chapter.conflict ? `- 冲突与转折：${chapter.conflict}` : '',
    chapter.hook ? `- 悬念钩子：${chapter.hook}` : '',
    chapter.cast ? `- 出场人物：${chapter.cast}` : '',
    '',
    `目标字数：约 ${novel.wordsPerChapter ?? 2000} 字。`,
  ];

  return lines.filter(Boolean).join('\n');
}
