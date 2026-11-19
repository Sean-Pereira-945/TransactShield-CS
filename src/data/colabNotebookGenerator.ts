import { SimulationConfig } from '../types/transactshield';

export interface ColabCell {
  id: string;
  cellType: 'markdown' | 'code';
  title: string;
  source: string;
}

export function getColabNotebookCells(config: SimulationConfig): ColabCell[] {
  const datasetUpper = config.dataset === 'ulb' ? 'ULB Credit Card' : 'PaySim Mobile Money';
  return [
    {
      id: 'cell-1',
      cellType: 'markdown',
      title: '1. Project Overview & Architecture',
      source: `# TransactShield: Fused Multi-Detector Concept-Drift Fraud Detection

**Author:** Sean Pereira (Fr. Conceicao Rodrigues College of Engineering) · **Mentor:** Dr. Vijay Shelake  
**Active Configuration:** Dataset = \`${datasetUpper}\` | Drift Scenario = \`${config.driftScenario}\` | Label Delay = \`${config.labelDelay}\` txns | Policy Window = \`${config.policyWindow}\` | Alert Budget K = \`${config.reviewBudgetK}\`

### Core Research Novelty
1. **Three Parallel Drift Signals:**
   - **ADWIN** (label-dependent): Adaptive windowing on the binary prediction error stream.
   - **DDM** (label-dependent): PAC-learning error rate + standard deviation trajectory monitoring.
   - **Page-Hinkley** (label-independent): Cumulative mean shift on live fraud probability scores (early warning before delayed labels arrive).
2. **Asymmetric Fusion Decision Policy:**
   - **No Drift** (0 signals) → Normal scoring.
   - **Isolated Drift** (1 signal) → Logged for analyst review (**no automatic retrain**).
   - **Systemic Drift** (≥ 2 signals within policy window \`W\`) → Selective incremental retrain (\`train-only-when-required\`) + versioned model artifact.
3. **Explainability & ORT Evaluation (Naqvi, 2026):**
   - Per-transaction **SHAP** attributions for investigator case packets.
   - **ORT Metrics:** \`PR-AUC\`, \`Precision @ 1% FPR\`, \`Recall@K\`, \`Precision@K\`, \`Amount-Weighted Recall@K\`, \`Detection Latency\`, and \`Retrain Efficiency\`.`,
    },
    {
      id: 'cell-2',
      cellType: 'code',
      title: '2. Install Dependencies (Google Colab Runtime)',
      source: `# Run once in Google Colab
!pip install -q river xgboost shap scikit-learn pandas numpy matplotlib`,
    },
    {
      id: 'cell-3',
      cellType: 'code',
      title: '3. Imports & Leakage-Free Feature Engineering Helpers',
      source: `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from collections import deque
from sklearn.metrics import average_precision_score, roc_auc_score, precision_recall_curve
from river import forest, drift, preprocessing, metrics as river_metrics
import xgboost as xgb
import shap

np.random.seed(${config.seed})
print("TransactShield Colab dependencies loaded successfully.")`,
    },
    {
      id: 'cell-4',
      cellType: 'code',
      title: '4. Streaming Dataset Loader (ULB Credit Card / PaySim Synthetic Drift)',
      source: `def generate_stream(dataset="${config.dataset}", scenario="${config.driftScenario}", n_total=2400, label_delay=${config.labelDelay}):
    """
    Produces a leakage-free transaction stream with time-ordered arrival,
    severe class imbalance (~2%), delayed labels, isolated noise bursts,
    and true concept-drift transitions (Abrupt / Gradual / Recurring).
    Replace this generator with pd.read_csv('creditcard.csv') for full ULB Kaggle replay.
    """
    rows = []
    for step in range(n_total):
        mix = 0.0
        true_drift = False
        noise_burst = False
        if scenario == "abrupt":
            if 1050 <= step < 1750:
                mix = 1.0
                true_drift = (1050 <= step <= 1180)
            elif step >= 1750:
                mix = 0.85
                true_drift = (1750 <= step <= 1880)
            noise_burst = (740 <= step < 795)
        elif scenario == "gradual":
            if 1000 <= step < 1450:
                mix = (step - 1000) / 450.0
                true_drift = (1000 <= step <= 1350)
            elif step >= 1450:
                mix = 1.0
            noise_burst = (720 <= step < 775)
        elif scenario == "recurring":
            if 950 <= step < 1550:
                mix = 1.0
                true_drift = (950 <= step <= 1080)
            elif step >= 1550:
                mix = 0.0
                true_drift = (1550 <= step <= 1680)
            noise_burst = (700 <= step < 755)
        else:
            noise_burst = (760 <= step < 825) or (1260 <= step < 1325)
            if step >= 1820:
                mix = 0.9
                true_drift = (1820 <= step <= 1950)

        is_fraud = int(np.random.rand() < (0.019 if dataset == "ulb" else 0.024))
        use_b = np.random.rand() < mix
        noise_shift = 1.55 if noise_burst else 0.0

        if is_fraud:
            if not use_b:
                x = np.array([
                    np.random.normal(-2.6, 0.7), np.random.normal(2.3, 0.65),
                    np.random.normal(-2.2, 0.7), np.random.normal(-1.4, 0.6),
                    np.random.normal(-1.5, 0.7), np.random.normal(-1.1, 0.6),
                    np.random.normal(0.3, 0.3), np.random.normal(1.3, 0.5),
                ])
                amt = float(np.exp(np.random.normal(5.1, 0.9)))
            else:
                x = np.array([
                    np.random.normal(0.9, 0.6), np.random.normal(-1.2, 0.6),
                    np.random.normal(0.8, 0.6), np.random.normal(2.7, 0.65),
                    np.random.normal(2.5, 0.65), np.random.normal(1.9, 0.6),
                    np.random.normal(-0.2, 0.2), np.random.normal(2.6, 0.5),
                ])
                amt = float(np.exp(np.random.normal(3.2, 0.5)))
        else:
            x = np.random.normal(0.0, 0.85, size=8)
            x[6] += noise_shift * 0.6
            x[7] += noise_shift * 0.85
            amt = float(np.exp(np.random.normal(3.8 + noise_shift * 0.5, 0.95)))

        rows.append({
            "step": step,
            "features": {f"f{i}": float(x[i]) for i in range(8)},
            "amount": max(1.25, round(amt, 2)),
            "is_fraud": is_fraud,
            "label_step": step + label_delay,
            "true_drift": true_drift,
        })
    return pd.DataFrame(rows)

df_stream = generate_stream()
print(f"Generated {len(df_stream)} transactions | Fraud rate: {df_stream['is_fraud'].mean()*100:.2f}%")`,
    },
    {
      id: 'cell-5',
      cellType: 'code',
      title: '5. TransactShield Multi-Detector Fusion Layer (ADWIN + DDM + Page-Hinkley)',
      source: `class TransactShieldFusion:
    """
    Combines three complementary drift detectors:
      - ADWIN & DDM on delayed binary prediction error stream
      - Page-Hinkley on live unlabeled fraud probability scores
    Policy:
      - 0 signals -> No Drift
      - 1 signal  -> Isolated Drift (log only, suppress retrain)
      - >=2 signals within policy_window -> Systemic Drift (trigger retrain)
    """
    def __init__(self, policy_window=${config.policyWindow}, cooldown=85):
        self.adwin = drift.ADWIN(delta=0.012)
        self.ddm = drift.binary.DDM(min_num_instances=35, warning_level=2.0, drift_level=2.95)
        self.ph = drift.PageHinkley(min_instances=40, delta=0.0045, threshold=3.8)
        self.policy_window = policy_window
        self.cooldown = cooldown
        self.recent_firings = deque()
        self.last_retrain_step = -999

    def update_score(self, score: float) -> bool:
        self.ph.update(score)
        return bool(self.ph.drift_detected)

    def update_label_error(self, err_bit: int):
        self.adwin.update(err_bit)
        self.ddm.update(err_bit)
        return bool(self.adwin.drift_detected), bool(self.ddm.drift_detected)

    def evaluate_fusion(self, step: int, adwin_hit: bool, ddm_hit: bool, ph_hit: bool):
        for name, hit in [("ADWIN", adwin_hit), ("DDM", ddm_hit), ("Page-Hinkley", ph_hit)]:
            if hit:
                self.recent_firings.append((step, name))

        while self.recent_firings and (step - self.recent_firings[0][0]) > self.policy_window:
            self.recent_firings.popleft()

        active = sorted(set(name for _, name in self.recent_firings))
        if len(active) >= 2 and (step - self.last_retrain_step) >= self.cooldown:
            self.last_retrain_step = step
            self.recent_firings.clear()
            self.adwin = drift.ADWIN(delta=0.012)
            self.ddm = drift.binary.DDM(min_num_instances=35, warning_level=2.0, drift_level=2.95)
            self.ph = drift.PageHinkley(min_instances=40, delta=0.0045, threshold=3.8)
            return "Systemic Drift", active
        elif len(active) == 1 and (adwin_hit or ddm_hit or ph_hit):
            return "Isolated Drift", active
        return "No Drift", []`,
    },
    {
      id: 'cell-6',
      cellType: 'code',
      title: '6. Stage-I Warm-Start & Streaming Benchmark Runner (Fusion vs Single Detectors)',
      source: `def compute_ort_metrics(y_true, y_score, amounts, k=${config.reviewBudgetK}):
    pr_auc = average_precision_score(y_true, y_score)
    roc_auc = roc_auc_score(y_true, y_score)

    order = np.argsort(-y_score)
    top_k = order[:min(k, len(order))]
    total_pos = max(1, np.sum(y_true))
    total_amt = max(1e-6, np.sum(amounts[y_true == 1]))

    recall_at_k = float(np.sum(y_true[top_k]) / total_pos)
    precision_at_k = float(np.mean(y_true[top_k]))
    amt_weighted_recall = float(np.sum(amounts[top_k][y_true[top_k] == 1]) / total_amt)

    # Precision @ 1% FPR
    neg_total = max(1, np.sum(y_true == 0))
    max_fp = max(1, int(neg_total * 0.01))
    tp = fp = 0
    for idx in order:
        if y_true[idx] == 1: tp += 1
        else: fp += 1
        if fp >= max_fp: break
    prec_1pct_fpr = tp / max(1, tp + fp)

    return {
        "PR-AUC": round(pr_auc, 4),
        "ROC-AUC": round(roc_auc, 4),
        "Precision@1%FPR": round(prec_1pct_fpr, 4),
        f"Recall@{k}": round(recall_at_k, 4),
        f"Precision@{k}": round(precision_at_k, 4),
        "Amount-Weighted Recall": round(amt_weighted_recall, 4),
    }

def run_strategy(df, mode="fusion", warm_n=500):
    model = preprocessing.StandardScaler() | forest.ARFClassifier(n_models=10, seed=${config.seed})
    warm_df, stream_df = df.iloc[:warm_n], df.iloc[warm_n:]

    # Stage-I Offline Initialization (ROSFD)
    for _, row in warm_df.iterrows():
        model.learn_one(row["features"], row["is_fraud"])

    fusion = TransactShieldFusion()
    pending = deque()
    confirmed = deque(maxlen=260)
    scores, labels, amounts = [], [], []
    retrains, isolated = 0, 0

    for _, row in stream_df.iterrows():
        proba = model.predict_proba_one(row["features"]).get(1, 0.0)
        pred = int(proba >= 0.5)
        scores.append(proba)
        labels.append(row["is_fraud"])
        amounts.append(row["amount"])

        ph_hit = fusion.update_score(proba)
        pending.append((row["label_step"], row["features"], row["is_fraud"], int(pred != row["is_fraud"])))

        adwin_hit = ddm_hit = False
        while pending and pending[0][0] <= row["step"]:
            _, feats, y_true, err = pending.popleft()
            confirmed.append((feats, y_true))
            a_hit, d_hit = fusion.update_label_error(err)
            adwin_hit |= a_hit
            ddm_hit |= d_hit

        trigger = False
        if mode == "fusion":
            state, _ = fusion.evaluate_fusion(row["step"], adwin_hit, ddm_hit, ph_hit)
            if state == "Systemic Drift": trigger = True
            elif state == "Isolated Drift": isolated += 1
        elif mode == "adwin" and adwin_hit: trigger = True
        elif mode == "ddm" and ddm_hit: trigger = True
        elif mode == "ph" and ph_hit: trigger = True
        elif mode == "always" and (row["step"] - warm_n) % 150 == 0: trigger = True

        if trigger:
            retrains += 1
            for feats, y_true in confirmed:
                model.learn_one(feats, y_true)

    res = compute_ort_metrics(np.array(labels), np.array(scores), np.array(amounts))
    res["Retrains"] = retrains
    res["Isolated Logged"] = isolated
    return res

results = {
    "Fusion (Proposed)": run_strategy(df_stream, "fusion"),
    "ADWIN Only": run_strategy(df_stream, "adwin"),
    "DDM Only": run_strategy(df_stream, "ddm"),
    "Page-Hinkley Only": run_strategy(df_stream, "ph"),
    "Always Retrain": run_strategy(df_stream, "always"),
    "Static Model": run_strategy(df_stream, "static"),
}
pd.DataFrame(results).T`,
    },
    {
      id: 'cell-7',
      cellType: 'code',
      title: '7. SHAP Per-Transaction Explainability for Compliance & Investigator Packets',
      source: `# Train a companion XGBoost explainer on the latest confirmed window for fast TreeSHAP outputs
X_warm = np.array([list(r.values()) for r in df_stream.iloc[:500]["features"]])
y_warm = df_stream.iloc[:500]["is_fraud"].values

xgb_clf = xgb.XGBClassifier(n_estimators=80, max_depth=4, scale_pos_weight=15, eval_metric="logloss", random_state=${config.seed})
xgb_clf.fit(X_warm, y_warm)

explainer = shap.TreeExplainer(xgb_clf)
X_sample = np.array([list(r.values()) for r in df_stream.iloc[1050:1060]["features"]])
shap_values = explainer.shap_values(X_sample)

# Display top contributing features for the highest-risk transaction in the drifted slice
top_idx = int(np.argmax(xgb_clf.predict_proba(X_sample)[:, 1]))
contrib = pd.Series(shap_values[top_idx], index=[f"f{i}" for i in range(8)]).sort_values(key=abs, ascending=False)
print("Investigator Case Packet — Top SHAP Feature Attributions:")
print(contrib)`,
    },
    {
      id: 'cell-8',
      cellType: 'code',
      title: '8. Comparative Visualization (PR-AUC vs. Retrain Frequency)',
      source: `summary_df = pd.DataFrame(results).T
fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))

summary_df["PR-AUC"].plot(kind="barh", ax=axes[0], color="#1D4ED8")
axes[0].set_title("PR-AUC Across Drift Strategies")
axes[0].set_xlim(0, 1.0)
axes[0].grid(axis="x", alpha=0.3)

summary_df["Retrains"].plot(kind="barh", ax=axes[1], color="#0F172A")
axes[1].set_title("Total Retrains Triggered (Lower = More Stable)")
axes[1].grid(axis="x", alpha=0.3)

plt.tight_layout()
plt.show()`,
    },
  ];
}

export function generateColabIpynbJson(config: SimulationConfig): string {
  const cells = getColabNotebookCells(config);
  const nb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      colab: {
        provenance: [],
        name: 'TransactShield_Colab.ipynb',
      },
      kernelspec: {
        display_name: 'Python 3',
        name: 'python3',
      },
      language_info: {
        name: 'python',
      },
    },
    cells: cells.map((cell) => ({
      cell_type: cell.cellType,
      metadata: { id: cell.id },
      ...(cell.cellType === 'code' ? { execution_count: null, outputs: [] } : {}),
      source: cell.source.split('\n').map((line, i, arr) => (i < arr.length - 1 ? line + '\n' : line)),
    })),
  };

  return JSON.stringify(nb, null, 2);
}
