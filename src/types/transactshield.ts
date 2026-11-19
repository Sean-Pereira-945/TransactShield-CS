export type WorkspaceView = 'dashboard' | 'report' | 'slides' | 'colab';

export type DatasetId = 'ulb' | 'paysim';

export type DriftScenarioId = 'abrupt' | 'gradual' | 'recurring' | 'noise_burst';

export type StrategyId =
  | 'fusion'
  | 'adwin_only'
  | 'ddm_only'
  | 'ph_only'
  | 'always_retrain'
  | 'static';

export type DecisionAction = 'Allow' | 'Review' | 'Decline';

export type FusionState = 'No Drift' | 'Isolated Drift' | 'Systemic Drift';

export type DetectorName = 'ADWIN' | 'DDM' | 'Page-Hinkley';

export interface SimulationConfig {
  dataset: DatasetId;
  driftScenario: DriftScenarioId;
  labelDelay: number; // transactions before ground truth label arrives
  policyWindow: number; // steps within which >= 2 detector firings confirm Systemic Drift
  reviewBudgetK: number; // daily/stream alert review capacity K for Recall@K & Precision@K
  seed: number;
}

export interface TransactionRecord {
  step: number;
  txId: string;
  timestampLabel: string;
  dataset: DatasetId;
  channel: string;
  amount: number;
  features: number[]; // normalized numeric feature vector
  featureNames: string[];
  rawSummary: Record<string, string | number>;
  isFraud: 0 | 1;
  labelAvailableAtStep: number;
  regimeLabel: string;
  isTrueDriftWindow: boolean;
  isTrueDriftOnset: boolean;
  isNoiseBurstWindow: boolean;
}

export interface ShapContribution {
  feature: string;
  value: number;
  contribution: number; // log-odds contribution
  direction: 'risk_up' | 'risk_down';
}

export interface ScoredTransaction {
  step: number;
  txId: string;
  timestampLabel: string;
  channel: string;
  amount: number;
  isFraud: 0 | 1;
  labelAvailableAtStep: number;
  labelRevealed: boolean;
  fraudScore: number; // calibrated [0, 1]
  decision: DecisionAction;
  modelVersion: string;
  regimeLabel: string;
  shapTopK: ShapContribution[];
  baseLogOdds: number;
  analystFeedback?: 'confirmed_fraud' | 'false_positive' | null;
}

export interface DetectorSignalSnapshot {
  adwinFired: boolean;
  adwinMeanError: number;
  adwinWindowSize: number;
  ddmStatus: 'normal' | 'warning' | 'drift';
  ddmErrorRate: number;
  ddmThreshold: number;
  phFired: boolean;
  phStat: number;
  phScoreMean: number;
  ksVirtualDriftPValue: number;
  ksVirtualDriftDetected: boolean;
}

export interface DriftEvent {
  id: string;
  step: number;
  fusionState: FusionState;
  triggeredDetectors: DetectorName[];
  actionTaken: 'None' | 'Logged for Analyst Review' | 'Incremental Retrain';
  modelVersionBefore: string;
  modelVersionAfter: string;
  isTrueDriftContext: boolean;
  isFalseAlarm: boolean;
  ksVirtualFlag: boolean;
  summary: string;
}

export interface TimelinePoint {
  step: number;
  rollingPrAuc: number;
  rollingFpr: number;
  adwinErrorMean: number;
  ddmErrorBound: number;
  phStatistic: number;
  scoreMean: number;
  fusionState: FusionState;
  isTrueDriftOnset: boolean;
  isNoiseBurst: boolean;
  modelVersionNum: number;
}

export interface OrtMetrics {
  prAuc: number;
  rocAuc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  precisionAt1PctFpr: number;
  recallAtK: number;
  precisionAtK: number;
  amountWeightedRecallAtK: number;
  expectedLossAvoided: number;
  totalFraudExposure: number;
  detectionLatencyTxns: number | null;
  totalRetrains: number;
  trueDriftRetrains: number;
  falseRetrains: number;
  isolatedLogsCount: number;
  retrainEfficiencyPct: number; // % retrain reduction vs always_retrain or best single detector
  avgScoringLatencyMs: number;
}

export interface StrategyBenchmarkResult {
  strategyId: StrategyId;
  strategyName: string;
  shortLabel: string;
  metrics: OrtMetrics;
  timeline: TimelinePoint[];
  driftEvents: DriftEvent[];
  modelVersions: ModelVersionRecord[];
}

export interface ModelVersionRecord {
  version: string;
  createdAtStep: number;
  triggerReason: string;
  trainingWindowSize: number;
  postUpdatePrAuc: number;
}

export interface FullExperimentSuite {
  config: SimulationConfig;
  datasetStats: {
    totalTransactions: number;
    warmStartCount: number;
    streamCount: number;
    fraudCount: number;
    fraudRatePct: number;
    totalFraudVolume: number;
    trueDriftOnsetSteps: number[];
    noiseBurstSteps: number[];
    featureNames: string[];
  };
  strategies: StrategyBenchmarkResult[];
  fusionTransactions: ScoredTransaction[];
  computedAtIso: string;
}
