import { DatasetId, DriftScenarioId, TransactionRecord } from '../types/transactshield';

function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleNormal(rng: () => number, mean = 0, std = 1): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * std;
}

const ULB_FEATURE_NAMES = [
  'V14 (Geo-Velocity PCA)',
  'V4 (Card-Not-Present Risk)',
  'V12 (Merchant Entropy)',
  'V10 (Auth Anomaly)',
  'V17 (Token Mismatch)',
  'V7 (Ticket Deviation)',
  'LogAmount',
  'TxVelocity_1h',
];

const PAYSIM_FEATURE_NAMES = [
  'Amount_LogRatio',
  'OrigBalance_Drain',
  'DestBalance_Delta',
  'TransferCashout_Flag',
  'MuleHop_Velocity',
  'NightWindow_Risk',
  'NewDest_Flag',
  'DeviceChurn_Score',
];

export interface GeneratedStreamBundle {
  records: TransactionRecord[];
  warmStartCount: number;
  trueDriftOnsetSteps: number[];
  noiseBurstSteps: number[];
  featureNames: string[];
}

export function generateTransactionStream(
  dataset: DatasetId,
  scenario: DriftScenarioId,
  labelDelay: number,
  seed = 2026
): GeneratedStreamBundle {
  const rng = createRng(seed + (dataset === 'ulb' ? 101 : 407) + scenario.length * 17);
  const warmStartCount = 500;
  const streamCount = 1900;
  const totalCount = warmStartCount + streamCount;

  const featureNames = dataset === 'ulb' ? ULB_FEATURE_NAMES : PAYSIM_FEATURE_NAMES;

  // Define true drift windows and isolated benign noise bursts in Stage-II (steps >= 500)
  let trueDriftOnsetSteps: number[] = [];
  let noiseBurstSteps: number[] = [];

  if (scenario === 'abrupt') {
    trueDriftOnsetSteps = [1050, 1750];
    noiseBurstSteps = [740];
  } else if (scenario === 'gradual') {
    trueDriftOnsetSteps = [1000];
    noiseBurstSteps = [720];
  } else if (scenario === 'recurring') {
    trueDriftOnsetSteps = [950, 1550];
    noiseBurstSteps = [700];
  } else {
    // noise_burst: heavy isolated benign spikes, only 1 late mild shift
    trueDriftOnsetSteps = [1820];
    noiseBurstSteps = [760, 1260];
  }

  const records: TransactionRecord[] = [];
  const recentStepTimestamps: number[] = [];

  for (let step = 0; step < totalCount; step++) {
    // Determine regime mixing alpha in [0, 1] where 0 = Concept A (baseline), 1 = Concept B (shifted fraud tactic)
    let conceptMix = 0;
    let regimeLabel = 'Baseline Concept A';
    let isTrueDriftWindow = false;
    let isTrueDriftOnset = false;
    let isNoiseBurstWindow = false;

    if (scenario === 'abrupt') {
      if (step >= 1050 && step < 1750) {
        conceptMix = 1.0;
        regimeLabel = 'Abrupt Drift (Concept B)';
        isTrueDriftWindow = step >= 1050 && step <= 1180;
        isTrueDriftOnset = step === 1050;
      } else if (step >= 1750) {
        conceptMix = 0.85;
        regimeLabel = 'Secondary Shift (Concept C)';
        isTrueDriftWindow = step >= 1750 && step <= 1880;
        isTrueDriftOnset = step === 1750;
      }
      if (step >= 740 && step < 795) {
        isNoiseBurstWindow = true;
      }
    } else if (scenario === 'gradual') {
      if (step >= 1000 && step < 1450) {
        conceptMix = (step - 1000) / 450;
        regimeLabel = 'Gradual Transition (A -> B)';
        isTrueDriftWindow = step >= 1000 && step <= 1350;
        isTrueDriftOnset = step === 1000;
      } else if (step >= 1450) {
        conceptMix = 1.0;
        regimeLabel = 'Post-Gradual (Concept B)';
      }
      if (step >= 720 && step < 775) {
        isNoiseBurstWindow = true;
      }
    } else if (scenario === 'recurring') {
      if (step >= 950 && step < 1550) {
        conceptMix = 1.0;
        regimeLabel = 'Drifted Attack Wave (Concept B)';
        isTrueDriftWindow = step >= 950 && step <= 1080;
        isTrueDriftOnset = step === 950;
      } else if (step >= 1550) {
        conceptMix = 0.0;
        regimeLabel = 'Recurring Baseline (Concept A)';
        isTrueDriftWindow = step >= 1550 && step <= 1680;
        isTrueDriftOnset = step === 1550;
      }
      if (step >= 700 && step < 755) {
        isNoiseBurstWindow = true;
      }
    } else {
      // noise_burst
      if ((step >= 760 && step < 825) || (step >= 1260 && step < 1325)) {
        isNoiseBurstWindow = true;
        regimeLabel = 'Isolated Promotional Spend Surge';
      }
      if (step >= 1820) {
        conceptMix = 0.9;
        regimeLabel = 'Late Fraud Shift (Concept B)';
        isTrueDriftWindow = step >= 1820 && step <= 1950;
        isTrueDriftOnset = step === 1820;
      }
    }

    // Rare fraud rate: ~2.1% in stream so rare-event PR-AUC & Recall@K have statistically rich signal
    // while keeping class imbalance severe (>45:1 legitimate-to-fraud)
    const baseFraudRate = dataset === 'ulb' ? 0.019 : 0.024;
    const isFraud: 0 | 1 = rng() < baseFraudRate ? 1 : 0;

    // Causal rolling velocity (transactions in recent 25-step window, zero future leakage)
    recentStepTimestamps.push(step);
    while (recentStepTimestamps.length > 0 && step - recentStepTimestamps[0] > 25) {
      recentStepTimestamps.shift();
    }

    const noiseShift = isNoiseBurstWindow ? 1.55 : 0;
    let features: number[] = [];
    let amount = 0;
    let channel = '';

    if (dataset === 'ulb') {
      // Concept A fraud relies on high V4, strongly negative V14 & V12, moderate amount
      // Concept B fraud shifts to low-value card-testing bursts: V10/V17/TxVelocity high, V14 near normal
      const useB = rng() < conceptMix;
      const channels = ['E-Commerce CNP', 'Mobile Wallet', 'POS Contactless', 'Cross-Border Web'];
      channel = channels[Math.floor(rng() * channels.length)];

      if (isFraud === 1) {
        if (!useB) {
          const v14 = sampleNormal(rng, -2.6, 0.7);
          const v4 = sampleNormal(rng, 2.3, 0.65);
          const v12 = sampleNormal(rng, -2.2, 0.7);
          const v10 = sampleNormal(rng, -1.4, 0.6);
          const v17 = sampleNormal(rng, -1.5, 0.7);
          const v7 = sampleNormal(rng, -1.1, 0.6);
          amount = Math.round(Math.exp(sampleNormal(rng, 5.1, 0.9)) * 100) / 100;
          const logAmt = Math.log1p(amount) / 4 - 1.0;
          const vel = sampleNormal(rng, 1.3, 0.5);
          features = [v14, v4, v12, v10, v17, v7, logAmt, vel];
        } else {
          // Concept B: stealthy low-amount card-testing / token replay
          const v14 = sampleNormal(rng, 0.9, 0.6);
          const v4 = sampleNormal(rng, -1.2, 0.6);
          const v12 = sampleNormal(rng, 0.8, 0.6);
          const v10 = sampleNormal(rng, 2.7, 0.65);
          const v17 = sampleNormal(rng, 2.5, 0.65);
          const v7 = sampleNormal(rng, 1.9, 0.6);
          amount = Math.round(Math.exp(sampleNormal(rng, 3.2, 0.5)) * 100) / 100;
          const logAmt = Math.log1p(amount) / 4 - 1.0;
          const vel = sampleNormal(rng, 2.6, 0.5);
          features = [v14, v4, v12, v10, v17, v7, logAmt, vel];
        }
      } else {
        // Legitimate transaction (with optional benign virtual/noise surge in LogAmount & Velocity)
        const v14 = sampleNormal(rng, 0.12, 0.85);
        const v4 = sampleNormal(rng, -0.1, 0.85);
        const v12 = sampleNormal(rng, 0.08, 0.85);
        const v10 = sampleNormal(rng, 0.0, 0.8);
        const v17 = sampleNormal(rng, -0.05, 0.8);
        const v7 = sampleNormal(rng, 0.05, 0.8);
        amount = Math.round(Math.exp(sampleNormal(rng, 3.8 + noiseShift * 0.5, 0.95)) * 100) / 100;
        const logAmt = Math.log1p(amount) / 4 - 1.0 + noiseShift * 0.6;
        const vel = sampleNormal(rng, -0.2 + noiseShift * 0.85, 0.65);
        features = [v14, v4, v12, v10, v17, v7, logAmt, vel];
      }
    } else {
      // PaySim Mobile Money Stream
      const useB = rng() < conceptMix;
      const types = ['PAYMENT', 'CASH_OUT', 'TRANSFER', 'DEBIT'];
      if (isFraud === 1) {
        channel = rng() < 0.52 ? 'TRANSFER' : 'CASH_OUT';
        if (!useB) {
          // Concept A: full account-balance drain via TRANSFER -> CASH_OUT
          amount = Math.round((850 + rng() * 6400) * 100) / 100;
          features = [
            sampleNormal(rng, 1.9, 0.5), // Amount_LogRatio
            sampleNormal(rng, 2.5, 0.5), // OrigBalance_Drain
            sampleNormal(rng, 1.8, 0.6), // DestBalance_Delta
            1.6, // TransferCashout_Flag
            sampleNormal(rng, 1.1, 0.6), // MuleHop_Velocity
            sampleNormal(rng, 1.4, 0.6), // NightWindow_Risk
            sampleNormal(rng, 1.3, 0.5), // NewDest_Flag
            sampleNormal(rng, 0.7, 0.5), // DeviceChurn_Score
          ];
        } else {
          // Concept B: split-amount mule-ring hops & device churn (evades single-drain rule)
          channel = rng() < 0.7 ? 'TRANSFER' : 'PAYMENT';
          amount = Math.round((140 + rng() * 680) * 100) / 100;
          features = [
            sampleNormal(rng, -0.8, 0.5),
            sampleNormal(rng, -0.7, 0.5),
            sampleNormal(rng, -0.6, 0.5),
            0.5,
            sampleNormal(rng, 2.7, 0.5), // MuleHop_Velocity
            sampleNormal(rng, 2.2, 0.5), // NightWindow_Risk
            sampleNormal(rng, 2.4, 0.5), // NewDest_Flag
            sampleNormal(rng, 2.6, 0.5), // DeviceChurn_Score
          ];
        }
      } else {
        const typeIdx = Math.floor(rng() * types.length);
        channel = types[typeIdx];
        amount = Math.round(Math.exp(sampleNormal(rng, 4.4 + noiseShift * 0.45, 0.85)) * 100) / 100;
        features = [
          sampleNormal(rng, -0.2 + noiseShift * 0.75, 0.75),
          sampleNormal(rng, -0.25, 0.7),
          sampleNormal(rng, -0.15, 0.7),
          channel === 'TRANSFER' || channel === 'CASH_OUT' ? 0.4 : -0.6,
          sampleNormal(rng, -0.2 + noiseShift * 0.65, 0.65),
          sampleNormal(rng, -0.1, 0.75),
          sampleNormal(rng, -0.2, 0.7),
          sampleNormal(rng, -0.25, 0.65),
        ];
      }
    }

    const hour = Math.floor((step * 2.4) % 24);
    const minute = Math.floor((step * 17) % 60);
    const day = Math.floor((step * 2.4) / 24) + 1;
    const timestampLabel = `D${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    records.push({
      step,
      txId: `TX-${dataset === 'ulb' ? 'ULB' : 'PS'}-${String(step + 10001)}`,
      timestampLabel,
      dataset,
      channel,
      amount: Math.max(1.25, amount),
      features,
      featureNames,
      rawSummary: {
        Channel: channel,
        Amount: `$${Math.max(1.25, amount).toFixed(2)}`,
        Regime: regimeLabel,
      },
      isFraud,
      labelAvailableAtStep: step + labelDelay,
      regimeLabel,
      isTrueDriftWindow,
      isTrueDriftOnset,
      isNoiseBurstWindow,
    });
  }

  return {
    records,
    warmStartCount,
    trueDriftOnsetSteps,
    noiseBurstSteps,
    featureNames,
  };
}
