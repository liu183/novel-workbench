import { describe, it, expect } from 'vitest';
import { analyzeText } from './analyzer.js';

const SAMPLE = `
第一章 初入江湖
李小白走出山门，天空下着细雨。他回头望了一眼，心中五味杂陈。
「师父，我一定会回来的。」他低声说道。
山路漫长，脚下的青石被雨水洗得发亮。远处的城镇隐隐传来钟声。

第二章 客栈惊变
夜色深沉，客栈里灯火昏黄。李小白刚坐下，便听见门外传来急促的马蹄声。
「谁？」他猛地站起身，手已按在剑柄上。
门被推开，一个黑衣人走了进来，浑身是血。
「快走，他们追来了。」

第三章 月下追兵
月光如水，照在林间小道上。三骑快马疾驰而过。
李小白藏在树后，屏住呼吸。他知道，这一关躲不过去了。
`;

describe('analyzer', () => {
  it('切分章节并统计字数', () => {
    const a = analyzeText(SAMPLE, '测试');
    expect(a.chapterCount).toBe(3);
    expect(a.totalChars).toBeGreaterThan(100);
    expect(a.chapters[0].title).toContain('第一章');
  });

  it('计算对话占比与句长', () => {
    const a = analyzeText(SAMPLE, '测试');
    expect(a.dialogueRatio).toBeGreaterThan(0);
    expect(a.avgSentenceLength).toBeGreaterThan(0);
  });

  it('输出节奏序列与高频词', () => {
    const a = analyzeText(SAMPLE, '测试');
    expect(a.rhythm.length).toBe(3);
    expect(a.sentenceDist.short + a.sentenceDist.medium + a.sentenceDist.long).toBeGreaterThan(0);
  });
});
