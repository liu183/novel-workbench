import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, CheckSquare, History, Wrench } from 'lucide-react';
import {
  reviewChapter,
  fetchReviews,
  reviseChapter,
  fetchDrafts,
  type ReviewRecord,
} from '../../lib/api';

export function ReviewPanel({
  chapterId,
  runtimeId,
  onRevised,
}: {
  chapterId: string;
  runtimeId?: string;
  onRevised: () => void;
}) {
  const qc = useQueryClient();
  const reviews = useQuery({
    queryKey: ['reviews', chapterId],
    queryFn: () => fetchReviews(chapterId),
  });
  const drafts = useQuery({
    queryKey: ['drafts', chapterId],
    queryFn: () => fetchDrafts(chapterId),
  });

  const [reviewing, setReviewing] = useState(false);
  const [revising, setRevising] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const active: ReviewRecord | undefined = (reviews.data ?? [])[0];

  const handleReview = async () => {
    setReviewing(true);
    setMessage(null);
    try {
      const res = await reviewChapter(chapterId, runtimeId);
      if (res.ok) {
        setChecked({});
        await qc.invalidateQueries({ queryKey: ['reviews', chapterId] });
        setMessage(`审稿完成，共 ${res.record?.items.length ?? 0} 条意见`);
      } else {
        setMessage(res.error ?? '审稿失败');
      }
    } catch {
      setMessage('审稿失败，请检查后端服务或 AI 运行时');
    } finally {
      setReviewing(false);
    }
  };

  const handleRevise = async () => {
    if (!active) return;
    const selected = active.items
      .filter((it) => checked[it.id])
      .map((it) => it.text);
    if (selected.length === 0) {
      setMessage('请至少勾选一条修改意见');
      return;
    }
    setRevising(true);
    setMessage(null);
    try {
      const res = await reviseChapter(chapterId, selected, active.id, runtimeId);
      if (res.ok) {
        setMessage(`修稿完成，已生成新稿（历史版本 v${res.version}）`);
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['drafts', chapterId] }),
          qc.invalidateQueries({ queryKey: ['reviews', chapterId] }),
        ]);
        onRevised();
      } else {
        setMessage(res.error ?? '修稿失败');
      }
    } catch {
      setMessage('修稿失败，请检查后端服务或 AI 运行时');
    } finally {
      setRevising(false);
    }
  };

  return (
    <div className="card review-panel">
      <div className="review-head">
        <div>
          <h3>审稿与修稿</h3>
          <p className="muted">AI 逐条列出意见，勾选后生成新稿，旧稿自动归档</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowHistory((v) => !v)}>
            <History size={14} />
            历史（{(drafts.data ?? []).length}）
          </button>
          <button className="btn btn-sm" onClick={handleReview} disabled={reviewing}>
            <Sparkles size={14} />
            {reviewing ? '审稿中…' : 'AI 审稿'}
          </button>
        </div>
      </div>

      {message && <div className="toast">{message}</div>}

      {showHistory && (
        <div className="draft-list">
          {(drafts.data ?? []).length === 0 ? (
            <p className="muted">暂无历史版本</p>
          ) : (
            (drafts.data ?? []).map((d) => (
              <div className="draft-row" key={d.id}>
                <span className="badge badge-type">v{d.version}</span>
                <span className="muted">
                  {new Date(d.createdAt).toLocaleString('zh-CN')} · {d.content.length} 字
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {active ? (
        <>
          <div className="review-items">
            {active.items.map((it) => (
              <label className={`review-item ${checked[it.id] ? 'checked' : ''}`} key={it.id}>
                <input
                  type="checkbox"
                  checked={!!checked[it.id]}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [it.id]: e.target.checked }))
                  }
                />
                <span>{it.text}</span>
              </label>
            ))}
          </div>
          <div className="review-actions">
            <button className="btn btn-sm" onClick={handleRevise} disabled={revising}>
              <Wrench size={14} />
              {revising ? '修稿中…' : '按勾选意见修稿'}
            </button>
            <span className="muted">
              <CheckSquare size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              已勾选 {Object.values(checked).filter(Boolean).length} / {active.items.length}
            </span>
          </div>
        </>
      ) : (
        <p className="muted">点击「AI 审稿」生成修改意见</p>
      )}
    </div>
  );
}
