import { FullExperimentSuite } from '../types/transactshield';

export function generateReportMarkdown(suite: FullExperimentSuite): string {
  const { config, datasetStats, strategies } = suite;
  const fusion = strategies.find((s) => s.strategyId === 'fusion')!;
  const staticStrat = strategies.find((s) => s.strategyId === 'static')!;
  const alwaysStrat = strategies.find((s) => s.strategyId === 'always_retrain')!;

  const datasetLabel =
    config.dataset === 'ulb'
      ? 'European Credit Card Fraud (ULB Benchmark)'
      : 'PaySim Synthetic Mobile-Money Stream';

  const tableRows = strategies
    .map(
      (s) =>
        `| ${s.strategyName} | ${s.metrics.prAuc.toFixed(3)} | ${(s.metrics.precisionAt1PctFpr * 100).toFixed(1)}% | ${(s.metrics.recallAtK * 100).toFixed(1)}% | ${(s.metrics.amountWeightedRecallAtK * 100).toFixed(1)}% | ${s.metrics.totalRetrains} | ${s.metrics.falseRetrains} | ${s.metrics.detectionLatencyTxns !== null ? `${s.metrics.detectionLatencyTxns} txns` : '—'} |`
    )
    .join('\n');

  return `# TransactShield: A Fused Multi-Detector Approach to Concept-Drift-Resilient Fraud Detection

**Author:** Sean Pereira (Computer Engineering, Fr. Conceicao Rodrigues College of Engineering)  
**Faculty Mentor:** Dr. Vijay Shelake  
**Generated Experiment Context:** ${datasetLabel} · Scenario: \`${config.driftScenario}\` · Label Delay: ${config.labelDelay} txns · Policy Window: ${config.policyWindow} txns · Alert Budget K: ${config.reviewBudgetK}

---

## Abstract

Financial payment fraud evolves rapidly as adversaries shift tactics across channels, amounts, and behavioral patterns—inducing **concept drift** ($P_t(X, y) \\neq P_{t+1}(X, y)$) that degrades static machine learning models. Conversely, retraining indiscriminately whenever a single statistical drift detector fires introduces unnecessary computational overhead, model weight instability, and false retrain churn during transient benign anomalies.

**TransactShield** resolves this stability–adaptability trade-off via a **multi-detector fusion architecture** that monitors three complementary signals in parallel: **ADWIN** and **DDM** on the delayed binary prediction error stream, and **Page-Hinkley** on the label-independent fraud score distribution. An asymmetric fusion decision policy classifies detector activity into \`No Drift\`, \`Isolated Drift\` (single-signal alert logged for analyst review without retraining), and \`Systemic Drift\` ($\\ge 2$ independent signals within policy window $W$, triggering selective incremental retraining and model versioning). Evaluated under the **Operational Capability Triad (ORT)** metrics on ${datasetStats.streamCount} streaming transactions (${datasetStats.fraudRatePct}% fraud prevalence), TransactShield Fusion achieved **PR-AUC ${fusion.metrics.prAuc.toFixed(3)}**, **Recall@${config.reviewBudgetK} ${(fusion.metrics.recallAtK * 100).toFixed(1)}%**, and **Amount-Weighted Recall ${(fusion.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%**, while reducing model retrains by **${fusion.metrics.retrainEfficiencyPct}%** relative to periodic retraining (${fusion.metrics.totalRetrains} vs. ${alwaysStrat.metrics.totalRetrains} retrains) and suppressing ${fusion.metrics.isolatedLogsCount} isolated noise spikes.

---

## 1. Introduction & Problem Statement

Modern payment networks process thousands of card-present and card-not-present authorizations per second. Three structural properties make operational fraud detection fundamentally harder than standard static classification:

1. **Severe Class Imbalance:** Fraud typically represents well below 1–2% of volume (0.17% in ULB), rendering raw classification accuracy misleading.
2. **Delayed & Incomplete Labels:** Chargebacks, customer disputes, and investigator resolutions arrive hours or days after authorization, creating a blind window for purely label-dependent error monitors.
3. **Evolving Fraud Tactics & False Retraining Triggers:** Fraudsters pivot between high-value account drains and low-value card-testing bursts. Static models decay rapidly, yet reacting to every single-detector alarm destabilizes decision boundaries and wastes compute.

**Problem Statement:** Design and validate a unified streaming fraud-monitoring pipeline that scores transactions in near-real time, detects genuine systemic distributional shifts before major performance loss occurs, suppresses isolated false retrain triggers, and attaches per-transaction SHAP explanations for regulatory auditability.

---

## 2. Literature Synthesis & Research Gaps

| Study | Primary Focus | Key Findings Incorporated into TransactShield | Remaining Operational Gap |
| :--- | :--- | :--- | :--- |
| **Al Lawati et al. (2025)** | Preprocessing (MI + SelectKBest + ADASYN) & EDDM + ADWIN with CNN | Demonstrates that preprocessing interacts with drift sensitivity and dual detectors capture both abrupt and gradual shifts. | Treats detectors sequentially/without asymmetric noise suppression; lacks SHAP investigator packets. |
| **Vivek (ROSFD, 2025)** | Stage-I Offline Init + Stage-II Real-Time Adaptation (DDM, EDDM, ADWIN) | Establishes the "train-only-when-required" paradigm and shows Adaptive Random Forest outperforms single incremental trees. | Compares DDM, EDDM, and ADWIN as competing single alternatives rather than fusing them. |
| **Naqvi (2026)** | Systematic Review & Operational Capability Triad (ORT) | Defines ORT-A (leakage-free causal features), ORT-B (PR-AUC, Recall@K, Amount-Weighted Recall, calibration), and ORT-C (case packets, versioning). | Conceptual appraisal framework requiring an end-to-end streaming prototype. |
| **Şenol et al. (2025)** | Domain-Knowledge LLMs + OCDD for Fraud & Concept Drift | Shows domain cues and structured reasoning improve interpretability and separate benign topical shifts from adversarial pivots. | High inference latency unsuitable for sub-10ms authorization loops without lightweight statistical gating. |
| **Chen et al. (2026)** | Virtual Drift ($P(X)$) vs. Real Drift ($P(y|X)$) via FELK & FDM | Demonstrates that covariate shifts degrade accuracy even when boundaries hold, and advocates retaining prior concept knowledge. | Focused on federated multi-client networks rather than single-stream payment fusion. |

---

## 3. Methodology & System Architecture

### 3.1 Stage-I Offline Initialization (ROSFD Warm-Start)
To avoid cold-start misclassification, the online adaptive ensemble is initialized on the first ${datasetStats.warmStartCount} historical transactions using imbalance-weighted mini-batch updates and causal baseline feature centering.

### 3.2 Three Complementary Drift Signals
- **ADWIN (Label-Dependent):** Maintains an adaptive sliding window $W_e$ over delayed binary prediction errors $e_t = \\mathbb{I}(\\hat{y}_t \\neq y_t)$. A cut is accepted when $|\\hat{\\mu}_0 - \\hat{\\mu}_1| > \\epsilon_{\\text{cut}}$ under Hoeffding's bound.
- **DDM (Label-Dependent):** Tracks online error rate $p_i$ and standard deviation $s_i = \\sqrt{p_i(1-p_i)/i}$, triggering drift when $p_i + s_i > p_{\\min} + 3.0 s_{\\min}$.
- **Page-Hinkley (Label-Independent):** Monitors the live fraud probability score stream $s_t$ prior to label arrival: $m_T = \\sum_{t=1}^T (s_t - \\bar{s}_T - \\delta)$, flagging distribution shifts when $\\max m_t - m_T > \\lambda$.

### 3.3 Asymmetric Multi-Detector Fusion Policy
Within sliding policy window $W = ${config.policyWindow}$ transactions:
- **No Drift** (0 detectors active): Normal scoring continues.
- **Isolated Drift** (1 detector active): Event is logged and surfaced to analysts (${fusion.metrics.isolatedLogsCount} events in this run), but **automatic retraining is suppressed**.
- **Systemic Drift** ($\\ge 2$ independent detectors active): Confirms genuine distributional shift, executes incremental adaptation on the recent confirmed window, resets detector baselines, and increments the model version (\`v1.0\` → \`v1.${fusion.modelVersions.length - 1}\`).

### 3.4 Per-Transaction SHAP Explainability & ORT Decision Policy
Each scored transaction outputs calibrated probability $p(x)$, a 3-tier risk decision (\`Allow\` $< 0.42$, \`Review\` $[0.42, 0.72)$, \`Decline\` $\\ge 0.72$), and additive log-odds feature attributions $\\phi_j(x)$ satisfying $\\phi_0 + \\sum_j \\phi_j(x) = \\text{logit}(p(x))$.

---

## 4. Experimental Findings (${datasetLabel} · ${config.driftScenario})

| Strategy | PR-AUC | Prec @ 1% FPR | Recall@${config.reviewBudgetK} | Amt-Wtd Recall | Total Retrains | False Retrains | Avg Latency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
${tableRows}

### Key Analytical Takeaways
1. **Superior Rare-Event Ranking Under Drift:** TransactShield Fusion achieves **PR-AUC ${fusion.metrics.prAuc.toFixed(3)}** vs. **${staticStrat.metrics.prAuc.toFixed(3)}** for the static unadapted baseline.
2. **Noise Immunity & Retrain Restraint:** By classifying single-detector alarms as \`Isolated Drift\`, Fusion logged **${fusion.metrics.isolatedLogsCount}** transient anomalies for analyst inspection without triggering destabilizing model updates—keeping false retrains at **${fusion.metrics.falseRetrains}** and total retrains at **${fusion.metrics.totalRetrains}** (**${fusion.metrics.retrainEfficiencyPct}%** retrain reduction vs. periodic retraining).
3. **Operational Loss Prevention (ORT-B):** Within a fixed daily investigation capacity of $K = ${config.reviewBudgetK}$ alerts, Fusion captures **${(fusion.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%** of fraudulent dollar volume (expected net loss avoided: **$${fusion.metrics.expectedLossAvoided.toLocaleString()}**).

---

## 5. Limitations & Future Work

- **Prototype Scope:** Results are evaluated on replayed/simulated ULB and PaySim transaction streams; production banking deployment requires institutional data-governance approval, demographic fairness auditing, and regulatory sign-off (GDPR, PSD2, BSA/AML).
- **Future Extensions:** Incorporating LightGBM + SGD hybrid ensembles (Al Lawati et al., 2025), explicit FELK virtual-drift dual-model retention (Chen et al., 2026), and human-in-the-loop analyst feedback into threshold calibration (Naqvi, 2026).

---

## 6. References

1. Al Lawati, H. M. R., Zainal, A., Al-Rimy, B. A. S., et al. (2025). *An Integrated Preprocessing and Drift Detection Approach With Adaptive Windowing for Fraud Detection in Payment Systems*. IEEE Access, 13, 92036–92056.
2. Şenol, A., Agrawal, G., & Liu, H. (2025). *Domain Knowledge-Enhanced LLMs for Fraud and Concept Drift Detection*. arXiv:2506.21443.
3. Naqvi, S. H. A. (2026). *Fraud Detection Using Machine Learning in Financial Transactions: A Systematic Review*. Veredas do Direito, 23(2), e234187.
4. Vivek, Y. (2025). *ROSFD: Robust Online Streaming Fraud Detection with Resilience to Concept Drift in Data Streams*. NIT Warangal.
5. Chen, X., Wang, S., Zhang, T., Yang, G., & Yang, Y. (2026). *Virtual concept drift detection and adaptation in federated data stream learning*. International Journal of Data Science and Analytics, 21:46.
`;
}
