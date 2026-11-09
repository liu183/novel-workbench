import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore, type ModuleId } from './stores/app';
import { fetchHealth, fetchDbHealth } from './lib/api';

interface NavItem {
  id: ModuleId;
  label: string;
  desc: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'workspace', label: '工作区', desc: '作品与项目管理' },
  { id: 'deconstruct', label: '拆文工作台', desc: '书名搜索下载 · 结构文风拆解' },
  { id: 'writing', label: '创作工作台', desc: '设定 · 蓝图 · 正文 · 审稿' },
  { id: 'runtime', label: 'AI 运行时', desc: '本地扫描 · 远程接入' },
  { id: 'knowledge', label: '知识库', desc: '参考资料 · 伏笔追踪' },
  { id: 'tasks', label: '任务中心', desc: '流式输出 · 任务调度' },
];

const MODULE_DESC: Record<ModuleId, string> = {
  workspace: '管理你的全部作品，查看进度、字数、角色数，导入旧项目。',
  deconstruct: '输入书名搜索下载，或导入素材，进行结构、文风、爽点、人物多维拆解。',
  writing: '从设定到定稿：故事前提、章节蓝图、正文写作、AI 审稿与逐段修稿。',
  runtime: '自动扫描本地 Agent Runtime，配置远程服务，统一调度 AI 能力。',
  knowledge: '维护参考资料与剧情伏笔，支持本地全文检索。',
  tasks: '查看进行中 / 历史 / 诊断任务，实时流式输出，支持取消与暂停。',
};

function StreamDemo() {
  const [events, setEvents] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const start = () => {
    setEvents([]);
    setRunning(true);
    const es = new EventSource('/api/stream/demo');

    es.addEventListener('message', (e) => {
      const parsed = JSON.parse(e.data) as { count: number; message: string };
      setEvents((prev) => [...prev, parsed.message]);
    });

    es.addEventListener('error', () => {
      setRunning(false);
      es.close();
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>SSE 流式通道演示</h3>
          <p className="muted">验证前后端流式通信（后端每秒推送一条消息）</p>
        </div>
        <button className="btn" onClick={start} disabled={running}>
          {running ? '接收中…' : '开始接收'}
        </button>
      </div>
      <div className="stream-log">
        {events.length === 0 ? (
          <span className="muted">点击「开始接收」查看后端推送</span>
        ) : (
          events.map((msg, i) => <div key={i} className="stream-line">▸ {msg}</div>)
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const health = useQuery({ queryKey: ['health'], queryFn: fetchHealth });
  const dbHealth = useQuery({ queryKey: ['health', 'db'], queryFn: fetchDbHealth });

  const backendOk = health.data?.ok === true;
  const dbOk = dbHealth.data?.ok === true;

  return (
    <div className="grid">
      <div className="card status-card">
        <div className="card-header">
          <h3>系统状态</h3>
        </div>
        <div className="status-row">
          <span className={`dot ${backendOk ? 'dot-ok' : 'dot-err'}`} />
          <div>
            <div className="status-label">后端服务</div>
            <div className="muted">
              {backendOk ? `v${health.data?.version} 运行中` : '未连接（请启动 pnpm dev:server）'}
            </div>
          </div>
        </div>
        <div className="status-row">
          <span className={`dot ${dbOk ? 'dot-ok' : 'dot-err'}`} />
          <div>
            <div className="status-label">SQLite 数据库</div>
            <div className="muted">{dbOk ? '连接正常' : '未就绪'}</div>
          </div>
        </div>
      </div>

      <StreamDemo />
    </div>
  );
}

function ModulePlaceholder({ module }: { module: ModuleId }) {
  const item = NAV_ITEMS.find((n) => n.id === module);
  return (
    <div className="card module-placeholder">
      <h2>{item?.label}</h2>
      <p className="muted">{MODULE_DESC[module]}</p>
      <div className="placeholder-box">该模块将在后续里程碑中实现</div>
    </div>
  );
}

export default function App() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setActiveModule = useAppStore((s) => s.setActiveModule);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <div className="brand-name">小说创作工作台</div>
            <div className="brand-sub">Novel Workbench</div>
          </div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
              onClick={() => setActiveModule(item.id)}
            >
              <span className="nav-label">{item.label}</span>
              <span className="nav-desc">{item.desc}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer muted">v0.1.0 · M1 工程骨架</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{NAV_ITEMS.find((n) => n.id === activeModule)?.label}</h1>
          <span className="muted">小说创作与拆文工作台</span>
        </header>

        <main className="content">
          {activeModule === 'workspace' ? <Dashboard /> : <ModulePlaceholder module={activeModule} />}
        </main>
      </div>
    </div>
  );
}
