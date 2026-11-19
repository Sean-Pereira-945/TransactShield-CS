import { BarChart3, BookOpen, Code2, Presentation, ShieldCheck } from 'lucide-react';
import { WorkspaceView } from '../types/transactshield';

interface SidebarNavProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  fusionModelVersion: string;
  retrainCount: number;
}

const NAV_ITEMS: { id: WorkspaceView; label: string; subtitle: string; icon: typeof BarChart3 }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    subtitle: 'Stream & ORT Benchmarks',
    icon: BarChart3,
  },
  {
    id: 'report',
    label: 'Research Report',
    subtitle: 'Findings & Paper Synthesis',
    icon: BookOpen,
  },
  {
    id: 'slides',
    label: 'PPT Presentation',
    subtitle: '12-Slide Defense Deck',
    icon: Presentation,
  },
  {
    id: 'colab',
    label: 'Colab Notebook',
    subtitle: 'River + SHAP Python .ipynb',
    icon: Code2,
  },
];

export function SidebarNav({
  activeView,
  onSelectView,
  fusionModelVersion,
  retrainCount,
}: SidebarNavProps) {
  return (
    <aside className="no-print w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between min-h-screen sticky top-0 h-screen">
      <div>
        <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            TransactShield
          </span>
        </div>

        <nav className="p-3 space-y-1" aria-label="Primary Workspaces">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-start gap-3 px-3.5 py-2.5 rounded-lg text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div
                    className={`text-sm leading-tight whitespace-nowrap truncate ${
                      isActive ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">{item.subtitle}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-5 border-t border-slate-200 space-y-3 text-xs text-slate-500">
        <div className="space-y-1">
          <div className="font-medium text-slate-700">Active Fusion Artifact</div>
          <div className="font-mono tabular-nums text-slate-600">
            Model {fusionModelVersion} · {retrainCount} retrains
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 space-y-0.5 leading-relaxed">
          <div className="font-medium text-slate-700">Sean Pereira</div>
          <div>Mentor: Dr. Vijay Shelake</div>
          <div>Fr. CRCE · Computer Eng.</div>
        </div>
      </div>
    </aside>
  );
}
