import { ReactNode, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { FullExperimentSuite } from '../types/transactshield';

interface PresentationWorkspaceProps {
  suite: FullExperimentSuite;
  onPrintSlides: () => void;
}

interface SlideDefinition {
  number: number;
  kicker: string;
  title: string;
  speakerNotes: string;
  renderBody: () => ReactNode;
}

export function PresentationWorkspace({ suite, onPrintSlides }: PresentationWorkspaceProps) {
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [showNotes, setShowNotes] = useState<boolean>(true);

  const { config, datasetStats, strategies } = suite;
  const fusion = strategies.find((s) => s.strategyId === 'fusion')!;
  const staticStrat = strategies.find((s) => s.strategyId === 'static')!;
  const alwaysStrat = strategies.find((s) => s.strategyId === 'always_retrain')!;
  const adwinStrat = strategies.find((s) => s.strategyId === 'adwin_only')!;
  const phStrat = strategies.find((s) => s.strategyId === 'ph_only')!;

  const datasetLabel =
    config.dataset === 'ulb' ? 'ULB Credit Card Benchmark' : 'PaySim Mobile-Money Stream';

  const maxRetrains = Math.max(1, ...strategies.map((s) => s.metrics.totalRetrains));

  const slides: SlideDefinition[] = [
    {
      number: 1,
      kicker: 'Fr. Conceicao Rodrigues College of Engineering · Computer Engineering',
      title:
        'TransactShield: A Fused Multi-Detector Approach to Concept-Drift-Resilient Fraud Detection',
      speakerNotes:
        'Introduce the core research thesis: payment fraud distributions shift continuously, and single drift detectors either miss delayed fraud shifts or over-retrain on benign transaction bursts. TransactShield fuses ADWIN, DDM, and Page-Hinkley behind an asymmetric retrain gate.',
      renderBody: () => (
        <div className="h-full flex flex-col justify-between">
          <div className="space-y-4">
            <p className="text-base text-slate-600 max-w-3xl leading-relaxed">
              Real-time adaptive fraud scoring under delayed chargeback labels, class imbalance, and
              non-stationary payment behavior — grounded in the Operational Capability Triad (ORT)
              and two-stage streaming adaptation.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/70">
                <div className="text-xs font-medium text-slate-500">Active Evaluation Stream</div>
                <div className="font-display text-base font-bold text-slate-900 mt-1">
                  {datasetLabel}
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                  {datasetStats.streamCount} txns · {datasetStats.fraudRatePct}% fraud
                </div>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/70">
                <div className="text-xs font-medium text-slate-500">Fusion PR-AUC vs Static</div>
                <div className="font-mono tabular-nums text-xl font-bold text-blue-700 mt-1">
                  {fusion.metrics.prAuc.toFixed(3)}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    vs {staticStrat.metrics.prAuc.toFixed(3)}
                  </span>
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                  Recall@{config.reviewBudgetK}: {(fusion.metrics.recallAtK * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/70">
                <div className="text-xs font-medium text-slate-500">Retrain Restraint</div>
                <div className="font-mono tabular-nums text-xl font-bold text-slate-900 mt-1">
                  -{fusion.metrics.retrainEfficiencyPct}% Retrains
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-500 mt-1">
                  {fusion.metrics.totalRetrains} systemic vs {alwaysStrat.metrics.totalRetrains}{' '}
                  periodic
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-900">Presenter:</span> Sean Pereira ·{' '}
              <span className="font-semibold text-slate-900">Faculty Mentor:</span> Dr. Vijay
              Shelake
            </div>
            <div className="font-mono tabular-nums text-slate-500">
              Scenario: {config.driftScenario} · Delay: {config.labelDelay} txns · Window W=
              {config.policyWindow}
            </div>
          </div>
        </div>
      ),
    },
    {
      number: 2,
      kicker: 'Slide 02 · Presentation Roadmap',
      title: 'Agenda & Research Scope',
      speakerNotes:
        'Walk the panel through the logical progression: from domain challenges and gaps across 5 recent papers, to our 3-signal fusion gate, ORT-aligned evaluation, live experimental findings, and governance impact.',
      renderBody: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              idx: '01',
              heading: 'Operational Fraud Challenges',
              detail:
                'Extreme class imbalance (0.17%–2%), delayed chargeback labels, and adversarial tactics.',
            },
            {
              idx: '02',
              heading: 'Literature Gaps Across 5 Papers',
              detail:
                'Synthesizing Al Lawati (2025), ROSFD (2025), ORT (2026), Şenol (2025), and Chen (2026).',
            },
            {
              idx: '03',
              heading: 'Multi-Detector Drift Fusion',
              detail:
                'Combining ADWIN + DDM (delayed error) with Page-Hinkley (live score stream) and 1D KS check.',
            },
            {
              idx: '04',
              heading: 'Asymmetric Retrain Policy Gate',
              detail:
                'Suppressing isolated noise bursts while acting rapidly on corroborated systemic drift.',
            },
            {
              idx: '05',
              heading: 'ORT Evaluation & SHAP Packets',
              detail:
                'PR-AUC, Recall@K, Amount-Weighted Recall, and additive log-odds case explanations.',
            },
            {
              idx: '06',
              heading: 'Google Colab & SDG Alignment',
              detail:
                'Reproducible River + XGBoost + SHAP notebook and UN SDG 8, 9, and 16 compliance.',
            },
          ].map((item) => (
            <div key={item.idx} className="p-4 border border-slate-200 rounded-lg flex gap-3">
              <span className="font-mono tabular-nums text-xs font-bold text-blue-700 mt-0.5">
                {item.idx}
              </span>
              <div>
                <div className="font-display text-sm font-semibold text-slate-900">
                  {item.heading}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      number: 3,
      kicker: 'Slide 03 · Core Thesis & Novelty',
      title: 'Why Single Drift Detectors Fail in Payment Streams',
      speakerNotes:
        'Emphasize the two failure modes: static models rot silently when fraudsters pivot, while naive single-detector triggers cause destructive retraining churn during holiday spikes or benign virtual drift.',
      renderBody: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full items-stretch">
          <div className="p-5 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-mono font-semibold text-red-700">Static Classifier</div>
            <div className="font-display text-base font-bold text-slate-900">
              Silent Recall Decay
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Frozen decision boundaries cannot track adversarial concept shifts (
              <span className="font-mono">P_t(X, y) ≠ P_t+1(X, y)</span>), causing PR-AUC to collapse
              to{' '}
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {staticStrat.metrics.prAuc.toFixed(3)}
              </span>
              .
            </p>
          </div>
          <div className="p-5 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-mono font-semibold text-amber-700">
              Single-Detector Retrain
            </div>
            <div className="font-display text-base font-bold text-slate-900">
              False-Alarm Model Churn
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Individual monitors trigger on transient benign anomalies or label-lag noise, forcing{' '}
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {Math.max(adwinStrat.metrics.totalRetrains, phStrat.metrics.totalRetrains)}
              </span>{' '}
              unneeded updates and unstable alert queues.
            </p>
          </div>
          <div className="p-5 border border-blue-200 bg-blue-50/40 rounded-lg space-y-2">
            <div className="text-xs font-mono font-semibold text-blue-700">
              TransactShield Fusion
            </div>
            <div className="font-display text-base font-bold text-slate-900">
              Corroborated Adaptation
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Logs 1-detector anomalies for analyst review and commits incremental retraining only
              when ≥2 independent detectors align within policy window{' '}
              <span className="font-mono">W={config.policyWindow}</span>.
            </p>
          </div>
        </div>
      ),
    },
    {
      number: 4,
      kicker: 'Slide 04 · Problem Domain',
      title: 'Four Structural Challenges in Financial Fraud Streams',
      speakerNotes:
        'Explain why accuracy is misleading in fraud detection and why chargeback label latency makes purely supervised drift monitoring insufficient during early attack waves.',
      renderBody: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-display text-sm font-bold text-slate-900">
              1. Extreme Class Imbalance ({datasetStats.fraudRatePct}% Fraud)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              With only {datasetStats.fraudCount} frauds in {datasetStats.streamCount} stream
              transactions, a trivial all-negative classifier achieves &gt;97.5% accuracy while
              missing 100% of financial loss.
            </p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-display text-sm font-bold text-slate-900">
              2. Delayed Ground-Truth Labels ({config.labelDelay} Txn Lag)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dispute confirmation arrives asynchronously. Unsupervised probability-shift signals
              (Page-Hinkley) must bridge the verification gap before error bits arrive.
            </p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-display text-sm font-bold text-slate-900">
              3. Virtual vs. Real Concept Drift
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Seasonal spending shifts change feature marginals <span className="font-mono">P(X)</span>{' '}
              without altering fraud semantics <span className="font-mono">P(y|X)</span>. Retraining
              blindly degrades precision.
            </p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-display text-sm font-bold text-slate-900">
              4. Investigator Queue &amp; Audit Constraints
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fraud teams can only inspect top-K ({config.reviewBudgetK}) flagged cases and require
              deterministic SHAP reason codes for regulatory accountability.
            </p>
          </div>
        </div>
      ),
    },
    {
      number: 5,
      kicker: 'Slide 05 · Related Work Synthesis',
      title: 'Research Foundation & Identified Gaps (5 Attached Papers)',
      speakerNotes:
        'Show the panel how TransactShield bridges all five attached papers rather than reinventing isolated components.',
      renderBody: () => (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Study</th>
                <th className="py-2 px-3 font-semibold">Key Mechanism</th>
                <th className="py-2 pl-3 font-semibold">Integrated / Extended in TransactShield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">
                  Al Lawati et al. (2025)
                </td>
                <td className="py-2.5 px-3">MI + ADASYN + EDDM/ADWIN on CNN</td>
                <td className="py-2.5 pl-3">
                  Imbalance-weighted replay + multi-speed drift gating + SHAP packets
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">
                  Vivek (ROSFD, 2025)
                </td>
                <td className="py-2.5 px-3">Stage-I/II warm-start + train-only-when-required</td>
                <td className="py-2.5 pl-3">
                  500-txn warm-start + corroborated fusion instead of isolated detector runs
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">
                  Naqvi (2026) — ORT
                </td>
                <td className="py-2.5 px-3">Causal leakage-free ops &amp; alert-budget metrics</td>
                <td className="py-2.5 pl-3">
                  PR-AUC, Recall@K, Amount-Weighted Recall, 3-tier Allow/Review/Decline policy
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">
                  Şenol et al. (2025)
                </td>
                <td className="py-2.5 px-3">Benign vs. adversarial drift discrimination</td>
                <td className="py-2.5 pl-3">
                  Asymmetric suppression of isolated benign anomalies at sub-millisecond cost
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-slate-900 whitespace-nowrap">
                  Chen et al. (2026)
                </td>
                <td className="py-2.5 px-3">FELK (1D KS check) &amp; FDM virtual drift retention</td>
                <td className="py-2.5 pl-3">
                  Per-event 1D KS covariate shift diagnostic inside drift audit logs
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      number: 6,
      kicker: 'Slide 06 · Parallel Drift Layer',
      title: 'Three Complementary Signals Across Error & Score Streams',
      speakerNotes:
        'Highlight why heterogeneity matters: ADWIN catches gradual shifts, DDM tracks PAC variance bounds, and Page-Hinkley reacts to score inflation immediately without waiting for delayed chargebacks.',
      renderBody: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-mono font-semibold text-blue-700">Signal 1 · ADWIN</div>
            <div className="font-display text-sm font-bold text-slate-900">
              Adaptive Windowing (Delayed Error)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dynamically splits historical binary error bit sub-windows when{' '}
              <span className="font-mono">|μ_0 − μ_1| &gt; ε_cut</span> via Hoeffding bounds.
              Excels on gradual transitions.
            </p>
          </div>
          <div className="p-5 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-mono font-semibold text-slate-700">Signal 2 · DDM</div>
            <div className="font-display text-sm font-bold text-slate-900">
              Drift Detection Method (Delayed Error)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tracks running error rate <span className="font-mono">p_i + s_i</span> against
              historical minimum <span className="font-mono">p_min + 3.0·s_min</span>. Sensitive to
              abrupt error spikes.
            </p>
          </div>
          <div className="p-5 border border-slate-200 rounded-lg space-y-2">
            <div className="text-xs font-mono font-semibold text-emerald-700">
              Signal 3 · Page-Hinkley
            </div>
            <div className="font-display text-sm font-bold text-slate-900">
              Cumulative Mean Shift (Live Scores)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Operates on unlabeled calibrated probabilities <span className="font-mono">p(x)</span>
              , detecting emerging distributional shifts before chargeback delay expires.
            </p>
          </div>
        </div>
      ),
    },
    {
      number: 7,
      kicker: 'Slide 07 · Decision Gate',
      title: 'Asymmetric Multi-Detector Fusion Policy',
      speakerNotes:
        'Walk through the three states: No Drift, Isolated Drift (logged for human triage without destabilizing the model), and Systemic Drift (2+ corroborated detectors within W triggering selective incremental retrain).',
      renderBody: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
              <div className="text-xs font-mono font-semibold text-emerald-700">
                0 Detectors Active
              </div>
              <div className="font-display text-base font-bold text-slate-900">No Drift</div>
              <p className="text-xs text-slate-600">
                Normal calibrated scoring and 3-tier routing (Allow / Review / Decline). Zero
                retrain overhead.
              </p>
            </div>
            <div className="p-4 border border-amber-200 bg-amber-50/40 rounded-lg space-y-1.5">
              <div className="text-xs font-mono font-semibold text-amber-700">
                1 Detector Active
              </div>
              <div className="font-display text-base font-bold text-slate-900">Isolated Drift</div>
              <p className="text-xs text-slate-700">
                Logged to audit trail (<span className="font-mono tabular-nums">{fusion.metrics.isolatedLogsCount}</span>{' '}
                events suppressed) for analyst inspection.{' '}
                <strong>Model weights remain frozen.</strong>
              </p>
            </div>
            <div className="p-4 border border-red-200 bg-red-50/40 rounded-lg space-y-1.5">
              <div className="text-xs font-mono font-semibold text-red-700">
                ≥2 Detectors within W={config.policyWindow}
              </div>
              <div className="font-display text-base font-bold text-slate-900">Systemic Drift</div>
              <p className="text-xs text-slate-700">
                Confirmed shift triggers imbalance-weighted incremental update on recent confirmed
                window and increments model version.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono">
            Cooldown Guard (85 txns) + 1D KS Virtual Drift Diagnostic (Chen et al., 2026) prevent
            oscillating retrains right after model adaptation.
          </div>
        </div>
      ),
    },
    {
      number: 8,
      kicker: 'Slide 08 · End-to-End Architecture',
      title: 'Six-Stage Streaming Pipeline & Investigator Case Packets',
      speakerNotes:
        'Describe the causal data flow: Stage-I warm-start initializes weights on 500 transactions, Stage-II scores sequentially with zero future leakage, emits Top-K SHAP log-odds contributions, and versions every Systemic Drift update.',
      renderBody: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {[
              ['Stage 1 · Stream Ingestion', 'Time-ordered ULB / PaySim arrival with causal timestamps'],
              ['Stage 2 · Leakage-Free Prep', 'Rolling baseline standardization strictly prior to scoring'],
              ['Stage 3 · Ensemble + SHAP', '3-learner ensemble + exact additive log-odds Top-K drivers'],
              ['Stage 4 · Parallel Monitors', 'ADWIN & DDM on delayed labels + Page-Hinkley on scores'],
              ['Stage 5 · Fusion Policy Gate', 'Asymmetric Isolated vs. Systemic arbitration window W'],
              ['Stage 6 · Versioned Retrain', 'Class-weighted replay update + audit artifact bump (v1.N)'],
            ].map(([stage, desc]) => (
              <div key={stage} className="p-3.5 border border-slate-200 rounded-lg space-y-1">
                <div className="font-display font-semibold text-slate-900">{stage}</div>
                <div className="text-slate-600 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>

          <div className="p-4 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="font-semibold text-slate-900">Three-Tier Operational Policy:</span>{' '}
              <span className="text-emerald-700 font-medium">Allow (&lt;45%)</span> ·{' '}
              <span className="text-amber-700 font-medium">Review (45%–76%)</span> ·{' '}
              <span className="text-red-700 font-medium">Decline (≥76%)</span>
            </div>
            <div className="font-mono tabular-nums text-slate-500">
              Latest Artifact: {fusion.modelVersions[fusion.modelVersions.length - 1]?.version ?? 'v1.0'}
            </div>
          </div>
        </div>
      ),
    },
    {
      number: 9,
      kicker: 'Slide 09 · Evaluation Protocol (Naqvi, 2026)',
      title: 'Operational Capability Triad (ORT) Metrics',
      speakerNotes:
        'Justify why we replaced naive accuracy with ORT-B and ORT-C metrics: rare-fraud PR-AUC, fixed-FPR precision, analyst budget Recall@K, and net dollar loss prevented.',
      renderBody: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-display text-sm font-bold text-slate-900">
              PR-AUC &amp; Precision @ 1% FPR
            </div>
            <p className="text-slate-600 leading-relaxed">
              Evaluates ranking quality across severe imbalance without distortion from abundant true
              negatives. Fusion achieves{' '}
              <span className="font-mono font-semibold text-slate-900">
                PR-AUC {fusion.metrics.prAuc.toFixed(3)}
              </span>{' '}
              and{' '}
              <span className="font-mono font-semibold text-slate-900">
                {(fusion.metrics.precisionAt1PctFpr * 100).toFixed(1)}%
              </span>{' '}
              precision at 1% false-positive tolerance.
            </p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-display text-sm font-bold text-slate-900">
              Recall@{config.reviewBudgetK} &amp; Precision@{config.reviewBudgetK}
            </div>
            <p className="text-slate-600 leading-relaxed">
              Simulates real analyst capacity constraints: captures{' '}
              <span className="font-mono font-semibold text-slate-900">
                {(fusion.metrics.recallAtK * 100).toFixed(1)}%
              </span>{' '}
              of all stream frauds within the top {config.reviewBudgetK} alerts (Precision@K:{' '}
              <span className="font-mono font-semibold text-slate-900">
                {(fusion.metrics.precisionAtK * 100).toFixed(1)}%
              </span>
              ).
            </p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-display text-sm font-bold text-slate-900">
              Amount-Weighted Recall &amp; Loss Avoided
            </div>
            <p className="text-slate-600 leading-relaxed">
              Weights fraud detection by transaction dollar value:{' '}
              <span className="font-mono font-semibold text-slate-900">
                {(fusion.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%
              </span>{' '}
              volume recovered, avoiding{' '}
              <span className="font-mono font-semibold text-slate-900">
                ${fusion.metrics.expectedLossAvoided.toLocaleString()}
              </span>{' '}
              in net loss.
            </p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-display text-sm font-bold text-slate-900">
              Detection Latency &amp; Retrain Cost
            </div>
            <p className="text-slate-600 leading-relaxed">
              Measures transactions from true drift onset to adaptation (
              <span className="font-mono font-semibold text-slate-900">
                {fusion.metrics.detectionLatencyTxns !== null
                  ? `${fusion.metrics.detectionLatencyTxns} txns`
                  : 'N/A'}
              </span>
              ) alongside false-alarm retraining rate.
            </p>
          </div>
        </div>
      ),
    },
    {
      number: 10,
      kicker: 'Slide 10 · Live Experimental Results',
      title: `Benchmark Comparison (${datasetLabel} · ${config.driftScenario})`,
      speakerNotes:
        'Present the full 6-strategy comparative table dynamically computed from the current simulation run.',
      renderBody: () => (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Strategy</th>
                <th className="py-2 px-2.5 font-semibold text-right">PR-AUC</th>
                <th className="py-2 px-2.5 font-semibold text-right">Prec@1%FPR</th>
                <th className="py-2 px-2.5 font-semibold text-right">
                  Recall@{config.reviewBudgetK}
                </th>
                <th className="py-2 px-2.5 font-semibold text-right">Amt-Wtd</th>
                <th className="py-2 px-2.5 font-semibold text-right">Retrains</th>
                <th className="py-2 pl-2.5 font-semibold text-right">False Retrains</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {strategies.map((s) => (
                <tr
                  key={s.strategyId}
                  className={
                    s.strategyId === 'fusion'
                      ? 'bg-blue-50/60 font-semibold text-slate-900'
                      : 'text-slate-700'
                  }
                >
                  <td className="py-2 pr-3 font-sans font-medium text-slate-900">
                    {s.shortLabel}
                  </td>
                  <td className="py-2 px-2.5 text-right">{s.metrics.prAuc.toFixed(3)}</td>
                  <td className="py-2 px-2.5 text-right">
                    {(s.metrics.precisionAt1PctFpr * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-2.5 text-right">
                    {(s.metrics.recallAtK * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-2.5 text-right">
                    {(s.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-2.5 text-right">{s.metrics.totalRetrains}</td>
                  <td className="py-2 pl-2.5 text-right">{s.metrics.falseRetrains}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      number: 11,
      kicker: 'Slide 11 · Efficiency & Noise Restraint',
      title: 'PR-AUC Preservation vs. Retrain Frequency',
      speakerNotes:
        'Point out the asymmetric benefit: Fusion preserves high PR-AUC while cutting total retrains sharply compared to fixed-schedule periodic retraining and eliminating single-detector false alarms.',
      renderBody: () => (
        <div className="space-y-3">
          {strategies.map((s) => {
            const prPct = Math.max(4, s.metrics.prAuc * 100);
            const retPct =
              s.metrics.totalRetrains === 0
                ? 0
                : Math.max(4, (s.metrics.totalRetrains / maxRetrains) * 100);
            return (
              <div key={s.strategyId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-900">{s.shortLabel}</span>
                  <span className="font-mono tabular-nums text-slate-600">
                    PR-AUC {s.metrics.prAuc.toFixed(3)} · {s.metrics.totalRetrains} retrains (
                    {s.metrics.falseRetrains} false)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-2 bg-slate-100 rounded-xs overflow-hidden">
                    <div className="h-full bg-blue-700" style={{ width: `${prPct}%` }} />
                  </div>
                  <div className="h-2 bg-slate-100 rounded-xs overflow-hidden">
                    <div className="h-full bg-slate-800" style={{ width: `${retPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="pt-2 flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-blue-700 inline-block" /> PR-AUC (Higher Better)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-slate-800 inline-block" /> Total Retrains (Lower = More
              Stable)
            </span>
          </div>
        </div>
      ),
    },
    {
      number: 12,
      kicker: 'Slide 12 · Impact, Ethics & Conclusion',
      title: 'SDG Alignment, Governance & Future Work',
      speakerNotes:
        'Conclude with UN SDG 8/9/16 alignment, compliance requirements (GDPR/PSD2, SHAP transparency), and next steps in Google Colab using full-scale River + XGBoost pipelines.',
      renderBody: () => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg space-y-1">
              <div className="text-xs font-mono font-semibold text-blue-700">UN SDG 8 &amp; 9</div>
              <div className="font-display text-sm font-bold text-slate-900">
                Resilient Payment Rails
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Minimizes merchant false declines while keeping real-time fraud defenses adaptive
                across evolving digital channels.
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg space-y-1">
              <div className="text-xs font-mono font-semibold text-blue-700">UN SDG 16</div>
              <div className="font-display text-sm font-bold text-slate-900">
                Reducing Illicit Flows
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Recovers{' '}
                <span className="font-mono font-semibold text-slate-900">
                  ${fusion.metrics.expectedLossAvoided.toLocaleString()}
                </span>{' '}
                in simulated fraud exposure with auditable SHAP case packets.
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg space-y-1">
              <div className="text-xs font-mono font-semibold text-blue-700">Next Roadmap</div>
              <div className="font-display text-sm font-bold text-slate-900">
                Colab &amp; Federated FDM
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Export the bundled <span className="font-mono">.ipynb</span> to run full Kaggle
                ULB/PaySim datasets and extend toward federated virtual-drift retention.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
            <strong>Key Takeaway:</strong> Asymmetric fusion of ADWIN, DDM, and Page-Hinkley delivers
            higher fraud ranking accuracy than static models while eliminating{' '}
            <span className="font-mono font-semibold">{fusion.metrics.retrainEfficiencyPct}%</span>{' '}
            of periodic retrain churn.
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setActiveSlideIdx((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveSlideIdx((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [slides.length]);

  const currentSlide = slides[activeSlideIdx];

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Interactive On-Screen Slide Deck */}
      <div className="no-print space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
              disabled={activeSlideIdx === 0}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono tabular-nums text-slate-700 font-medium">
              Slide {currentSlide.number} / {slides.length}
            </span>
            <button
              type="button"
              onClick={() => setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1))}
              disabled={activeSlideIdx === slides.length - 1}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNotes((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                showNotes
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showNotes ? 'Hide Speaker Notes' : 'Show Speaker Notes'}</span>
            </button>
            <button
              type="button"
              onClick={onPrintSlides}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download 12-Slide PDF</span>
            </button>
          </div>
        </div>

        {/* 16:9 Slide Canvas */}
        <section
          aria-label={`Slide ${currentSlide.number}: ${currentSlide.title}`}
          className="bg-white border border-slate-200 rounded-xl p-8 md:p-10 min-h-[440px] flex flex-col justify-between shadow-xs"
        >
          <div className="space-y-2 pb-6 border-b border-slate-100">
            <div className="text-xs font-medium text-blue-700">{currentSlide.kicker}</div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 headline-balance">
              {currentSlide.title}
            </h2>
          </div>

          <div className="py-6 flex-1 flex flex-col justify-center">
            {currentSlide.renderBody()}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
            <span>TransactShield · Sean Pereira &amp; Dr. Vijay Shelake</span>
            <span>
              {currentSlide.number} / {slides.length}
            </span>
          </div>
        </section>

        {/* Speaker Notes Box */}
        {showNotes && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-xs font-semibold text-slate-900 mb-1">Presenter Notes</div>
            <p className="text-xs text-slate-600 leading-relaxed">{currentSlide.speakerNotes}</p>
          </div>
        )}

        {/* Slide Index Strip */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {slides.map((s, idx) => {
            const isCurrent = idx === activeSlideIdx;
            return (
              <button
                key={s.number}
                type="button"
                onClick={() => setActiveSlideIdx(idx)}
                className={`p-2.5 rounded-lg border text-left transition-colors ${
                  isCurrent
                    ? 'border-blue-700 bg-blue-50/50 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-mono tabular-nums text-[11px] font-semibold text-blue-700">
                  Slide {String(s.number).padStart(2, '0')}
                </div>
                <div className="text-[11px] font-medium truncate mt-0.5">{s.title}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Print-Only All-Slides Layout for Clean PDF Export */}
      <div className="hidden print:block space-y-8">
        {slides.map((slide) => (
          <section
            key={slide.number}
            className="bg-white border border-slate-300 rounded-xl p-8 min-h-[540px] flex flex-col justify-between print-avoid-break print-break-after"
          >
            <div className="space-y-1.5 pb-4 border-b border-slate-200">
              <div className="text-xs font-medium text-blue-700">{slide.kicker}</div>
              <h2 className="font-display text-2xl font-bold text-slate-900">{slide.title}</h2>
            </div>
            <div className="py-6 flex-1 flex flex-col justify-center">{slide.renderBody()}</div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500">
              <span>TransactShield · Fr. CRCE Computer Engineering</span>
              <span>
                Slide {slide.number} / {slides.length}
              </span>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
