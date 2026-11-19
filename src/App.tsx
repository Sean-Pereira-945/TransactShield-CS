/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useState } from 'react';
import { ColabWorkspace } from './components/ColabWorkspace';
import { DashboardWorkspace } from './components/DashboardWorkspace';
import { PresentationWorkspace } from './components/PresentationWorkspace';
import { ReportWorkspace } from './components/ReportWorkspace';
import { SidebarNav } from './components/SidebarNav';
import { TopBar } from './components/TopBar';
import { generateColabIpynbJson } from './data/colabNotebookGenerator';
import { downloadReportPdf, downloadSlidesPdf } from './data/pdfGenerators';
import { generateReportMarkdown } from './data/reportMarkdownGenerator';
import { runTransactShieldExperiment } from './engine/modelAndFusion';
import { FullExperimentSuite, SimulationConfig, WorkspaceView } from './types/transactshield';

const INITIAL_CONFIG: SimulationConfig = {
  dataset: 'ulb',
  driftScenario: 'abrupt',
  labelDelay: 30,
  policyWindow: 70,
  reviewBudgetK: 75,
  seed: 2026,
};

function triggerBlobDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>('dashboard');
  const [config, setConfig] = useState<SimulationConfig>(INITIAL_CONFIG);
  const [feedbackMap, setFeedbackMap] = useState<
    Record<string, 'confirmed_fraud' | 'false_positive'>
  >({});

  const rawSuite: FullExperimentSuite = useMemo(
    () => runTransactShieldExperiment(config),
    [config]
  );

  const suite: FullExperimentSuite = useMemo(() => {
    if (Object.keys(feedbackMap).length === 0) return rawSuite;
    return {
      ...rawSuite,
      fusionTransactions: rawSuite.fusionTransactions.map((tx) =>
        feedbackMap[tx.txId] ? { ...tx, analystFeedback: feedbackMap[tx.txId] } : tx
      ),
    };
  }, [rawSuite, feedbackMap]);

  const fusionStrategy = suite.strategies.find((s) => s.strategyId === 'fusion')!;
  const latestModelVersion =
    fusionStrategy.modelVersions[fusionStrategy.modelVersions.length - 1]?.version ?? 'v1.0';

  const handleUpdateConfig = useCallback((patch: Partial<SimulationConfig>) => {
    setFeedbackMap({});
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleRunBenchmark = useCallback(() => {
    setFeedbackMap({});
    setConfig((prev) => ({ ...prev, seed: prev.seed + 1 }));
  }, []);

  const handleAnalystFeedback = useCallback(
    (txId: string, feedback: 'confirmed_fraud' | 'false_positive') => {
      setFeedbackMap((prev) => ({ ...prev, [txId]: feedback }));
    },
    []
  );

  const handleExportMarkdown = useCallback(() => {
    const markdown = generateReportMarkdown(suite);
    triggerBlobDownload(
      `TransactShield_Report_${config.dataset}_${config.driftScenario}.md`,
      markdown,
      'text/markdown;charset=utf-8'
    );
  }, [suite, config.dataset, config.driftScenario]);

  const handleDownloadColab = useCallback(() => {
    const ipynb = generateColabIpynbJson(config);
    triggerBlobDownload('TransactShield_Colab.ipynb', ipynb, 'application/x-ipynb+json');
  }, [config]);

  const handleDownloadReportPdf = useCallback(() => {
    downloadReportPdf(suite);
  }, [suite]);

  const handleDownloadSlidesPdf = useCallback(() => {
    downloadSlidesPdf(suite);
  }, [suite]);

  const handleTopBarPdf = useCallback(() => {
    if (activeView === 'slides') {
      downloadSlidesPdf(suite);
    } else {
      downloadReportPdf(suite);
    }
  }, [activeView, suite]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <SidebarNav
        activeView={activeView}
        onSelectView={setActiveView}
        fusionModelVersion={latestModelVersion}
        retrainCount={fusionStrategy.metrics.totalRetrains}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeView={activeView}
          config={config}
          onRunBenchmark={handleRunBenchmark}
          onExportMarkdown={handleExportMarkdown}
          onPrintView={handleTopBarPdf}
          onDownloadColab={handleDownloadColab}
        />

        <main className="flex-1 p-6 md:p-8">
          {activeView === 'dashboard' && (
            <DashboardWorkspace
              suite={suite}
              config={config}
              onUpdateConfig={handleUpdateConfig}
              onAnalystFeedback={handleAnalystFeedback}
            />
          )}
          {activeView === 'report' && (
            <ReportWorkspace
              suite={suite}
              onExportMarkdown={handleExportMarkdown}
              onPrintPdf={handleDownloadReportPdf}
            />
          )}
          {activeView === 'slides' && (
            <PresentationWorkspace suite={suite} onPrintSlides={handleDownloadSlidesPdf} />
          )}
          {activeView === 'colab' && (
            <ColabWorkspace config={config} onDownloadColab={handleDownloadColab} />
          )}
        </main>
      </div>
    </div>
  );
}
