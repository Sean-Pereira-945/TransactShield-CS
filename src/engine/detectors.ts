/**
 * Mathematical implementations of streaming concept-drift detectors:
 * 1. ADWIN (Bifet & Gavalda, 2007) — Label-dependent adaptive sliding window
 * 2. DDM (Gama et al., 2004) — Label-dependent PAC-learning error rate & std monitor
 * 3. Page-Hinkley (Page, 1954) — Label-independent cumulative score mean-shift detector
 * 4. 1D Kolmogorov-Smirnov Virtual Drift Check (Chen et al., 2026 FELK-inspired)
 */

export class ADWINDetector {
  private window: number[] = [];
  private readonly delta: number;
  private readonly minWindowLength: number;
  private readonly maxWindowLength: number;

  constructor(delta = 0.01, minWindowLength = 30, maxWindowLength = 400) {
    this.delta = delta;
    this.minWindowLength = minWindowLength;
    this.maxWindowLength = maxWindowLength;
  }

  public update(errorBit: number): { detected: boolean; mean: number; windowSize: number } {
    this.window.push(errorBit);
    if (this.window.length > this.maxWindowLength) {
      this.window.shift();
    }

    const n = this.window.length;
    if (n < this.minWindowLength * 2) {
      return {
        detected: false,
        mean: this.meanOf(this.window),
        windowSize: n,
      };
    }

    let prefixSum = 0;
    const totalSum = this.window.reduce((acc, v) => acc + v, 0);
    let cutDetected = false;
    let bestCutIndex = -1;

    // Evaluate candidate split points across the window
    const step = Math.max(1, Math.floor(n / 25));
    for (let i = this.minWindowLength; i <= n - this.minWindowLength; i += step) {
      // Compute prefixSum up to i
      prefixSum = 0;
      for (let j = 0; j < i; j++) {
        prefixSum += this.window[j];
      }
      const n0 = i;
      const n1 = n - i;
      const mu0 = prefixSum / n0;
      const mu1 = (totalSum - prefixSum) / n1;

      const m = 1 / (1 / n0 + 1 / n1);
      const deltaPrime = this.delta / Math.log(n);
      const epsilonCut = Math.sqrt((1 / (2 * m)) * Math.log(4 / Math.max(deltaPrime, 1e-12)));

      if (Math.abs(mu0 - mu1) > epsilonCut) {
        cutDetected = true;
        bestCutIndex = i;
        break;
      }
    }

    if (cutDetected && bestCutIndex > 0) {
      this.window = this.window.slice(bestCutIndex);
    }

    return {
      detected: cutDetected,
      mean: this.meanOf(this.window),
      windowSize: this.window.length,
    };
  }

  public reset(): void {
    this.window = [];
  }

  private meanOf(arr: number[]): number {
    if (arr.length === 0) return 0;
    let s = 0;
    for (let i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }
}

export class DDMDetector {
  private n = 0;
  private p = 0;
  private pMin = Number.POSITIVE_INFINITY;
  private sMin = Number.POSITIVE_INFINITY;
  private readonly minSamples: number;
  private readonly warningLevel: number;
  private readonly driftLevel: number;

  constructor(minSamples = 40, warningLevel = 2.0, driftLevel = 3.0) {
    this.minSamples = minSamples;
    this.warningLevel = warningLevel;
    this.driftLevel = driftLevel;
  }

  public update(errorBit: number): {
    status: 'normal' | 'warning' | 'drift';
    errorRate: number;
    boundRatio: number;
  } {
    this.n += 1;
    this.p = this.p + (errorBit - this.p) / this.n;
    const s = Math.sqrt((this.p * (1 - this.p)) / this.n);

    if (this.n < this.minSamples) {
      return { status: 'normal', errorRate: this.p, boundRatio: 0 };
    }

    const ps = this.p + s;
    const minPs = this.pMin + this.sMin;

    if (ps < minPs || !Number.isFinite(this.pMin)) {
      this.pMin = this.p;
      this.sMin = s;
    }

    const safeSMin = Math.max(this.sMin, 0.004);
    const driftThreshold = this.pMin + this.driftLevel * safeSMin;
    const warningThreshold = this.pMin + this.warningLevel * safeSMin;
    const boundRatio = (ps - this.pMin) / safeSMin;

    if (ps > driftThreshold) {
      this.reset();
      return { status: 'drift', errorRate: this.p, boundRatio };
    }
    if (ps > warningThreshold) {
      return { status: 'warning', errorRate: this.p, boundRatio };
    }
    return { status: 'normal', errorRate: this.p, boundRatio };
  }

