import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Clock, Library } from 'lucide-react';
import { fetchNovels, createNovel, fetchHealth, fetchDbHealth, type Novel } from '../../lib/api';
import { useAppStore } from '../../stores/app';

function NovelCard({ novel, onOpen }: { novel: Novel; onOpen: () => void }) {
  const date = new Date(novel.updatedAt).toLocaleString('zh-CN');
  return (
    <button className="card novel-card" onClick={onOpen}>
      <div className="novel-card-title">{novel.title}</div>
      <div className="novel-card-meta">
        {novel.genre ?? '未分类'} · 每章 {novel.wordsPerChapter ?? 2000} 字
      </div>
      {novel.premise && <div className="novel-card-premise">{novel.premise}</div>}
      <div className="novel-card-footer">
        <Clock size={12} />
        更新于 {date}
      </div>
    </button>
  );
}

export function WorkspacePanel() {
  const qc = useQueryClient();
  const openNovel = useAppStore((s) => s.openNovel);

  const { data: novels = [], isLoading } = useQuery({ queryKey: ['novels'], queryFn: fetchNovels });
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth });
  const dbHealth = useQuery({ queryKey: ['health', 'db'], queryFn: fetchDbHealth });

  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [premise, setPremise] = useState('');
  const [wordsPerChapter, setWordsPerChapter] = useState('2000');
  const [adding, setAdding] = useState(false);

  const backendOk = health.data?.ok === true;
  const dbOk = dbHealth.data?.ok === true;

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const novel = await createNovel({
        title,
        genre: genre || undefined,
        premise: premise || undefined,
        wordsPerChapter: wordsPerChapter ? Number(wordsPerChapter) : undefined,
      });
      await qc.invalidateQueries({ queryKey: ['novels'] });
      setTitle('');
      setGenre('');
      setPremise('');
      setShowAdd(false);
      openNovel(novel.id);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="workspace-panel">
      <div className="panel-toolbar">
        <div>
          <h2>工作区</h2>
          <p className="muted">管理你的全部作品</p>
        </div>
        <button className="btn" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={15} />
          {showAdd ? '收起' : '新建作品'}
        </button>
      </div>

      <div className="status-strip">
        <span className={`dot ${backendOk ? 'dot-ok' : 'dot-err'}`} />
        <span className="text-secondary">后端 {backendOk ? '运行中' : '未连接'}</span>
        <span className="sep" />
        <span className={`dot ${dbOk ? 'dot-ok' : 'dot-err'}`} />
        <span className="text-secondary">数据库 {dbOk ? '正常' : '未就绪'}</span>
      </div>

      {showAdd && (
        <form className="card novel-form" onSubmit={handleCreate}>
          <input
            className="input"
            placeholder="书名（必填）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="input"
            placeholder="类型（如 都市 / 玄幻）"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          />
          <input
            className="input"
            placeholder="每章字数（默认 2000）"
            value={wordsPerChapter}
            onChange={(e) => setWordsPerChapter(e.target.value)}
          />
          <textarea
            className="input textarea"
            placeholder="故事前提（一句话概括）"
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
          />
          <button className="btn" type="submit" disabled={adding || !title}>
            {adding ? '创建中…' : '创建并打开'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="muted">加载中…</p>
      ) : novels.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Library />
          </div>
          <p className="muted">还没有作品，点击「新建作品」开始创作</p>
        </div>
      ) : (
        <div className="novel-grid">
          {novels.map((n) => (
            <NovelCard key={n.id} novel={n} onOpen={() => openNovel(n.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
