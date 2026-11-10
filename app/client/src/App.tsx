import {
  Library,
  ScanSearch,
  PenLine,
  Bot,
  BookOpen,
  Activity,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore, type ModuleId } from './stores/app';
import { RuntimePanel } from './features/runtime/RuntimePanel';
import { WorkspacePanel } from './features/workspace/WorkspacePanel';
import { WritingPanel } from './features/writing/WritingPanel';

interface NavItem {
  id: ModuleId;
  label: string;
  desc: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'workspace', label: '工作区', desc: '作品与项目管理', icon: Library },
  { id: 'deconstruct', label: '拆文工作台', desc: '书名搜索 · 结构拆解', icon: ScanSearch },
  { id: 'writing', label: '创作工作台', desc: '蓝图 · 正文 · 审稿', icon: PenLine },
  { id: 'runtime', label: 'AI 运行时', desc: '本地扫描 · 远程接入', icon: Bot },
  { id: 'knowledge', label: '知识库', desc: '资料 · 伏笔追踪', icon: BookOpen },
  { id: 'tasks', label: '任务中心', desc: '流式输出 · 调度', icon: Activity },
];

const MODULE_DESC: Record<ModuleId, string> = {
  workspace: '管理你的全部作品，查看进度、字数、角色数，导入旧项目。',
  deconstruct: '输入书名搜索下载，或导入素材，进行结构、文风、爽点、人物多维拆解。',
  writing: '从设定到定稿：故事前提、章节蓝图、正文写作、AI 审稿与逐段修稿。',
  runtime: '自动扫描本地 Agent Runtime，配置远程服务，统一调度 AI 能力。',
  knowledge: '维护参考资料与剧情伏笔，支持本地全文检索。',
  tasks: '查看进行中 / 历史 / 诊断任务，实时流式输出，支持取消与暂停。',
};

function ModulePlaceholder({ module }: { module: ModuleId }) {
  const item = NAV_ITEMS.find((n) => n.id === module);
  const Icon = item?.icon ?? Sparkles;
  return (
    <div className="card">
      <div className="empty" style={{ border: 'none', padding: '64px 32px' }}>
        <div className="empty-icon">
          <Icon />
        </div>
        <div>
          <h2 style={{ margin: '0 0 6px' }}>{item?.label}</h2>
          <p className="muted">{MODULE_DESC[module]}</p>
        </div>
        <span className="badge badge-type">后续里程碑实现</span>
      </div>
    </div>
  );
}

export default function App() {
  const activeModule = useAppStore((s) => s.activeModule);
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  const current = NAV_ITEMS.find((n) => n.id === activeModule);

  const renderContent = () => {
    switch (activeModule) {
      case 'workspace':
        return <WorkspacePanel />;
      case 'runtime':
        return <RuntimePanel />;
      case 'writing':
        return <WritingPanel />;
      default:
        return <ModulePlaceholder module={activeModule} />;
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <div className="brand-name">小说创作工作台</div>
            <div className="brand-sub">NOVEL WORKBENCH</div>
          </div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => setActiveModule(item.id)}
              >
                <Icon className="nav-icon" />
                <span className="nav-text">
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-desc">{item.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <Sparkles size={13} />
          v0.3.0 · M3 工作区与创作
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1>{current?.label}</h1>
            <span className="topbar-sub">小说创作与拆文工作台</span>
          </div>
        </header>

        <main className="content">{renderContent()}</main>
      </div>
    </div>
  );
}