  public reset(): void {
    this.n = 0;
    this.p = 0;
    this.pMin = Number.POSITIVE_INFINITY;
    this.sMin = Number.POSITIVE_INFINITY;
  }
}

export class PageHinkleyDetector {
  private n = 0;
  private mean = 0;
  private cumulativeSum = 0;
  private minCumulativeSum = 0;
  private maxCumulativeSum = 0;
  private readonly delta: number;
  private readonly threshold: number;
  private readonly minSamples: number;

  constructor(delta = 0.004, threshold = 4.2, minSamples = 45) {
    this.delta = delta;
    this.threshold = threshold;
    this.minSamples = minSamples;
  }

  public update(scoreValue: number): {
    detected: boolean;
    statistic: number;
    runningMean: number;
  } {
    this.n += 1;
    this.mean = this.mean + (scoreValue - this.mean) / this.n;

    // Two-sided Page-Hinkley monitoring both upward and downward shifts in score distribution
    this.cumulativeSum = this.cumulativeSum + (scoreValue - this.mean - this.delta);
    if (this.cumulativeSum < this.minCumulativeSum) {
      this.minCumulativeSum = this.cumulativeSum;
    }
    if (this.cumulativeSum > this.maxCumulativeSum) {
      this.maxCumulativeSum = this.cumulativeSum;
    }

    const phUp = this.cumulativeSum - this.minCumulativeSum;
    const phDown = this.maxCumulativeSum - this.cumulativeSum;
    const statistic = Math.max(phUp, phDown);

    if (this.n >= this.minSamples && statistic > this.threshold) {
      const currentMean = this.mean;
      this.reset();
      return { detected: true, statistic, runningMean: currentMean };
    }

    return { detected: false, statistic, runningMean: this.mean };
  }

  public reset(): void {
    this.n = 0;
    this.mean = 0;
    this.cumulativeSum = 0;
    this.minCumulativeSum = 0;
    this.maxCumulativeSum = 0;
  }
}

/**
 * Lightweight 1D Two-Sample Kolmogorov-Smirnov test across feature dimensions
 * with early-exit (FELK principle from Chen et al., 2026) to diagnose Virtual Drift P(X).
 */
export function runVirtualDriftKSCheck(
  referenceWindow: number[][],
  currentWindow: number[][],
  alpha = 0.01
): { detected: boolean; minPValue: number; driftedFeatureIdx: number } {
  if (referenceWindow.length < 25 || currentWindow.length < 25) {
    return { detected: false, minPValue: 1, driftedFeatureIdx: -1 };
  }

  const dims = referenceWindow[0].length;
  const n1 = referenceWindow.length;
  const n2 = currentWindow.length;
  const cAlpha = Math.sqrt(-0.5 * Math.log(alpha / 2));
  const criticalD = cAlpha * Math.sqrt((n1 + n2) / (n1 * n2));

  let minPValue = 1;
  let driftedFeatureIdx = -1;

  for (let d = 0; d < dims; d++) {
    const a = referenceWindow.map((r) => r[d]).sort((x, y) => x - y);
    const b = currentWindow.map((r) => r[d]).sort((x, y) => x - y);

    let i = 0;
    let j = 0;
    let maxDiff = 0;
    while (i < n1 && j < n2) {
      if (a[i] <= b[j]) {
        i++;
      } else {
        j++;
      }
      const diff = Math.abs(i / n1 - j / n2);
      if (diff > maxDiff) maxDiff = diff;
    }

    const en = Math.sqrt((n1 * n2) / (n1 + n2));
    const approxP = Math.min(1, 2 * Math.exp(-2 * Math.pow(maxDiff * en, 2)));
    if (approxP < minPValue) {
      minPValue = approxP;
    }

    // Early-leave on first strongly drifted feature dimension (FELK)
    if (maxDiff > criticalD * 1.15) {
      driftedFeatureIdx = d;
      return { detected: true, minPValue: approxP, driftedFeatureIdx };
    }
  }

  return { detected: false, minPValue, driftedFeatureIdx };
}
