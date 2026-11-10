import { useAppStore, type ModuleId } from './stores/app';
import { RuntimePanel } from './features/runtime/RuntimePanel';
import { WorkspacePanel } from './features/workspace/WorkspacePanel';
import { WritingPanel } from './features/writing/WritingPanel';

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

        <div className="sidebar-footer muted">v0.3.0 · M3 工作区与创作</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{NAV_ITEMS.find((n) => n.id === activeModule)?.label}</h1>
          <span className="muted">小说创作与拆文工作台</span>
        </header>

        <main className="content">{renderContent()}</main>
      </div>
    </div>
  );
}
