import { useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Terminal } from 'lucide-react';
import { getColabNotebookCells } from '../data/colabNotebookGenerator';
import { SimulationConfig } from '../types/transactshield';

interface ColabWorkspaceProps {
  config: SimulationConfig;
  onDownloadColab: () => void;
}

export function ColabWorkspace({ config, onDownloadColab }: ColabWorkspaceProps) {
  const cells = useMemo(() => getColabNotebookCells(config), [config]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Clipboard API fallback omitted cleanly if permissions deny
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Colab Execution Guide Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-bold text-slate-900">
              Google Colab ML Pipeline (River + XGBoost + SHAP)
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Download the pre-configured <span className="font-mono">.ipynb</span> notebook synced
              to your active experiment parameters ({config.dataset.toUpperCase()} ·{' '}
              {config.driftScenario} · delay {config.labelDelay} · W={config.policyWindow} · K=
              {config.reviewBudgetK}) and execute directly on Google Colab CPU/GPU runtimes.
            </p>
          </div>
          <button
            type="button"
            onClick={onDownloadColab}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download TransactShield_Colab.ipynb</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="font-semibold text-slate-900">Step 1 · Download &amp; Upload</div>
            <p className="text-slate-600 leading-relaxed">
              Click <strong>Download .ipynb</strong> above, open{' '}
              <span className="font-mono text-slate-800">colab.research.google.com</span>, and upload
              the notebook file.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="font-semibold text-slate-900">Step 2 · Run All Cells</div>
            <p className="text-slate-600 leading-relaxed">
              Cell 2 installs <span className="font-mono">river</span>,{' '}
              <span className="font-mono">xgboost</span>, and <span className="font-mono">shap</span>
              ; Cells 4–8 benchmark all 6 drift strategies and plot PR-AUC vs. retrains.
            </p>
          </div>
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
            <div className="font-semibold text-slate-900">Step 3 · Real Kaggle CSV Hook</div>
            <p className="text-slate-600 leading-relaxed">
              Swap <span className="font-mono">generate_stream()</span> in Cell 4 with{' '}
              <span className="font-mono">pd.read_csv(&quot;creditcard.csv&quot;)</span> or PaySim
              CSV for full-scale dataset runs.
            </p>
          </div>
        </div>
      </section>

      {/* Cell-by-Cell Interactive Notebook View */}
      <section className="space-y-4" aria-label="Notebook Cells">
        {cells.map((cell, index) => {
          const isCopied = copiedId === cell.id;
          return (
            <div
              key={cell.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono tabular-nums text-xs font-semibold text-slate-500">
                    [{index + 1}]
                  </span>
                  <span className="text-xs font-semibold text-slate-900 truncate">
                    {cell.title}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    · {cell.cellType === 'code' ? 'Python 3' : 'Markdown'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(cell.id, cell.source)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy Cell</span>
                    </>
                  )}
                </button>
              </div>

              {cell.cellType === 'markdown' ? (
                <div className="p-5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-white">
                  {cell.source}
                </div>
              ) : (
                <div className="bg-slate-900 text-slate-100 p-5 overflow-x-auto">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-2">
                    <Terminal className="w-3 h-3" aria-hidden="true" />
                    <span>In [{index + 1}]:</span>
                  </div>
                  <pre className="font-mono text-xs leading-relaxed">{cell.source}</pre>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="text-xs text-slate-500 flex items-center justify-between px-1">
        <span>Schema: nbformat 4.5 (Google Colab &amp; Jupyter compatible)</span>
        <a
          href="https://colab.research.google.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
        >
          <span>Open Google Colab</span>
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
