import { Download, Play } from 'lucide-react';
import { SimulationConfig, WorkspaceView } from '../types/transactshield';

interface TopBarProps {
  activeView: WorkspaceView;
  config: SimulationConfig;
  onRunBenchmark: () => void;
  onExportMarkdown: () => void;
  onPrintView: () => void;
  onDownloadColab: () => void;
}

const VIEW_TITLES: Record<WorkspaceView, string> = {
  dashboard: 'Streaming Fusion & ORT Benchmark',
  report: 'Detailed Research Findings Report',
  slides: 'Presentation Deck (PPT)',
  colab: 'Google Colab Pipeline (.ipynb)',
};

const SCENARIO_LABELS: Record<SimulationConfig['driftScenario'], string> = {
  abrupt: 'Abrupt Concept Drift',
  gradual: 'Gradual Transition',
  recurring: 'Recurring Concept',
  noise_burst: 'Isolated Noise Burst',
};

export function TopBar({
  activeView,
  config,
  onRunBenchmark,
  onExportMarkdown,
  onPrintView,
  onDownloadColab,
}: TopBarProps) {
  const datasetLabel = config.dataset === 'ulb' ? 'ULB Credit Card' : 'PaySim Mobile Money';

  return (
    <header className="no-print h-16 px-8 border-b border-slate-200 bg-white flex items-center justify-between gap-8 sticky top-0 z-20">
      {/* Zone 1: Breadcrumb */}
      <div className="flex items-center gap-2 text-sm whitespace-nowrap shrink-0">
        <span className="text-slate-500 font-medium">TransactShield</span>
        <span className="text-slate-300" aria-hidden="true">
          /
        </span>
        <h1 className="font-display font-semibold text-slate-900 text-base">
          {VIEW_TITLES[activeView]}
        </h1>
      </div>

      {/* Zone 2: Quiet unboxed context metadata */}
      <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap truncate">
        <span>{datasetLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{SCENARIO_LABELS[config.driftScenario]}</span>
        <span aria-hidden="true">·</span>
        <span>Delay {config.labelDelay} txns</span>
        <span aria-hidden="true">·</span>
        <span>Budget K={config.reviewBudgetK}</span>
      </div>

      {/* Zone 3: Single primary action per workspace */}
      <div className="flex items-center gap-3 shrink-0">
        {activeView === 'dashboard' && (
          <button
            type="button"
            onClick={onRunBenchmark}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Re-run Experiment</span>
          </button>
        )}
        {activeView === 'report' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onExportMarkdown}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export .md</span>
            </button>
            <button
              type="button"
              onClick={onPrintView}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download Report PDF</span>
            </button>
          </div>
        )}
        {activeView === 'slides' && (
          <button
            type="button"
            onClick={onPrintView}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download Slides PDF</span>
          </button>
        )}
        {activeView === 'colab' && (
          <button
            type="button"
            onClick={onDownloadColab}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download .ipynb</span>
          </button>
        )}
      </div>
    </header>
  );
}
