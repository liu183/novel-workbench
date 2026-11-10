import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, BookOpen, Trash2, FileText } from 'lucide-react';
import {
  fetchKnowledgeDocs,
  createKnowledgeDoc,
  deleteKnowledgeDoc,
  searchKnowledge,
  type KnowledgeHit,
} from '../../lib/api';

export function KnowledgePanel() {
  const qc = useQueryClient();
  const docs = useQuery({ queryKey: ['knowledgeDocs'], queryFn: fetchKnowledgeDocs });

  const [showAdd, setShowAdd] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<KnowledgeHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await createKnowledgeDoc({ title: docTitle, content: docContent });
    if (res.ok) {
      setMessage(`已导入《${docTitle}》`);
      setDocTitle('');
      setDocContent('');
      setShowAdd(false);
      await qc.invalidateQueries({ queryKey: ['knowledgeDocs'] });
    } else {
      setMessage(res.error ?? '导入失败');
    }
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      setHits(await searchKnowledge(query.trim()));
    } catch {
      setMessage('检索失败');
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteKnowledgeDoc(id);
    await qc.invalidateQueries({ queryKey: ['knowledgeDocs'] });
    if (hits) setHits(hits.filter((h) => h.id !== id));
  };

  return (
    <div className="knowledge-panel">
      <div className="panel-toolbar">
        <div>
          <h2>知识库</h2>
          <p className="muted">参考资料导入与本地全文检索</p>
        </div>
        <button className="btn" onClick={() => setShowAdd((v) => !v)}>
          <Plus size={15} />
          {showAdd ? '收起' : '导入资料'}
        </button>
      </div>

      {message && <div className="toast">{message}</div>}

      {showAdd && (
        <form className="card import-form" onSubmit={handleCreate}>
          <div className="report-block-title">导入参考资料</div>
          <input
            className="input"
            placeholder="资料标题"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
          />
          <textarea
            className="input textarea"
            style={{ minHeight: 140 }}
            placeholder="粘贴资料正文（设定集、背景资料、笔记等）"
            value={docContent}
            onChange={(e) => setDocContent(e.target.value)}
          />
          <button className="btn" type="submit" disabled={!docTitle.trim() || !docContent.trim()}>
            导入
          </button>
        </form>
      )}

      <div className="card search-card">
        <form className="search-row" onSubmit={handleSearch}>
          <div className="search-input-wrap">
            <Search size={16} />
            <input
              className="input"
              placeholder="输入关键词检索全部资料"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={searching || !query.trim()}>
            <Search size={15} />
            {searching ? '检索中…' : '检索'}
          </button>
        </form>

        {hits !== null && (
          <div className="knowledge-hits">
            {hits.length === 0 ? (
              <p className="muted">未找到匹配内容</p>
            ) : (
              hits.map((h) => (
                <div className="hit-row" key={h.id}>
                  <div className="hit-title">
                    <FileText size={13} />
                    {h.title}
                    <span className="badge badge-type">{h.matches} 处</span>
                  </div>
                  <div className="muted">…{h.excerpt}…</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="section-title">
        <BookOpen size={15} />
        全部资料（{(docs.data ?? []).length}）
      </div>
      <div className="card source-list">
        {(docs.data ?? []).length === 0 ? (
          <p className="muted">暂无资料，点击「导入资料」添加</p>
        ) : (
          (docs.data ?? []).map((d) => (
            <div className="source-item" key={d.id}>
              <div className="source-info">
                <div className="source-name">{d.title}</div>
                <div className="muted">
                  {d.chars.toLocaleString()} 字 · {new Date(d.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div className="source-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(d.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
