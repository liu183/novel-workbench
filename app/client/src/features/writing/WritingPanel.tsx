import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Sparkles, PenLine } from 'lucide-react';
import {
  fetchNovel,
  fetchChapters,
  createChapter,
  streamWriteChapter,
} from '../../lib/api';
import { useAppStore } from '../../stores/app';

export function WritingPanel() {
  const currentNovelId = useAppStore((s) => s.currentNovelId);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const qc = useQueryClient();

  const { data: novel } = useQuery({
    queryKey: ['novel', currentNovelId],
    queryFn: () => fetchNovel(currentNovelId!),
    enabled: !!currentNovelId,
  });
  const { data: chapters = [] } = useQuery({
    queryKey: ['chapters', currentNovelId],
    queryFn: () => fetchChapters(currentNovelId!),
    enabled: !!currentNovelId,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddChapter, setShowAddChapter] = useState(false);

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [conflict, setConflict] = useState('');
  const [hook, setHook] = useState('');
  const [cast, setCast] = useState('');

  const [writing, setWriting] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [writeMsg, setWriteMsg] = useState('');

  if (!currentNovelId || !novel) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <PenLine />
        </div>
        <p className="muted">未选择作品，请先在工作区选择或创建作品。</p>
        <button className="btn" onClick={() => setActiveModule('workspace')}>
          <ArrowLeft size={15} />
          前往工作区
        </button>
      </div>
    );
  }

  const selected = chapters.find((c) => c.id === selectedId) ?? null;

  const selectChapter = (id: string) => {
    setSelectedId(id);
    setStreamContent('');
    setWriteMsg('');
  };

  const handleCreateChapter = async (e: FormEvent) => {
    e.preventDefault();
    const chapter = await createChapter(novel.id, { title, goal, conflict, hook, cast });
    await qc.invalidateQueries({ queryKey: ['chapters', novel.id] });
    setTitle('');
    setGoal('');
    setConflict('');
    setHook('');
    setCast('');
    setShowAddChapter(false);
    selectChapter(chapter.id);
  };

  const handleWrite = async () => {
    if (!selected) return;
    setWriting(true);
    setStreamContent('');
    setWriteMsg('');

    try {
      await streamWriteChapter(selected.id, undefined, (e) => {
        if (e.type === 'start') setWriteMsg(e.message ?? '');
        else if (e.type === 'delta') setStreamContent((prev) => prev + (e.content ?? ''));
        else if (e.type === 'done') setWriteMsg(`写稿完成 · ${e.runtimeName ?? ''} ${e.model ?? ''}`);
        else if (e.type === 'error') setWriteMsg(e.message ?? '写稿失败');
      });
      await qc.invalidateQueries({ queryKey: ['chapters', novel.id] });
    } catch (err) {
      setWriteMsg((err as Error).message);
    } finally {
      setWriting(false);
    }
  };

  return (
    <div className="writing-panel">
      <div className="panel-toolbar">
        <div>
          <h2>{novel.title}</h2>
          <p className="muted">
            {novel.genre ?? '未分类'} · 每章 {novel.wordsPerChapter ?? 2000} 字
            {novel.premise ? ` · ${novel.premise}` : ''}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => setActiveModule('workspace')}>
          <ArrowLeft size={15} />
          返回工作区
        </button>
      </div>

      <div className="writing-layout">
        <aside className="card chapter-list">
          <div className="chapter-list-head">
            <span>章节</span>
            <button className="btn btn-sm btn-ghost" onClick={() => setShowAddChapter((v) => !v)}>
              <Plus size={14} />
              章节
            </button>
          </div>

          {showAddChapter && (
            <form className="chapter-form" onSubmit={handleCreateChapter}>
              <input className="input" placeholder="章节标题" value={title} onChange={(e) => setTitle(e.target.value)} />
              <input className="input" placeholder="主角小目标" value={goal} onChange={(e) => setGoal(e.target.value)} />
              <input className="input" placeholder="冲突与转折" value={conflict} onChange={(e) => setConflict(e.target.value)} />
              <input className="input" placeholder="悬念钩子" value={hook} onChange={(e) => setHook(e.target.value)} />
              <input className="input" placeholder="出场人物" value={cast} onChange={(e) => setCast(e.target.value)} />
              <button className="btn btn-sm" type="submit">
                创建章节
              </button>
            </form>
          )}

          {chapters.length === 0 ? (
            <p className="muted">暂无章节</p>
          ) : (
            chapters.map((c) => (
              <button
                key={c.id}
                className={`chapter-item ${selectedId === c.id ? 'active' : ''}`}
                onClick={() => selectChapter(c.id)}
              >
                <span className="chapter-seq">第{c.seq}章</span>
                <span className="chapter-title">{c.title || '未命名'}</span>
              </button>
            ))
          )}
        </aside>

        <div className="editor-area">
          {!selected ? (
            <div className="empty">
              <div className="empty-icon">
                <PenLine />
              </div>
              <p className="muted">选择左侧章节开始创作</p>
            </div>
          ) : (
            <>
              <div className="card blueprint">
                <div className="blueprint-grid">
                  <div>
                    <span className="bp-label">主角小目标</span>
                    <div className="bp-value">{selected.goal || '—'}</div>
                  </div>
                  <div>
                    <span className="bp-label">冲突与转折</span>
                    <div className="bp-value">{selected.conflict || '—'}</div>
                  </div>
                  <div>
                    <span className="bp-label">悬念钩子</span>
                    <div className="bp-value">{selected.hook || '—'}</div>
                  </div>
                  <div>
                    <span className="bp-label">出场人物</span>
                    <div className="bp-value">{selected.cast || '—'}</div>
                  </div>
                </div>
                <button className="btn" onClick={handleWrite} disabled={writing}>
                  <Sparkles size={15} />
                  {writing ? '写稿中…' : 'AI 写稿'}
                </button>
              </div>

              {writeMsg && <div className="toast">{writeMsg}</div>}

              <div className="card content-box">
                {streamContent || selected.content ? (
                  <pre className="chapter-content">{streamContent || selected.content}</pre>
                ) : (
                  <p className="muted">完善上方蓝图后，点击「AI 写稿」生成正文</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
