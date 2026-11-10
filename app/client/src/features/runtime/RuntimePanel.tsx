import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Cpu, Terminal, Server, Bot } from 'lucide-react';
import {
  fetchRuntimes,
  scanRuntimes,
  addRuntime,
  type AgentRuntimeInfo,
  type RuntimeStatus,
  type RuntimeType,
} from '../../lib/api';

const TYPE_LABEL: Record<RuntimeType, string> = {
  llm: '模型服务',
  'agent-cli': 'Agent CLI',
  remote: '远程服务',
};

const TYPE_ICON: Record<RuntimeType, typeof Cpu> = {
  llm: Cpu,
  'agent-cli': Terminal,
  remote: Server,
};

const STATUS_META: Record<RuntimeStatus, { label: string; className: string }> = {
  available: { label: '可用', className: 'badge-ok' },
  unavailable: { label: '未运行', className: 'badge-warn' },
  scanning: { label: '扫描中', className: 'badge-info' },
  error: { label: '错误', className: 'badge-err' },
};

const CAPABILITY_LABEL: Record<string, string> = {
  chat: '对话',
  stream: '流式',
  'tool-call': '工具调用',
  'agent-task': '多步任务',
  vision: '视觉',
  'long-context': '长上下文',
  embedding: '向量',
};

function RuntimeCard({ runtime }: { runtime: AgentRuntimeInfo }) {
  const status = STATUS_META[runtime.status] ?? STATUS_META.error;
  const Icon = TYPE_ICON[runtime.type] ?? Bot;

  return (
    <div className="card runtime-card">
      <div className="runtime-card-head">
        <div className="runtime-name">
          <span className="runtime-icon">
            <Icon />
          </span>
          {runtime.name}
        </div>
        <span className={`badge ${status.className}`}>{status.label}</span>
      </div>

      <div className="runtime-meta">
        <span className="badge badge-type">{TYPE_LABEL[runtime.type] ?? runtime.type}</span>
        <span>{runtime.provider}</span>
      </div>

      {runtime.baseUrl && <div className="runtime-url">{runtime.baseUrl}</div>}
      {runtime.command && <div className="runtime-url">command: {runtime.command}</div>}

      {runtime.capabilities.length > 0 && (
        <div className="capability-tags">
          {runtime.capabilities.map((c) => (
            <span key={c} className="capability-tag">
              {CAPABILITY_LABEL[c] ?? c}
            </span>
          ))}
        </div>
      )}

      {runtime.health && (
        <div className="runtime-health">
          <span className={`dot ${runtime.health.latencyMs < 1000 ? 'dot-ok' : 'dot-err'}`} />
          响应 {runtime.health.latencyMs}ms
        </div>
      )}

      {runtime.models.length > 0 && (
        <div className="runtime-models">
          <div className="muted">可用模型（{runtime.models.length}）</div>
          <div className="model-list">
            {runtime.models.slice(0, 5).map((m) => (
              <span key={m} className="model-chip">
                {m}
              </span>
            ))}
            {runtime.models.length > 5 && (
              <span className="muted">+{runtime.models.length - 5}</span>
            )}
          </div>
        </div>
      )}

      {runtime.error && <div className="runtime-error">{runtime.error}</div>}
    </div>
  );
}

export function RuntimePanel() {
  const qc = useQueryClient();
  const { data: runtimes = [], isLoading } = useQuery({
    queryKey: ['runtimes'],
    queryFn: fetchRuntimes,
  });

  const [scanning, setScanning] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setMessage(null);
    try {
      const res = await scanRuntimes();
      setMessage(`扫描完成：发现 ${res.runtimes.length} 个运行时（耗时 ${res.durationMs}ms）`);
      await qc.invalidateQueries({ queryKey: ['runtimes'] });
    } catch {
      setMessage('扫描失败，请检查后端服务');
    } finally {
      setScanning(false);
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setMessage(null);
    try {
      const res = await addRuntime({ name, baseUrl });
      if (res.ok) {
        setMessage(`已添加「${name}」`);
        setName('');
        setBaseUrl('');
        setShowAdd(false);
      } else {
        setMessage(res.error ?? '添加失败');
      }
      await qc.invalidateQueries({ queryKey: ['runtimes'] });
    } catch {
      setMessage('添加失败，请检查后端服务');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="runtime-panel">
      <div className="panel-toolbar">
        <div>
          <h2>AI 运行时</h2>
          <p className="muted">自动扫描本地 Agent Runtime，或接入远程服务</p>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-ghost" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={15} />
            {showAdd ? '取消' : '添加远程服务'}
          </button>
          <button className="btn" onClick={handleScan} disabled={scanning}>
            <RefreshCw size={15} className={scanning ? 'spin' : undefined} />
            {scanning ? '扫描中…' : '重新扫描'}
          </button>
        </div>
      </div>

      {message && <div className="toast">{message}</div>}

      {showAdd && (
        <form className="card add-form" onSubmit={handleAdd}>
          <input
            className="input"
            placeholder="名称（如 DeepSeek）"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Base URL（如 https://api.deepseek.com/v1）"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <button className="btn" type="submit" disabled={adding || !name || !baseUrl}>
            {adding ? '添加中…' : '添加'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="muted">加载中…</p>
      ) : runtimes.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Bot />
          </div>
          <p className="muted">尚未发现任何运行时，点击「重新扫描」检测本地服务</p>
        </div>
      ) : (
        <div className="runtime-grid">
          {runtimes.map((r) => (
            <RuntimeCard key={r.id} runtime={r} />
          ))}
        </div>
      )}
    </div>
  );
}
