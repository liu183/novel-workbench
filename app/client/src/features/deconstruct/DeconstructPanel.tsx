import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Download,
  FileText,
  Sparkles,
  ArrowRight,
  BookOpen,
  Wand2,
} from 'lucide-react';
import {
  fetchBookSources,
  searchBooks,
  downloadBook,
  importBookText,
  fetchDeconstructSources,
  analyzeDeconstruct,
  fetchReports,
  convertReport,
  type BookResult,
  type DeconstructReport,
  type AnalysisResult,
} from '../../lib/api';
import { useAppStore } from '../../stores/app';

function KpiRow({ a }: { a: AnalysisResult }) {
  const items = [
    { label: '总字数', value: a.totalChars.toLocaleString() },
    { label: '章节数', value: a.chapterCount },
    { label: '平均章长', value: a.avgChapterChars.toLocaleString() },
    { label: '对话占比', value: `${a.dialogueRatio}%` },
    { label: '平均句长', value: `${a.avgSentenceLength} 字` },
  ];
  return (
    <div className="kpi-row">
      {items.map((it) => (
        <div className="kpi" key={it.label}>
          <div className="kpi-label">{it.label}</div>
          <div className="kpi-value">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function RhythmChart({ a }: { a: AnalysisResult }) {
  if (a.rhythm.length === 0) return null;
  const max = Math.max(...a.rhythm, 1);
  return (
    <div className="rhythm-chart">
      {a.rhythm.map((v, i) => (
        <div className="rhythm-col" key={i}>
          <div
            className="rhythm-bar"
            style={{ height: `${Math.max(6, Math.round((v / max) * 100))}%` }}
            title={`${a.chapters[i]?.title ?? `第${i + 1}节`} · ${v} 字`}
          />
          <div className="rhythm-label">{i + 1}</div>
        </div>
      ))}
    </div>
  );
}

function ReportView({
  report,
  onConvert,
  converting,
}: {
  report: DeconstructReport;
  onConvert: () => void;
  converting: boolean;
}) {
  const a = report.analysis;
  const totalSentences =
    a.sentenceDist.short + a.sentenceDist.medium + a.sentenceDist.long || 1;
  const pct = (n: number) => Math.round((n / totalSentences) * 100);

  return (
    <div className="card report-view">
      <div className="card-header">
        <div>
          <h3>拆文报告 · {a.title}</h3>
          <p className="muted">
            {new Date(a.generatedAt).toLocaleString('zh-CN')} 生成 ·{' '}
            {a.aiEnhanced ? '本地统计 + AI 文风分析' : '本地统计（未启用 AI 增强）'}
          </p>
        </div>
        <button className="btn btn-sm" onClick={onConvert} disabled={converting}>
          <Wand2 size={14} />
          {converting ? '转换中…' : '转为新作品'}
        </button>
      </div>

      <KpiRow a={a} />

      <div className="report-grid">
        <div className="report-block">
          <div className="report-block-title">章节节奏（各章字数）</div>
          <RhythmChart a={a} />
        </div>

        <div className="report-block">
          <div className="report-block-title">句式分布</div>
          <div className="dist-bar">
            <div className="dist-seg dist-short" style={{ width: `${pct(a.sentenceDist.short)}%` }} />
            <div className="dist-seg dist-medium" style={{ width: `${pct(a.sentenceDist.medium)}%` }} />
            <div className="dist-seg dist-long" style={{ width: `${pct(a.sentenceDist.long)}%` }} />
          </div>
          <div className="dist-legend">
            <span><i className="dist-dot dist-short" />短句 ≤15字 {pct(a.sentenceDist.short)}%</span>
            <span><i className="dist-dot dist-medium" />中句 16-40字 {pct(a.sentenceDist.medium)}%</span>
            <span><i className="dist-dot dist-long" />长句 &gt;40字 {pct(a.sentenceDist.long)}%</span>
          </div>

          <div className="report-block-title" style={{ marginTop: 20 }}>高频用词</div>
          <div className="word-cloud">
            {a.topWords.length > 0 ? (
              a.topWords.map((w) => (
                <span className="word-tag" key={w.word}>
                  {w.word} <em>{w.count}</em>
                </span>
              ))
            ) : (
              <span className="muted">样本较短，未提取到高频词</span>
            )}
          </div>
        </div>
      </div>

      {a.aiSummary && (
        <div className="ai-summary">
          <Sparkles size={16} />
          <div>
            <div className="ai-summary-title">AI 文风分析</div>
            <p>{a.aiSummary}</p>
          </div>
        </div>
      )}

      <div className="report-block-title" style={{ marginTop: 20 }}>章节结构</div>
      <div className="struct-list">
        {a.chapters.map((c, i) => (
          <div className="struct-row" key={i}>
            <span className="struct-seq">{String(i + 1).padStart(2, '0')}</span>
            <span className="struct-title">{c.title}</span>
            <span className="muted">{c.chars.toLocaleString()} 字 · {c.paragraphCount} 段</span>
          </div>
        ))}
      </div>

      <div className="report-actions">
        <button className="btn btn-ghost btn-sm" onClick={onConvert} disabled={converting}>
          <ArrowRight size={14} />
          反哺创作：按此结构新建作品
        </button>
      </div>
    </div>
  );
}

export function DeconstructPanel() {
  const qc = useQueryClient();
  const openNovel = useAppStore((s) => s.openNovel);

  const bookSources = useQuery({ queryKey: ['bookSources'], queryFn: fetchBookSources });
  const sources = useQuery({ queryKey: ['deconstructSources'], queryFn: fetchDeconstructSources });
  const reports = useQuery({ queryKey: ['reports'], queryFn: fetchReports });

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookResult[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [impTitle, setImpTitle] = useState('');
  const [impAuthor, setImpAuthor] = useState('');
  const [impContent, setImpContent] = useState('');

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const selectedReport =
    (reports.data ?? []).find((r) => r.id === selectedReportId) ?? (reports.data ?? [])[0];

  const refreshAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['deconstructSources'] }),
      qc.invalidateQueries({ queryKey: ['reports'] }),
    ]);
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setMessage(null);
    try {
      const res = await searchBooks(query.trim());
      setResults(res.results ?? []);
      setNotice(res.notice ?? null);
      if (res.error) setMessage(res.error);
    } catch {
      setMessage('搜索失败，请检查后端服务');
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async (book: BookResult) => {
    setDownloadingId(book.id);
    setMessage(null);
    try {
      const res = await downloadBook(book.id);
      if (res.ok) {
        setMessage(`已导入《${book.title}》，可在下方素材列表点击「拆解」`);
        await refreshAll();
      } else {
        setMessage(res.error ?? '下载失败');
      }
    } catch {
      setMessage('下载失败，请检查后端服务');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await importBookText({
        title: impTitle,
        author: impAuthor || undefined,
        content: impContent,
      });
      if (res.ok) {
        setMessage(`已导入《${impTitle}》`);
        setImpTitle('');
        setImpAuthor('');
        setImpContent('');
        setShowImport(false);
        await refreshAll();
      } else {
        setMessage(res.error ?? '导入失败');
      }
    } catch {
      setMessage('导入失败，请检查后端服务');
    }
  };

  const handleAnalyze = async (sourceId: string) => {
    setAnalyzingId(sourceId);
    setMessage(null);
    try {
      const res = await analyzeDeconstruct(sourceId);
      if (res.ok && res.report) {
        setSelectedReportId(res.report.id);
        setMessage('拆解完成，报告已生成');
        await refreshAll();
      } else {
        setMessage(res.error ?? '拆解失败');
      }
    } catch {
      setMessage('拆解失败，请检查后端服务');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleConvert = async () => {
    if (!selectedReport) return;
    setConverting(true);
    setMessage(null);
    try {
      const res = await convertReport(selectedReport.id);
      if (res.ok && res.novel) {
        setMessage(`已创建新作品《${res.novel.title}》，正在打开创作工作台`);
        await qc.invalidateQueries({ queryKey: ['novels'] });
        openNovel(res.novel.id);
      } else {
        setMessage(res.error ?? '转换失败');
      }
    } catch {
      setMessage('转换失败，请检查后端服务');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="deconstruct-panel">
      <div className="panel-toolbar">
        <div>
          <h2>拆文工作台</h2>
          <p className="muted">书名搜索下载 / 导入文本 → 结构、文风、节奏多维拆解</p>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowImport((v) => !v)}>
          <Plus size={15} />
          {showImport ? '收起' : '手动导入文本'}
        </button>
      </div>

      {message && <div className="toast">{message}</div>}

      {/* 搜索区 */}
      <div className="card search-card">
        <form className="search-row" onSubmit={handleSearch}>
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              className="input"
              placeholder="输入书名，如「江湖夜雨」「旧城往事」「星海征途」"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={searching || !query.trim()}>
            <Search size={15} />
            {searching ? '搜索中…' : '搜索'}
          </button>
        </form>

        <div className="source-chips">
          {(bookSources.data ?? []).map((s) => (
            <span className="source-chip" key={s.id}>
              <BookOpen size={12} />
              {s.name}
            </span>
          ))}
        </div>

        {notice && <div className="search-notice">{notice}</div>}

        {results.length > 0 && (
          <div className="book-grid">
            {results.map((b) => (
              <div className="book-card" key={b.id}>
                <div className="book-title">{b.title}</div>
                <div className="book-author muted">{b.author}</div>
                {b.intro && <div className="book-intro">{b.intro}</div>}
                <div className="book-footer">
                  <span className="badge badge-type">{b.source}</span>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleDownload(b)}
                    disabled={downloadingId === b.id}
                  >
                    <Download size={14} />
                    {downloadingId === b.id ? '下载中…' : '下载并导入'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 手动导入 */}
      {showImport && (
        <form className="card import-form" onSubmit={handleImport}>
          <div className="report-block-title">导入自有文本素材</div>
          <div className="import-row">
            <input className="input" placeholder="书名（必填）" value={impTitle} onChange={(e) => setImpTitle(e.target.value)} />
            <input className="input" placeholder="作者（选填）" value={impAuthor} onChange={(e) => setImpAuthor(e.target.value)} />
          </div>
          <textarea
            className="input textarea"
            style={{ minHeight: 140 }}
            placeholder="粘贴小说正文（建议包含「第一章」「第二章」等章节标题，便于结构拆解）"
            value={impContent}
            onChange={(e) => setImpContent(e.target.value)}
          />
          <button className="btn" type="submit" disabled={!impTitle.trim() || !impContent.trim()}>
            导入素材
          </button>
        </form>
      )}

      {/* 素材列表 */}
      <div className="section-title">
        <FileText size={15} />
        已导入素材（{(sources.data ?? []).length}）
      </div>
      <div className="card source-list">
        {(sources.data ?? []).length === 0 ? (
          <p className="muted">暂无素材，先搜索下载或手动导入文本</p>
        ) : (
          (sources.data ?? []).map((s) => (
            <div className="source-item" key={s.id}>
              <div className="source-info">
                <div className="source-name">{s.title}</div>
                <div className="muted">
                  {s.source} · {s.wordCount.toLocaleString()} 字 ·{' '}
                  {new Date(s.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div className="source-actions">
                <button
                  className="btn btn-sm"
                  onClick={() => handleAnalyze(s.id)}
                  disabled={analyzingId === s.id}
                >
                  <Sparkles size={14} />
                  {analyzingId === s.id ? '拆解中…' : '拆解'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 报告 */}
      {(reports.data ?? []).length > 0 && (
        <>
          <div className="section-title">
            <FileText size={15} />
            拆文报告（{(reports.data ?? []).length}）
          </div>
          <div className="report-tabs">
            {(reports.data ?? []).map((r) => (
              <button
                key={r.id}
                className={`report-tab ${selectedReport?.id === r.id ? 'active' : ''}`}
                onClick={() => setSelectedReportId(r.id)}
              >
                {r.title}
              </button>
            ))}
          </div>

          {selectedReport && (
            <ReportView
              report={selectedReport}
              onConvert={handleConvert}
              converting={converting}
            />
          )}
        </>
      )}
    </div>
  );
}
