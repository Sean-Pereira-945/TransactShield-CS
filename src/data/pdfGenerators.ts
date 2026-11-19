import { jsPDF } from 'jspdf';
import { FullExperimentSuite } from '../types/transactshield';

function savePdfBlob(doc: jsPDF, filename: string) {
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadReportPdf(suite: FullExperimentSuite): void {
  const { config, datasetStats, strategies } = suite;
  const fusion = strategies.find((s) => s.strategyId === 'fusion')!;
  const staticStrat = strategies.find((s) => s.strategyId === 'static')!;
  const alwaysStrat = strategies.find((s) => s.strategyId === 'always_retrain')!;

  const datasetTitle =
    config.dataset === 'ulb'
      ? 'European Credit Card Fraud (ULB Benchmark)'
      : 'PaySim Synthetic Mobile-Money Stream';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageH - 18) {
      doc.addPage();
      y = margin;
    }
  };

  const addSectionHeading = (title: string) => {
    ensureSpace(14);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const addParagraph = (text: string, fontSize = 9.5, color: [number, number, number] = [51, 65, 85]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    const lineHeight = fontSize * 0.44;
    ensureSpace(lines.length * lineHeight + 3);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 2.5;
  };

  // Title Header Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(29, 78, 216);
  doc.text('TECHNICAL RESEARCH REPORT  |  CONCEPT-DRIFT-RESILIENT FINANCIAL ML', margin, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(
    'TransactShield: A Fused Multi-Detector Approach to Concept-Drift-Resilient Fraud Detection',
    contentW
  ) as string[];
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6.8 + 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Sean Pereira (Computer Engineering, Fr. Conceicao Rodrigues College of Engineering)  |  Mentor: Dr. Vijay Shelake',
    margin,
    y
  );
  y += 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Stream: ${datasetTitle} (${datasetStats.streamCount} txns, ${datasetStats.fraudRatePct}% fraud) | Scenario: ${config.driftScenario} | Delay: ${config.labelDelay} | W=${config.policyWindow} | K=${config.reviewBudgetK}`,
    margin,
    y
  );
  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // KPI Highlight Strip
  ensureSpace(22);
  const kpiW = (contentW - 9) / 4;
  const kpis = [
    { label: 'Fusion PR-AUC', val: fusion.metrics.prAuc.toFixed(3), sub: `Static: ${staticStrat.metrics.prAuc.toFixed(3)}` },
    { label: `Recall@${config.reviewBudgetK}`, val: `${(fusion.metrics.recallAtK * 100).toFixed(1)}%`, sub: `Prec@K: ${(fusion.metrics.precisionAtK * 100).toFixed(1)}%` },
    { label: 'Amt-Wtd Recall', val: `${(fusion.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%`, sub: `Saved: $${fusion.metrics.expectedLossAvoided.toLocaleString()}` },
    { label: 'Retrain Reduction', val: `-${fusion.metrics.retrainEfficiencyPct}%`, sub: `${fusion.metrics.totalRetrains} vs ${alwaysStrat.metrics.totalRetrains} periodic` },
  ];
  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (kpiW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, kpiW, 18, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, y + 5);
    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 3, y + 11);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.sub, x + 3, y + 15.5);
  });
  y += 24;

  // Abstract
  addSectionHeading('Abstract');
  addParagraph(
    `Payment fraud tactics evolve continuously, creating concept drift (P_t(X, y) != P_t+1(X, y)) that degrades static machine learning classifiers. Conversely, reacting to every isolated statistical alarm causes unnecessary retraining, decision-boundary instability, and high computational cost. TransactShield introduces an asymmetric multi-detector fusion architecture combining three complementary drift signals in parallel: ADWIN and DDM on delayed binary prediction errors, and Page-Hinkley on label-independent fraud score distributions. By logging single-detector alarms as Isolated Drift for analyst inspection and triggering incremental adaptation (train-only-when-required) only when >= 2 detectors confirm Systemic Drift within window W=${config.policyWindow}, TransactShield achieved PR-AUC ${fusion.metrics.prAuc.toFixed(3)}, Recall@${config.reviewBudgetK} ${(fusion.metrics.recallAtK * 100).toFixed(1)}%, and Amount-Weighted Recall ${(fusion.metrics.amountWeightedRecallAtK * 100).toFixed(1)}% -- cutting retrains by ${fusion.metrics.retrainEfficiencyPct}% compared to periodic retraining (${fusion.metrics.totalRetrains} vs. ${alwaysStrat.metrics.totalRetrains} retrains) while suppressing ${fusion.metrics.isolatedLogsCount} isolated noise anomalies.`
  );

  // Section 1
  addSectionHeading('1. Operational Fraud Challenges');
  addParagraph(
    `1.1 Extreme Class Imbalance (${datasetStats.fraudRatePct}% Fraud): Fraud makes up a tiny fraction of transactions, rendering accuracy misleading and requiring PR-AUC, Precision @ 1% FPR, and alert-budgeted Recall@K.`
  );
  addParagraph(
    `1.2 Delayed Ground Truth (${config.labelDelay} Txns Lag): Chargeback confirmations arrive asynchronously after authorization, leaving purely label-dependent monitors blind during early attack waves.`
  );
  addParagraph(
    `1.3 False Retrain Churn: Single drift detectors struggle to distinguish benign promotional spending bursts or virtual covariate noise from structural fraud pivots, triggering unstable updates.`
  );
  addParagraph(
    `1.4 Investigator Explainability: Regulated financial workflows require per-transaction SHAP feature attributions, model version traceability, and auditable drift logs.`
  );

  // Section 2
  addSectionHeading('2. Literature Synthesis (5 Attached Studies)');
  const litRows = [
    ['Al Lawati et al. (2025)', 'MI + SelectKBest + ADASYN + EDDM/ADWIN', 'Imbalance-weighted replay + multi-speed drift pairing + SHAP'],
    ['Vivek (ROSFD, 2025)', 'Stage-I warm-start + train-only-when-required', '500-txn initialization + fused multi-signal gating'],
    ['Naqvi (2026) - ORT', 'Operational Capability Triad (ORT-A/B/C)', 'Causal features, PR-AUC, Recall@K, 3-tier Allow/Review/Decline'],
    ['Senol et al. (2025)', 'Domain-enhanced LLMs for benign vs. fraud drift', 'Sub-ms asymmetric noise suppression without LLM latency'],
    ['Chen et al. (2026)', 'FELK (1D KS check) & FDM virtual drift retention', '1D KS covariate shift diagnostics in drift audit events'],
  ];
  ensureSpace(48);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentW, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Study', margin + 2, y + 4.5);
  doc.text('Core Mechanism', margin + 42, y + 4.5);
  doc.text('Adopted / Extended in TransactShield', margin + 105, y + 4.5);
  y += 7;
  litRows.forEach((r) => {
    ensureSpace(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(r[0], margin + 2, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(r[1], margin + 42, y + 4);
    doc.text(r[2], margin + 105, y + 4);
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6, pageW - margin, y + 6);
    y += 6.5;
  });
  y += 3;

  // Section 3
  addSectionHeading('3. Multi-Detector Fusion Architecture');
  addParagraph(
    'TransactShield runs a 6-stage causal streaming pipeline: (1) Stream Ingestion -> (2) Rolling Leakage-Free Standardization -> (3) 3-Learner Online Adaptive Ensemble + Baseline-Centered SHAP Top-K -> (4) Parallel Drift Layer (ADWIN + DDM on delayed error stream, Page-Hinkley on live scores) -> (5) Asymmetric Fusion Policy Gate -> (6) Selective Incremental Retraining & Versioned Artifact Bump.'
  );
  addParagraph(
    `Decision Policy within Policy Window W=${config.policyWindow}: 0 signals -> No Drift (normal scoring); 1 signal -> Isolated Drift (logged for analyst triage, no retrain); >= 2 independent signals -> Systemic Drift (imbalance-weighted replay retrain + 85-txn cooldown guard).`
  );

  // Section 4: Benchmark Table
  addSectionHeading(`4. Experimental Results & ORT Benchmark (${datasetTitle} | ${config.driftScenario})`);
  ensureSpace(56);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(51, 65, 85);
  const cols = [margin + 2, margin + 52, margin + 71, margin + 91, margin + 114, margin + 135, margin + 154, margin + 169];
  doc.text('Strategy', cols[0], y + 4.8);
  doc.text('PR-AUC', cols[1], y + 4.8);
  doc.text('ROC-AUC', cols[2], y + 4.8);
  doc.text('Prec@1%FPR', cols[3], y + 4.8);
  doc.text(`Recall@${config.reviewBudgetK}`, cols[4], y + 4.8);
  doc.text('Amt-Wtd', cols[5], y + 4.8);
  doc.text('Retrains', cols[6], y + 4.8);
  doc.text('False', cols[7], y + 4.8);
  y += 7.5;

  strategies.forEach((s) => {
    ensureSpace(7);
    const isFusion = s.strategyId === 'fusion';
    if (isFusion) {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, contentW, 6.2, 'F');
    }
    doc.setFont('helvetica', isFusion ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(s.shortLabel, cols[0], y + 4.3);
    doc.setFont('courier', isFusion ? 'bold' : 'normal');
    doc.text(s.metrics.prAuc.toFixed(3), cols[1], y + 4.3);
    doc.text(s.metrics.rocAuc.toFixed(3), cols[2], y + 4.3);
    doc.text(`${(s.metrics.precisionAt1PctFpr * 100).toFixed(1)}%`, cols[3], y + 4.3);
    doc.text(`${(s.metrics.recallAtK * 100).toFixed(1)}%`, cols[4], y + 4.3);
    doc.text(`${(s.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%`, cols[5], y + 4.3);
    doc.text(`${s.metrics.totalRetrains}`, cols[6], y + 4.3);
    doc.text(`${s.metrics.falseRetrains}`, cols[7], y + 4.3);
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6.2, pageW - margin, y + 6.2);
    y += 6.5;
  });
  y += 4;

  addParagraph(
    `* Recovery Over Static Scoring: Fusion boosts rare-fraud PR-AUC from ${staticStrat.metrics.prAuc.toFixed(3)} to ${fusion.metrics.prAuc.toFixed(3)}, preventing $${fusion.metrics.expectedLossAvoided.toLocaleString()} in expected net fraud loss.`
  );
  addParagraph(
    `* Noise Suppression & Efficiency: Fusion logged ${fusion.metrics.isolatedLogsCount} isolated alerts without triggering false model churn (${fusion.metrics.falseRetrains} false retrains), cutting total retrains by ${fusion.metrics.retrainEfficiencyPct}% vs. fixed periodic updates.`
  );

  // Section 5
  addSectionHeading('5. Compliance, SDG Alignment & References');
  addParagraph(
    'Aligned with UN SDG 8, SDG 9 (resilient digital financial rails), and SDG 16 (reducing illicit flows). Production deployment requires GDPR/PSD2 regulatory governance, demographic fairness auditing, and analyst feedback integration. Key references: Al Lawati et al. (IEEE Access, 2025); Senol et al. (arXiv:2506.21443, 2025); Naqvi (Veredas do Direito, 2026); Vivek (ROSFD, 2025); Chen et al. (IJDSA, 2026).'
  );

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`TransactShield Research Report  |  Sean Pereira & Dr. Vijay Shelake`, margin, pageH - 9);
    doc.text(`Page ${p} of ${totalPages}`, pageW - margin - 20, pageH - 9);
  }

  savePdfBlob(doc, `TransactShield_Report_${config.dataset}_${config.driftScenario}.pdf`);
}

export function downloadSlidesPdf(suite: FullExperimentSuite): void {
  const { config, datasetStats, strategies } = suite;
  const fusion = strategies.find((s) => s.strategyId === 'fusion')!;
  const staticStrat = strategies.find((s) => s.strategyId === 'static')!;
  const alwaysStrat = strategies.find((s) => s.strategyId === 'always_retrain')!;
  const adwinStrat = strategies.find((s) => s.strategyId === 'adwin_only')!;
  const phStrat = strategies.find((s) => s.strategyId === 'ph_only')!;

  const datasetLabel =
    config.dataset === 'ulb' ? 'ULB Credit Card Benchmark' : 'PaySim Mobile-Money Stream';
  const maxRetrains = Math.max(1, ...strategies.map((s) => s.metrics.totalRetrains));

  // 16:9 Widescreen PDF (297mm x 167mm)
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 167] });
  const W = 297;
  const H = 167;
  const M = 16;
  const CW = W - M * 2;

  const drawFrame = (slideNum: number, kicker: string, title: string) => {
    if (slideNum > 1) doc.addPage([297, 167], 'landscape');
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(29, 78, 216);
    doc.text(kicker, M, 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    const titleLines = doc.splitTextToSize(title, CW) as string[];
    doc.text(titleLines, M, 24);
    const headerBottom = 24 + (titleLines.length - 1) * 7 + 4;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(M, headerBottom, W - M, headerBottom);

    // Footer
    doc.setDrawColor(241, 245, 249);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('TransactShield  |  Sean Pereira & Dr. Vijay Shelake  |  Fr. CRCE Computer Engineering', M, H - 8);
    doc.text(`Slide ${slideNum} / 12`, W - M - 20, H - 8);

    return headerBottom + 8;
  };

  const drawBox = (
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    body: string,
    accent: [number, number, number] = [15, 23, 42],
    bg: [number, number, number] = [248, 250, 252]
  ) => {
    doc.setFillColor(...bg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...accent);
    doc.text(title, x + 5, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(body, w - 10) as string[];
    doc.text(lines, x + 5, y + 14.5);
  };

  // Slide 1: Title
  let y = drawFrame(
    1,
    'FR. CONCEICAO RODRIGUES COLLEGE OF ENGINEERING  |  COMPUTER ENGINEERING',
    'TransactShield: A Fused Multi-Detector Approach to Concept-Drift-Resilient Fraud Detection'
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  const sub1 = doc.splitTextToSize(
    'Real-time adaptive fraud scoring under delayed chargeback labels, severe class imbalance, and non-stationary payment behavior -- grounded in the Operational Capability Triad (ORT) and two-stage streaming adaptation.',
    CW
  ) as string[];
  doc.text(sub1, M, y + 2);
  y += 22;
  const cardW3 = (CW - 10) / 3;
  drawBox(M, y, cardW3, 34, 'Active Stream', `${datasetLabel}\n${datasetStats.streamCount} txns (${datasetStats.fraudRatePct}% fraud)\nScenario: ${config.driftScenario}`);
  drawBox(M + cardW3 + 5, y, cardW3, 34, 'Fusion PR-AUC vs Static', `${fusion.metrics.prAuc.toFixed(3)} vs ${staticStrat.metrics.prAuc.toFixed(3)}\nRecall@${config.reviewBudgetK}: ${(fusion.metrics.recallAtK * 100).toFixed(1)}%`, [29, 78, 216], [239, 246, 255]);
  drawBox(M + (cardW3 + 5) * 2, y, cardW3, 34, 'Retrain Restraint', `-${fusion.metrics.retrainEfficiencyPct}% Retrains\n${fusion.metrics.totalRetrains} systemic vs ${alwaysStrat.metrics.totalRetrains} periodic`);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Presenter: Sean Pereira   |   Faculty Mentor: Dr. Vijay Shelake', M, H - 22);

  // Slide 2: Roadmap
  y = drawFrame(2, 'SLIDE 02  |  PRESENTATION ROADMAP', 'Agenda & Research Scope');
  const cardW2 = (CW - 6) / 2;
  const roadmap = [
    ['01. Operational Fraud Challenges', 'Extreme class imbalance (0.17%-2%), delayed chargebacks, and adversarial tactics.'],
    ['02. Literature Gaps (5 Papers)', 'Synthesizing Al Lawati (2025), ROSFD (2025), ORT (2026), Senol (2025), and Chen (2026).'],
    ['03. Multi-Detector Drift Fusion', 'Combining ADWIN + DDM (delayed error) with Page-Hinkley (live score stream).'],
    ['04. Asymmetric Retrain Policy', 'Suppressing isolated noise bursts while acting rapidly on systemic concept drift.'],
    ['05. ORT Evaluation & SHAP Packets', 'PR-AUC, Recall@K, Amount-Weighted Recall, and additive log-odds case explanations.'],
    ['06. Google Colab & SDG Alignment', 'Reproducible River + XGBoost + SHAP notebook and UN SDG 8, 9, and 16 alignment.'],
  ];
  roadmap.forEach(([t, b], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawBox(M + col * (cardW2 + 6), y + row * 31, cardW2, 27, t, b);
  });

  // Slide 3: Why Single Detectors Fail
  y = drawFrame(3, 'SLIDE 03  |  CORE THESIS & NOVELTY', 'Why Single Drift Detectors Fail in Payment Streams');
  drawBox(M, y + 4, cardW3, 72, 'Static Classifier\nSilent Recall Decay', `Frozen boundaries cannot track adversarial shifts P_t(X,y) != P_t+1(X,y), causing PR-AUC to collapse to ${staticStrat.metrics.prAuc.toFixed(3)}.`, [185, 28, 28]);
  drawBox(M + cardW3 + 5, y + 4, cardW3, 72, 'Single-Detector Retrain\nFalse-Alarm Model Churn', `Individual monitors trigger on transient benign bursts, forcing up to ${Math.max(adwinStrat.metrics.totalRetrains, phStrat.metrics.totalRetrains)} unneeded model updates and unstable alert queues.`, [180, 83, 9]);
  drawBox(M + (cardW3 + 5) * 2, y + 4, cardW3, 72, 'TransactShield Fusion\nCorroborated Adaptation', `Logs 1-detector spikes for human triage and commits retraining only when >= 2 independent detectors align within W=${config.policyWindow}.`, [29, 78, 216], [239, 246, 255]);

  // Slide 4: 4 Challenges
  y = drawFrame(4, 'SLIDE 04  |  PROBLEM DOMAIN', 'Four Structural Challenges in Financial Fraud Streams');
  const ch4 = [
    [`1. Extreme Imbalance (${datasetStats.fraudRatePct}% Fraud)`, `Only ${datasetStats.fraudCount} frauds in ${datasetStats.streamCount} txns: accuracy exceeds 97.5% even when missing 100% of fraud.`],
    [`2. Delayed Ground Truth (${config.labelDelay} Txn Lag)`, 'Dispute labels arrive asynchronously; live probability-shift detectors must bridge the gap.'],
    ['3. Virtual vs. Real Concept Drift', 'Seasonal spending shifts P(X) without altering fraud semantics P(y|X). Blind retraining hurts precision.'],
    ['4. Alert Queue & Audit Constraints', `Investigators inspect only top-${config.reviewBudgetK} alerts and require deterministic SHAP reason codes.`],
  ];
  ch4.forEach(([t, b], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawBox(M + col * (cardW2 + 6), y + row * 44, cardW2, 39, t, b);
  });

  // Slide 5: Literature Table
  y = drawFrame(5, 'SLIDE 05  |  RELATED WORK SYNTHESIS', 'Research Foundation & Identified Gaps (5 Attached Papers)');
  const lit = [
    ['Al Lawati et al. (2025)', 'MI + ADASYN + EDDM/ADWIN on CNN', 'Imbalance-weighted replay + multi-speed drift gating + SHAP'],
    ['Vivek (ROSFD, 2025)', 'Stage-I/II warm-start + train-only-when-required', '500-txn warm-start + corroborated fusion gate'],
    ['Naqvi (2026) - ORT', 'Causal ops & alert-budget metrics', 'PR-AUC, Recall@K, Amount-Weighted Recall, 3-tier policy'],
    ['Senol et al. (2025)', 'Benign vs. adversarial drift discrimination', 'Low-latency numerical gating without per-txn LLM overhead'],
    ['Chen et al. (2026)', 'FELK (1D KS check) & FDM retention', 'Per-event 1D KS covariate shift diagnostic inside audit logs'],
  ];
  doc.setFillColor(241, 245, 249);
  doc.rect(M, y, CW, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Study', M + 3, y + 6.5);
  doc.text('Key Mechanism', M + 58, y + 6.5);
  doc.text('Integrated / Extended in TransactShield', M + 148, y + 6.5);
  y += 11;
  lit.forEach((r) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(r[0], M + 3, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(r[1], M + 58, y + 8);
    doc.text(r[2], M + 148, y + 8);
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y + 13, W - M, y + 13);
    y += 15;
  });

  // Slide 6: 3 Complementary Signals
  y = drawFrame(6, 'SLIDE 06  |  PARALLEL DRIFT LAYER', 'Three Complementary Signals Across Error & Score Streams');
  drawBox(M, y + 4, cardW3, 72, 'Signal 1: ADWIN\nAdaptive Windowing (Delayed Error)', 'Dynamically splits historical binary error sub-windows when sub-window means diverge beyond Hoeffding bounds. Excels on gradual shifts.', [29, 78, 216]);
  drawBox(M + cardW3 + 5, y + 4, cardW3, 72, 'Signal 2: DDM\nDrift Detection Method (Delayed Error)', 'Tracks running error rate p_i + s_i against minimum p_min + 3.0 * s_min. Sensitive to abrupt accuracy collapse.');
  drawBox(M + (cardW3 + 5) * 2, y + 4, cardW3, 72, 'Signal 3: Page-Hinkley\nMean Shift (Live Score Stream)', 'Monitors unlabeled calibrated fraud probabilities p(x) continuously, giving early warning before chargeback labels arrive.', [21, 128, 61]);

  // Slide 7: Fusion Gate
  y = drawFrame(7, 'SLIDE 07  |  DECISION GATE', 'Asymmetric Multi-Detector Fusion Policy');
  drawBox(M, y + 2, cardW3, 58, '0 Detectors Active -> No Drift', 'Normal calibrated scoring and 3-tier routing (Allow / Review / Decline). Zero retrain overhead.', [21, 128, 61]);
  drawBox(M + cardW3 + 5, y + 2, cardW3, 58, '1 Detector Active -> Isolated Drift', `Logged to audit trail (${fusion.metrics.isolatedLogsCount} events suppressed) for human review. Model weights stay frozen.`, [180, 83, 9], [255, 251, 235]);
  drawBox(M + (cardW3 + 5) * 2, y + 2, cardW3, 58, `>= 2 Detectors (W=${config.policyWindow}) -> Systemic`, 'Confirmed concept drift triggers imbalance-weighted incremental replay and bumps model artifact version.', [185, 28, 28], [254, 242, 242]);
  drawBox(M, y + 66, CW, 20, 'Stability Guard', '85-transaction post-retrain cooldown + 1D KS covariate diagnostic (Chen et al., 2026) prevent oscillating updates.', [15, 23, 42]);

  // Slide 8: 6-Stage Pipeline
  y = drawFrame(8, 'SLIDE 08  |  END-TO-END ARCHITECTURE', 'Six-Stage Streaming Pipeline & Investigator Case Packets');
  const stages = [
    ['Stage 1: Stream Ingestion', 'Time-ordered ULB / PaySim arrival with causal timestamps.'],
    ['Stage 2: Leakage-Free Prep', 'Rolling baseline standardization strictly prior to scoring.'],
    ['Stage 3: Ensemble + SHAP', '3-learner ensemble + exact additive log-odds Top-K drivers.'],
    ['Stage 4: Parallel Monitors', 'ADWIN & DDM on delayed labels + Page-Hinkley on scores.'],
    ['Stage 5: Fusion Policy Gate', `Asymmetric Isolated vs. Systemic arbitration window W=${config.policyWindow}.`],
    ['Stage 6: Versioned Retrain', 'Class-weighted replay update + audit artifact version bump.'],
  ];
  stages.forEach(([t, b], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    drawBox(M + col * (cardW3 + 5), y + row * 36, cardW3, 31, t, b);
  });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Three-Tier Operational Policy:  Allow (<45%)   |   Review (45%-76%)   |   Decline (>=76%)   |   Latest Model: ${fusion.modelVersions[fusion.modelVersions.length - 1]?.version ?? 'v1.0'}`,
    M,
    y + 80
  );

  // Slide 9: ORT Metrics
  y = drawFrame(9, 'SLIDE 09  |  EVALUATION PROTOCOL (NAQVI, 2026)', 'Operational Capability Triad (ORT) Metrics');
  drawBox(M, y, cardW2, 40, 'PR-AUC & Precision @ 1% FPR', `Evaluates ranking quality under extreme imbalance: Fusion achieves PR-AUC ${fusion.metrics.prAuc.toFixed(3)} and ${(fusion.metrics.precisionAt1PctFpr * 100).toFixed(1)}% precision at 1% FPR.`);
  drawBox(M + cardW2 + 6, y, cardW2, 40, `Recall@${config.reviewBudgetK} & Precision@${config.reviewBudgetK}`, `Models fixed investigator queue capacity: captures ${(fusion.metrics.recallAtK * 100).toFixed(1)}% of fraud within top ${config.reviewBudgetK} alerts (Prec@K: ${(fusion.metrics.precisionAtK * 100).toFixed(1)}%).`);
  drawBox(M, y + 45, cardW2, 40, 'Amount-Weighted Recall & Loss Avoided', `Weights recall by dollar exposure: ${(fusion.metrics.amountWeightedRecallAtK * 100).toFixed(1)}% fraud volume recovered, saving $${fusion.metrics.expectedLossAvoided.toLocaleString()}.`);
  drawBox(M + cardW2 + 6, y + 45, cardW2, 40, 'Detection Latency & Retrain Cost', `Measures transactions from true drift onset to update (${fusion.metrics.detectionLatencyTxns ?? 'N/A'} txns) alongside false retrains.`);

  // Slide 10: Live Results Table
  y = drawFrame(10, 'SLIDE 10  |  LIVE EXPERIMENTAL RESULTS', `Benchmark Comparison (${datasetLabel}  |  ${config.driftScenario})`);
  doc.setFillColor(241, 245, 249);
  doc.rect(M, y, CW, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const sCols = [M + 3, M + 82, M + 112, M + 144, M + 178, M + 212, M + 242];
  doc.text('Strategy', sCols[0], y + 6.5);
  doc.text('PR-AUC', sCols[1], y + 6.5);
  doc.text('Prec@1%FPR', sCols[2], y + 6.5);
  doc.text(`Recall@${config.reviewBudgetK}`, sCols[3], y + 6.5);
  doc.text('Amt-Wtd', sCols[4], y + 6.5);
  doc.text('Retrains', sCols[5], y + 6.5);
  doc.text('False', sCols[6], y + 6.5);
  y += 11;
  strategies.forEach((s) => {
    const isF = s.strategyId === 'fusion';
    if (isF) {
      doc.setFillColor(239, 246, 255);
      doc.rect(M, y, CW, 11, 'F');
    }
    doc.setFont('helvetica', isF ? 'bold' : 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(s.shortLabel, sCols[0], y + 7.5);
    doc.setFont('courier', isF ? 'bold' : 'normal');
    doc.text(s.metrics.prAuc.toFixed(3), sCols[1], y + 7.5);
    doc.text(`${(s.metrics.precisionAt1PctFpr * 100).toFixed(1)}%`, sCols[2], y + 7.5);
    doc.text(`${(s.metrics.recallAtK * 100).toFixed(1)}%`, sCols[3], y + 7.5);
    doc.text(`${(s.metrics.amountWeightedRecallAtK * 100).toFixed(1)}%`, sCols[4], y + 7.5);
    doc.text(`${s.metrics.totalRetrains}`, sCols[5], y + 7.5);
    doc.text(`${s.metrics.falseRetrains}`, sCols[6], y + 7.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(M, y + 11, W - M, y + 11);
    y += 12.5;
  });

  // Slide 11: Efficiency Visual Bars
  y = drawFrame(11, 'SLIDE 11  |  EFFICIENCY & NOISE RESTRAINT', 'PR-AUC Preservation vs. Retrain Frequency');
  const barW = (CW - 12) / 2;
  strategies.forEach((s, idx) => {
    const rowY = y + idx * 14.5;
    doc.setFont('helvetica', s.strategyId === 'fusion' ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(s.shortLabel, M, rowY + 3);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`PR-AUC ${s.metrics.prAuc.toFixed(3)}  |  ${s.metrics.totalRetrains} retrains (${s.metrics.falseRetrains} false)`, W - M - 88, rowY + 3);

    // PR-AUC bar
    doc.setFillColor(241, 245, 249);
    doc.rect(M, rowY + 5, barW, 4, 'F');
    doc.setFillColor(29, 78, 216);
    doc.rect(M, rowY + 5, Math.max(2, barW * s.metrics.prAuc), 4, 'F');

    // Retrains bar
    doc.setFillColor(241, 245, 249);
    doc.rect(M + barW + 12, rowY + 5, barW, 4, 'F');
    doc.setFillColor(15, 23, 42);
    if (s.metrics.totalRetrains > 0) {
      doc.rect(M + barW + 12, rowY + 5, Math.max(2, barW * (s.metrics.totalRetrains / maxRetrains)), 4, 'F');
    }
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Blue Bar: PR-AUC (Higher is better)     |     Dark Bar: Total Retrains (Lower = More stable)', M, y + 92);

  // Slide 12: Impact & Conclusion
  y = drawFrame(12, 'SLIDE 12  |  IMPACT, ETHICS & CONCLUSION', 'SDG Alignment, Governance & Future Work');
  drawBox(M, y + 2, cardW3, 52, 'UN SDG 8 & 9\nResilient Payment Rails', 'Minimizes merchant false declines while keeping real-time fraud defenses adaptive across digital channels.', [29, 78, 216]);
  drawBox(M + cardW3 + 5, y + 2, cardW3, 52, 'UN SDG 16\nReducing Illicit Flows', `Recovers $${fusion.metrics.expectedLossAvoided.toLocaleString()} in simulated fraud exposure with auditable SHAP case packets.`, [29, 78, 216]);
  drawBox(M + (cardW3 + 5) * 2, y + 2, cardW3, 52, 'Next Roadmap\nColab & Federated FDM', 'Export the bundled .ipynb for Kaggle ULB/PaySim datasets and extend to federated virtual-drift retention.', [29, 78, 216]);
  drawBox(
    M,
    y + 62,
    CW,
    24,
    'Key Takeaway',
    `Asymmetric fusion of ADWIN, DDM, and Page-Hinkley preserves top fraud ranking (PR-AUC ${fusion.metrics.prAuc.toFixed(3)}) while eliminating ${fusion.metrics.retrainEfficiencyPct}% of periodic retrain churn.`,
    [15, 23, 42],
    [239, 246, 255]
  );

  savePdfBlob(doc, `TransactShield_Slides_${config.dataset}_${config.driftScenario}.pdf`);
}
