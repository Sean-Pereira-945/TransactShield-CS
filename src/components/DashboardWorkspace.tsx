import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import {
  DatasetId,
  DriftScenarioId,
  FullExperimentSuite,
  ScoredTransaction,
  SimulationConfig,
} from '../types/transactshield';
import { CasePacketDrawer } from './CasePacketDrawer';
import { DriftTimelineChart } from './DriftTimelineChart';

interface DashboardWorkspaceProps {
  suite: FullExperimentSuite;
  config: SimulationConfig;
  onUpdateConfig: (patch: Partial<SimulationConfig>) => void;
  onAnalystFeedback: (txId: string, feedback: 'confirmed_fraud' | 'false_positive') => void;
}

const DRIFT_SCENARIOS: { id: DriftScenarioId; label: string }[] = [
  { id: 'abrupt', label: 'Abrupt Drift' },
  { id: 'gradual', label: 'Gradual Drift' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'noise_burst', label: 'Noise Burst' },
];

export function DashboardWorkspace({
  suite,
  config,
  onUpdateConfig,
  onAnalystFeedback,
}: DashboardWorkspaceProps) {
  const maxStep = suite.datasetStats.totalTransactions - 1;
  const minStreamStep = suite.datasetStats.warmStartCount;

  const [streamCursor, setStreamCursor] = useState<number>(maxStep);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [txFilter, setTxFilter] = useState<'all' | 'Decline' | 'Review' | 'Allow'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  // Keep cursor synced to full stream when experiment re-runs unless user starts playback
  useEffect(() => {
    setStreamCursor(maxStep);
    setIsPlaying(false);
  }, [suite.computedAtIso, maxStep]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setStreamCursor((prev) => {
        if (prev >= maxStep) {
          setIsPlaying(false);
          return maxStep;
        }
        return Math.min(maxStep, prev + 35);
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [isPlaying, maxStep]);

  const fusionStrat = suite.strategies.find((s) => s.strategyId === 'fusion')!;
  const staticStrat = suite.strategies.find((s) => s.strategyId === 'static')!;
  const alwaysStrat = suite.strategies.find((s) => s.strategyId === 'always_retrain')!;

  const visibleTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return suite.fusionTransactions
      .filter((tx) => tx.step <= streamCursor)
      .filter((tx) => (txFilter === 'all' ? true : tx.decision === txFilter))
      .filter((tx) =>
        q
          ? tx.txId.toLowerCase().includes(q) ||
            tx.channel.toLowerCase().includes(q) ||
            tx.regimeLabel.toLowerCase().includes(q)
          : true
      )
      .slice(-40)
      .reverse();
  }, [suite.fusionTransactions, streamCursor, txFilter, searchQuery]);

  const visibleDriftEvents = useMemo(
    () => fusionStrat.driftEvents.filter((e) => e.step <= streamCursor).slice().reverse(),
    [fusionStrat.driftEvents, streamCursor]
  );

  const selectedTx: ScoredTransaction | null = useMemo(() => {
    if (!selectedTxId) return null;
    return suite.fusionTransactions.find((t) => t.txId === selectedTxId) ?? null;
  }, [selectedTxId, suite.fusionTransactions]);

  const handleTogglePlay = () => {
    if (streamCursor >= maxStep) {
      setStreamCursor(minStreamStep + 60);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const maxRetrainsScale = Math.max(
    1,
    ...suite.strategies.map((s) => s.metrics.totalRetrains)
  );

  return (
    <div className="space-y-6">
      {/* Configuration & Stream Playback Control Bar */}
      <section
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        aria-label="Experiment Configuration and Stream Controls"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Dataset & Drift Scenario Selectors */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <span className="block text-xs font-medium text-slate-500">Dataset Stream</span>
              <div className="inline-flex p-1 bg-slate-100 rounded-lg">
                {(['ulb', 'paysim'] as DatasetId[]).map((ds) => (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => onUpdateConfig({ dataset: ds })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      config.dataset === ds
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {ds === 'ulb' ? 'ULB Credit Card' : 'PaySim Mobile Money'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-xs font-medium text-slate-500">Drift Injection</span>
              <div className="inline-flex flex-wrap p-1 bg-slate-100 rounded-lg">
                {DRIFT_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => onUpdateConfig({ driftScenario: sc.id })}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      config.driftScenario === sc.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stream Playback Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Replay Stream</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStreamCursor((prev) => Math.min(maxStep, prev + 120));
              }}
              disabled={streamCursor >= maxStep}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <FastForward className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Step +120</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setStreamCursor(maxStep);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Full Stream</span>
            </button>
          </div>
        </div>

        {/* Fine-Grained Operational Parameters */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-center text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-slate-500 flex justify-between">
              <span>Label Arrival Delay</span>
              <span className="font-mono tabular-nums text-slate-800 font-medium">
                {config.labelDelay} txns
              </span>
            </span>
            <input
              type="range"
              min={5}
              max={80}
              step={5}
              value={config.labelDelay}
              onChange={(e) => onUpdateConfig({ labelDelay: Number(e.target.value) })}
              className="accent-blue-700 cursor-pointer"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-500 flex justify-between">
              <span>Fusion Policy Window (W)</span>
              <span className="font-mono tabular-nums text-slate-800 font-medium">
                {config.policyWindow} txns
              </span>
            </span>
            <input
              type="range"
              min={30}
              max={200}
              step={10}
              value={config.policyWindow}
              onChange={(e) => onUpdateConfig({ policyWindow: Number(e.target.value) })}
              className="accent-blue-700 cursor-pointer"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-500 flex justify-between">
              <span>Analyst Alert Budget (K)</span>
              <span className="font-mono tabular-nums text-slate-800 font-medium">
                Top {config.reviewBudgetK} alerts
              </span>
            </span>
            <input
              type="range"
              min={25}
              max={150}
              step={25}
              value={config.reviewBudgetK}
              onChange={(e) => onUpdateConfig({ reviewBudgetK: Number(e.target.value) })}
              className="accent-blue-700 cursor-pointer"
            />
          </label>

          <div className="flex flex-col justify-center md:items-end font-mono tabular-nums text-slate-600">
            <span>
              Stream Progress: {Math.max(0, streamCursor - minStreamStep + 1)} /{' '}
              {suite.datasetStats.streamCount} txns
            </span>
            <span className="text-slate-400">
              Fraud Prevalence: {suite.datasetStats.fraudRatePct}% (
              {suite.datasetStats.fraudCount} frauds)
            </span>
          </div>
        </div>
      </section>

      {/* 4-Column ORT & Fusion KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key Performance Metrics">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Fusion PR-AUC (Rare Fraud)</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1.5">
            {fusionStrat.metrics.prAuc.toFixed(3)}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            Static baseline: {staticStrat.metrics.prAuc.toFixed(3)} · Prec@1%FPR:{' '}
            {(fusionStrat.metrics.precisionAt1PctFpr * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            Recall@{config.reviewBudgetK} (Alert Budget)
          </div>
          <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1.5">
            {(fusionStrat.metrics.recallAtK * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            Precision@{config.reviewBudgetK}: {(fusionStrat.metrics.precisionAtK * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Amount-Weighted Recall</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1.5">
            {(fusionStrat.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            Net loss avoided: ${fusionStrat.metrics.expectedLossAvoided.toLocaleString()}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Selective Retrain Efficiency</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1.5">
            {fusionStrat.metrics.totalRetrains} retrains
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            -{fusionStrat.metrics.retrainEfficiencyPct}% vs periodic ({alwaysStrat.metrics.totalRetrains}) ·{' '}
            {fusionStrat.metrics.isolatedLogsCount} isolated logged
          </div>
        </div>
      </section>

      {/* Interactive Signal & Fusion Timeline Chart */}
      <DriftTimelineChart
        fusionTimeline={fusionStrat.timeline}
        staticTimeline={staticStrat.timeline}
        visibleStepLimit={streamCursor}
      />

      {/* ORT Comparative Strategy Matrix & Retrain Trade-off */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Strategy Comparison &amp; ORT Evaluation Metrics
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-detector fusion vs. single-detector baselines, periodic retraining, and static scoring
              </p>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2.5 pr-4 font-medium">Strategy</th>
                <th className="py-2.5 px-3 font-medium text-right">PR-AUC</th>
                <th className="py-2.5 px-3 font-medium text-right">Prec@1%FPR</th>
                <th className="py-2.5 px-3 font-medium text-right">
                  Recall@{config.reviewBudgetK}
                </th>
                <th className="py-2.5 px-3 font-medium text-right">Amt-Wtd Recall</th>
                <th className="py-2.5 px-3 font-medium text-right">Retrains</th>
                <th className="py-2.5 pl-3 font-medium text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {suite.strategies.map((s) => {
                const isProposed = s.strategyId === 'fusion';
                return (
                  <tr
                    key={s.strategyId}
                    className={isProposed ? 'bg-blue-50/50 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'}
                  >
                    <td className="py-2.5 pr-4 font-sans font-medium text-slate-900 whitespace-nowrap">
                      {s.shortLabel}
                    </td>
                    <td className="py-2.5 px-3 text-right">{s.metrics.prAuc.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right">
                      {(s.metrics.precisionAt1PctFpr * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {(s.metrics.recallAtK * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {(s.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {s.metrics.totalRetrains}
                      {s.metrics.falseRetrains > 0 && (
                        <span className="text-amber-700 ml-1">({s.metrics.falseRetrains} false)</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      {s.metrics.detectionLatencyTxns !== null
                        ? `${s.metrics.detectionLatencyTxns} txns`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Visual Trade-Off: Retrains vs PR-AUC */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Retrain Restraint vs. PR-AUC
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Fewer retrains reduce model churn and compute cost without sacrificing detection rank
            </p>

            <div className="space-y-3.5">
              {suite.strategies.map((s) => {
                const retrainWidth = (s.metrics.totalRetrains / maxRetrainsScale) * 100;
                const prWidth = s.metrics.prAuc * 100;
                return (
                  <div key={s.strategyId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{s.shortLabel}</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        PR-AUC {s.metrics.prAuc.toFixed(2)} · {s.metrics.totalRetrains} retrains
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="h-1.5 bg-slate-100 rounded-xs overflow-hidden">
                        <div
                          className="h-full bg-blue-700"
                          style={{ width: `${Math.max(2, prWidth)}%` }}
                        />
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-xs overflow-hidden">
                        <div
                          className="h-full bg-slate-700"
                          style={{ width: `${s.metrics.totalRetrains === 0 ? 0 : Math.max(4, retrainWidth)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-blue-700 inline-block" /> PR-AUC
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-slate-700 inline-block" /> Total Retrains
            </span>
          </div>
        </div>
      </section>

      {/* Drift Events & Model Version Audit Log + Live Transaction Queue */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Drift Events & Model Versions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Fusion Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Isolated single-detector spikes vs. corroborated systemic drift retrains
          </p>

          {visibleDriftEvents.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center border border-dashed border-slate-200 rounded-lg">
              No drift signals fired up to step {streamCursor}.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {visibleDriftEvents.map((evt) => {
                const isSystemic = evt.fusionState === 'Systemic Drift';
                return (
                  <div
                    key={evt.id}
                    className="p-3.5 border border-slate-200 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          isSystemic ? 'text-red-700' : 'text-amber-700'
                        }`}
                      >
                        {isSystemic ? (
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        )}
                        <span>{evt.fusionState}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        Step {evt.step}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 leading-relaxed">{evt.summary}</div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500">
                      Signals: {evt.triggeredDetectors.join(' + ')} · Action: {evt.actionTaken}
                      {evt.ksVirtualFlag ? ' · KS Covariate Shift' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Scored Transaction Feed & Alert Queue */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Transaction Alert Queue &amp; SHAP Inspector
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select any row to open its Investigator Case Packet with SHAP feature attributions
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter ID or channel..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-700"
                />
              </div>

              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                {(['all', 'Decline', 'Review', 'Allow'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setTxFilter(status)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      txFilter === status
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status === 'all' ? 'All' : status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2.5 pr-3 font-medium">Transaction</th>
                  <th className="py-2.5 px-3 font-medium">Channel</th>
                  <th className="py-2.5 px-3 font-medium text-right">Amount</th>
                  <th className="py-2.5 px-3 font-medium text-right">Fraud Score</th>
                  <th className="py-2.5 px-3 font-medium">Decision</th>
                  <th className="py-2.5 px-3 font-medium">Top SHAP Driver</th>
                  <th className="py-2.5 pl-3 font-medium text-right">Truth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No transactions match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  visibleTransactions.map((tx) => {
                    const topDriver = tx.shapTopK[0];
                    return (
                      <tr
                        key={tx.txId}
                        onClick={() => setSelectedTxId(tx.txId)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-900 font-medium whitespace-nowrap">
                          {tx.txId}
                          <span className="text-slate-400 ml-1.5">{tx.modelVersion}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {tx.channel}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-900">
                          ${tx.amount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-900">
                          {(tx.fraudScore * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {tx.decision === 'Decline' && (
                            <span className="inline-flex items-center gap-1 font-medium text-red-700">
                              <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                              Decline
                            </span>
                          )}
                          {tx.decision === 'Review' && (
                            <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                              Review
                            </span>
                          )}
                          {tx.decision === 'Allow' && (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              Allow
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[180px]">
                          {topDriver ? `${topDriver.feature} (${topDriver.contribution >= 0 ? '+' : ''}${topDriver.contribution.toFixed(2)})` : '—'}
                        </td>
                        <td className="py-2.5 pl-3 text-right font-mono tabular-nums whitespace-nowrap">
                          {tx.isFraud === 1 ? (
                            <span className="text-red-700 font-semibold">Fraud</span>
                          ) : (
                            <span className="text-slate-400">Legit</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CasePacketDrawer
        transaction={selectedTx}
        onClose={() => setSelectedTxId(null)}
        onFeedback={onAnalystFeedback}
      />
    </div>
  );
}
