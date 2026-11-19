import { Download } from 'lucide-react';
import { FullExperimentSuite } from '../types/transactshield';

interface ReportWorkspaceProps {
  suite: FullExperimentSuite;
  onExportMarkdown: () => void;
  onPrintPdf: () => void;
}

export function ReportWorkspace({
  suite,
  onExportMarkdown,
  onPrintPdf,
}: ReportWorkspaceProps) {
  const { config, datasetStats, strategies } = suite;
  const fusion = strategies.find((s) => s.strategyId === 'fusion')!;
  const staticStrat = strategies.find((s) => s.strategyId === 'static')!;
  const alwaysStrat = strategies.find((s) => s.strategyId === 'always_retrain')!;

  const datasetTitle =
    config.dataset === 'ulb'
      ? 'European Credit Card Fraud (ULB Benchmark)'
      : 'PaySim Synthetic Mobile-Money Stream';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Action Header */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-slate-600">
          Report dynamically synced to active experiment:{' '}
          <span className="font-semibold text-slate-900">{datasetTitle}</span> ·{' '}
          <span className="font-mono tabular-nums">{config.driftScenario}</span> ·{' '}
          <span className="font-mono tabular-nums">K={config.reviewBudgetK}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onExportMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export .md</span>
          </button>
          <button
            type="button"
            onClick={onPrintPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Formal Report Document */}
      <article className="bg-white border border-slate-200 rounded-xl p-8 md:p-12 space-y-10 text-slate-800 leading-relaxed">
        {/* Title Block */}
        <header className="pb-8 border-b border-slate-200 space-y-3">
          <div className="text-xs font-medium text-blue-700">
            Technical Research Report · Concept-Drift-Resilient Financial ML
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 headline-balance">
            TransactShield: A Fused Multi-Detector Approach to Concept-Drift-Resilient Fraud Detection
          </h1>
          <div className="text-sm text-slate-600 pt-1">
            Sean Pereira (Computer Engineering, Fr. Conceicao Rodrigues College of Engineering) ·
            Faculty Mentor: Dr. Vijay Shelake
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500">
            Evaluation Stream: {datasetTitle} · {datasetStats.streamCount} transactions (
            {datasetStats.fraudRatePct}% fraud) · Label Delay: {config.labelDelay} txns · Policy
            Window W: {config.policyWindow} txns
          </div>
        </header>

        {/* Abstract */}
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">Abstract</h2>
          <p className="text-[15px] text-slate-700">
            Payment fraud tactics evolve continuously, creating concept drift (
            <span className="font-mono text-xs">P_t(X, y) ≠ P_t+1(X, y)</span>) that degrades static
            machine learning classifiers. Conversely, reacting to every isolated statistical alarm
            causes unnecessary retraining, decision-boundary instability, and high computational
            cost. <strong>TransactShield</strong> introduces an asymmetric multi-detector fusion
            architecture that combines three complementary drift signals in parallel:{' '}
            <strong>ADWIN</strong> and <strong>DDM</strong> on delayed binary prediction errors, and{' '}
            <strong>Page-Hinkley</strong> on label-independent fraud score distributions. By
            logging single-detector alarms as <em>Isolated Drift</em> for analyst inspection and
            triggering incremental adaptation (<em>train-only-when-required</em>) only when multiple
            independent detectors confirm <em>Systemic Drift</em>, TransactShield achieved{' '}
            <strong className="font-mono tabular-nums">
              PR-AUC {fusion.metrics.prAuc.toFixed(3)}
            </strong>
            ,{' '}
            <strong className="font-mono tabular-nums">
              Recall@{config.reviewBudgetK} {(fusion.metrics.recallAtK * 100).toFixed(1)}%
            </strong>
            , and{' '}
            <strong className="font-mono tabular-nums">
              Amount-Weighted Recall {(fusion.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%
            </strong>
            —cutting model retrains by{' '}
            <strong className="font-mono tabular-nums">
              {fusion.metrics.retrainEfficiencyPct}%
            </strong>{' '}
            compared to periodic retraining ({fusion.metrics.totalRetrains} vs.{' '}
            {alwaysStrat.metrics.totalRetrains} retrains) while suppressing{' '}
            {fusion.metrics.isolatedLogsCount} isolated noise anomalies.
          </p>
        </section>

        {/* 1. Problem Statement & Motivation */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900">
            1. Introduction &amp; Operational Fraud Challenges
          </h2>
          <p className="text-[15px] text-slate-700">
            Real-time payment systems must authorize transactions within tight latency budgets while
            defending against adversarial behavior across card-present (CP), card-not-present (CNP),
            and mobile-money channels. Drawing from the TransactShield proposal and recent empirical
            literature (Al Lawati et al., 2025; Naqvi, 2026), four interconnected challenges define
            the problem space:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-4 border border-slate-200 rounded-lg space-y-1">
              <div className="font-semibold text-sm text-slate-900">
                1.1 Severe Class Imbalance &amp; Ranking Focus
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fraudulent activity typically constitutes 0.17%–2% of payment volume. Standard
                accuracy metrics exceed 98% even for degenerate all-negative models, requiring{' '}
                <strong>PR-AUC</strong>, <strong>Precision @ 1% FPR</strong>, and alert-budgeted{' '}
                <strong>Recall@K</strong>.
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg space-y-1">
              <div className="font-semibold text-sm text-slate-900">
                1.2 Asynchronous &amp; Delayed Ground Truth
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chargebacks and dispute resolutions arrive hours or days after authorization (modeled
                here with a <span className="font-mono">{config.labelDelay}</span>-transaction lag),
                leaving purely label-dependent error monitors blind during early attack surges.
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg space-y-1">
              <div className="font-semibold text-sm text-slate-900">
                1.3 False Retraining Instability
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Single drift detectors cannot reliably separate transient benign bursts (e.g.,
                promotional spending surges or virtual covariate noise) from structural fraud pivots,
                causing over-adaptation and model churn.
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg space-y-1">
              <div className="font-semibold text-sm text-slate-900">
                1.4 Investigator Explainability &amp; Governance
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Regulated financial workflows require per-transaction SHAP feature attributions,
                model version traceability, and auditable drift histories rather than opaque black-box
                blocks.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Literature Synthesis */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900">
            2. Literature Survey &amp; Synthesis of Attached Research
          </h2>
          <p className="text-[15px] text-slate-700">
            TransactShield synthesizes complementary breakthroughs across five foundational works
            and resolves the integration gaps between them:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Research Study</th>
                  <th className="py-2.5 px-3 font-semibold">Core Contribution</th>
                  <th className="py-2.5 px-3 font-semibold">Adopted in TransactShield</th>
                  <th className="py-2.5 pl-3 font-semibold">Gap Addressed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 whitespace-nowrap">
                    Al Lawati et al. (2025)
                  </td>
                  <td className="py-3 px-3">
                    MI + SelectKBest + ADASYN preprocessing with EDDM &amp; ADWIN dual drift
                    detection on CNN
                  </td>
                  <td className="py-3 px-3">
                    Class-imbalance weighting during incremental replay &amp; complementary abrupt +
                    gradual drift pairing
                  </td>
                  <td className="py-3 pl-3">
                    Adds asymmetric retrain suppression and per-transaction SHAP explanations
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 whitespace-nowrap">
                    Vivek (ROSFD, 2025)
                  </td>
                  <td className="py-3 px-3">
                    Stage-I offline warm-start + Stage-II real-time adaptation; evaluates DDM, EDDM,
                    ADWIN across 5 datasets
                  </td>
                  <td className="py-3 px-3">
                    Two-stage cold-start mitigation &amp; &ldquo;train-only-when-required&rdquo;
                    cost-benefit evaluation
                  </td>
                  <td className="py-3 pl-3">
                    Replaces competing single-detector runs with an explicit multi-signal fusion
                    gate
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 whitespace-nowrap">
                    Naqvi (2026) — ORT
                  </td>
                  <td className="py-3 px-3">
                    Systematic review introducing Operational Capability Triad (ORT-A/B/C) across 77
                    studies
                  </td>
                  <td className="py-3 px-3">
                    Causal leakage-free features, PR-AUC, Recall@K, Amount-Weighted Recall,
                    3-tier calibrated decisions, case packets
                  </td>
                  <td className="py-3 pl-3">
                    Operationalizes ORT in a live executable streaming &amp; reporting prototype
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 whitespace-nowrap">
                    Şenol et al. (2025)
                  </td>
                  <td className="py-3 px-3">
                    Domain knowledge-enhanced dual-LLM + OCDD for distinguishing benign vs.
                    fraudulent drift
                  </td>
                  <td className="py-3 px-3">
                    Conceptual separation between benign distributional shifts and adversarial
                    concept pivots
                  </td>
                  <td className="py-3 pl-3">
                    Achieves low-latency numerical drift gating without per-transaction LLM overhead
                  </td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-slate-900 whitespace-nowrap">
                    Chen et al. (2026)
                  </td>
                  <td className="py-3 px-3">
                    FELK (1D KS early-leave) &amp; FDM dual-model retention for virtual drift P(X)
                  </td>
                  <td className="py-3 px-3">
                    Diagnostic 1D KS covariate-shift check inside drift events &amp; recurring
                    knowledge preservation
                  </td>
                  <td className="py-3 pl-3">
                    Integrates unsupervised covariate diagnostics directly alongside error monitors
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Methodology & Architecture */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900">
            3. Methodology &amp; Multi-Detector Fusion Architecture
          </h2>
          <p className="text-[15px] text-slate-700">
            TransactShield executes a six-stage streaming pipeline: (1) Transaction Stream Ingestion,
            (2) Time-Respecting Causal Feature Assembly, (3) Online Adaptive Ensemble Scoring +
            SHAP Top-K Attribution, (4) Parallel 3-Detector Drift Layer, (5) Asymmetric Fusion
            Decision Gate, and (6) Selective Incremental Retraining &amp; Model Versioning.
          </p>

          {/* Clean System Flow Diagram */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg overflow-x-auto print-avoid-break">
            <pre className="font-mono text-xs text-slate-800 leading-relaxed whitespace-pre">
{`Transaction Stream ──▶ Causal Feature Prep ──▶ Online Adaptive Ensemble (v1.N)
                                                    │              │
                        ┌───────────────────────────┘              ▼
                        │                               SHAP Case Packet + Score
                        ▼                               (Allow / Review / Decline)
             ┌──────────────────────┐
             │ Parallel Drift Layer │◀── Delayed Labels (Horizon = ${config.labelDelay} txns)
             │  • ADWIN (Error)     │
             │  • DDM   (Error)     │
             │  • Page-Hinkley (p)  │◀── Live Score Stream (No Label Wait)
             └──────────┬───────────┘
                        ▼
             ┌──────────────────────┐
             │  Fusion Policy Gate  │ (Policy Window W = ${config.policyWindow} txns)
             └─┬────────┬─────────┬─┘
      0 Signals│1 Signal│≥2 Signals
               ▼        ▼         ▼
          No Drift   Isolated   Systemic Drift
                     (Logged)   (Incremental Retrain -> v1.N+1)`}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
              <div className="font-semibold text-sm text-slate-900">ADWIN (Label-Dependent)</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Maintains a variable-length window over delayed binary error bits{' '}
                <span className="font-mono">e_t = I(y_hat != y)</span>, cutting stale history when
                sub-window means diverge beyond Hoeffding&apos;s bound.
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
              <div className="font-semibold text-sm text-slate-900">DDM (Label-Dependent)</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Monitors online error rate <span className="font-mono">p_i</span> and standard
                deviation <span className="font-mono">s_i</span>, flagging warning at{' '}
                <span className="font-mono">2.0σ</span> and drift at{' '}
                <span className="font-mono">3.0σ</span> above historical minimum.
              </p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg space-y-1.5">
              <div className="font-semibold text-sm text-slate-900">
                Page-Hinkley (Label-Independent)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Accumulates signed deviations of live fraud probabilities{' '}
                <span className="font-mono">p(x)</span> from their running mean, providing early
                warning prior to chargeback label arrival.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Experimental Results & Comparative Findings */}
        <section className="space-y-4">
          <h2 className="font-display text-xl font-bold text-slate-900">
            4. Experimental Findings &amp; ORT Benchmark Comparison
          </h2>
          <p className="text-[15px] text-slate-700">
            Across {datasetStats.streamCount} streaming transactions on{' '}
            <strong>{datasetTitle}</strong> under the{' '}
            <strong className="font-mono">{config.driftScenario}</strong> drift protocol, the six
            competing adaptation strategies produced the following verified metrics:
          </p>

          <div className="overflow-x-auto print-avoid-break">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 pr-4 font-semibold">Strategy</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">PR-AUC</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">ROC-AUC</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Prec@1%FPR</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">
                    Recall@{config.reviewBudgetK}
                  </th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Amt-Wtd Recall</th>
                  <th className="py-2.5 px-2.5 font-semibold text-right">Retrains</th>
                  <th className="py-2.5 pl-2.5 font-semibold text-right">False Retrains</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {strategies.map((s) => (
                  <tr
                    key={s.strategyId}
                    className={
                      s.strategyId === 'fusion' ? 'bg-blue-50/50 font-semibold text-slate-900' : ''
                    }
                  >
                    <td className="py-2.5 pr-4 font-sans font-medium text-slate-900">
                      {s.strategyName}
                    </td>
                    <td className="py-2.5 px-2.5 text-right">{s.metrics.prAuc.toFixed(3)}</td>
                    <td className="py-2.5 px-2.5 text-right">{s.metrics.rocAuc.toFixed(3)}</td>
                    <td className="py-2.5 px-2.5 text-right">
                      {(s.metrics.precisionAt1PctFpr * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right">
                      {(s.metrics.recallAtK * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right">
                      {(s.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right">{s.metrics.totalRetrains}</td>
                    <td className="py-2.5 pl-2.5 text-right">{s.metrics.falseRetrains}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 pt-2">
            <li>
              <strong>Adaptive Recovery Over Static Baselines:</strong> TransactShield Fusion
              improves rare-fraud PR-AUC from{' '}
              <span className="font-mono font-semibold">{staticStrat.metrics.prAuc.toFixed(3)}</span>{' '}
              (Static) to{' '}
              <span className="font-mono font-semibold">{fusion.metrics.prAuc.toFixed(3)}</span>,
              preventing <span className="font-mono font-semibold">${fusion.metrics.expectedLossAvoided.toLocaleString()}</span> in net fraud exposure within the top-{config.reviewBudgetK} investigator queue.
            </li>
            <li>
              <strong>Asymmetric Noise Suppression:</strong> Single detectors fired on transient
              benign anomalies, whereas Fusion logged{' '}
              <span className="font-mono font-semibold">{fusion.metrics.isolatedLogsCount}</span>{' '}
              isolated signals for human review without triggering uncorroborated model updates (
              <span className="font-mono font-semibold">{fusion.metrics.falseRetrains}</span> false
              retrains).
            </li>
            <li>
              <strong>Operational Efficiency:</strong> Selective retraining achieved a{' '}
              <span className="font-mono font-semibold">
                {fusion.metrics.retrainEfficiencyPct}%
              </span>{' '}
              reduction in retrain operations compared to fixed-interval updating while preserving
              calibrated decision thresholds.
            </li>
          </ul>
        </section>

        {/* 5. Governance, Ethics & Limitations */}
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold text-slate-900">
            5. Compliance, Limitations &amp; Future Directions
          </h2>
          <p className="text-[15px] text-slate-700">
            This prototype operates on replayed and synthetic transaction streams aligned with UN SDG
            9 (resilient financial infrastructure) and SDG 16 (reducing illicit financial flows).
            Production banking deployment requires regulatory review (GDPR, PSD2, BSA/AML),
            segment-level fairness auditing across demographic groups, and institutional data
            governance sign-off. Future extensions include federated virtual-drift handling via FELK
            + FDM (Chen et al., 2026) and integrating human analyst feedback from SHAP case packets
            directly into active sample weighting.
          </p>
        </section>

        {/* 6. References */}
        <section className="pt-6 border-t border-slate-200 space-y-2">
          <h2 className="font-display text-base font-bold text-slate-900">References</h2>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs text-slate-600">
            <li>
              Al Lawati, H. M. R., Zainal, A., Al-Rimy, B. A. S., et al. (2025). An Integrated
              Preprocessing and Drift Detection Approach With Adaptive Windowing for Fraud Detection
              in Payment Systems. <em>IEEE Access</em>, 13, 92036–92056.
            </li>
            <li>
              Şenol, A., Agrawal, G., &amp; Liu, H. (2025). Domain Knowledge-Enhanced LLMs for
              Fraud and Concept Drift Detection. <em>arXiv:2506.21443</em>.
            </li>
            <li>
              Naqvi, S. H. A. (2026). Fraud Detection Using Machine Learning in Financial
              Transactions: A Systematic Review. <em>Veredas do Direito</em>, 23(2), e234187.
            </li>
            <li>
              Vivek, Y. (2025). ROSFD: Robust Online Streaming Fraud Detection with Resilience to
              Concept Drift in Data Streams. <em>NIT Warangal</em>.
            </li>
            <li>
              Chen, X., Wang, S., Zhang, T., Yang, G., &amp; Yang, Y. (2026). Virtual concept drift
              detection and adaptation in federated data stream learning.{' '}
              <em>International Journal of Data Science and Analytics</em>, 21:46.
            </li>
          </ol>
        </section>
      </article>
    </div>
  );
}
