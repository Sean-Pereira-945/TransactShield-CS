import { useState } from 'react';
import { TimelinePoint } from '../types/transactshield';

interface DriftTimelineChartProps {
  fusionTimeline: TimelinePoint[];
  staticTimeline: TimelinePoint[];
  visibleStepLimit?: number;
}

type SignalMetric = 'rollingPrAuc' | 'adwinErrorMean' | 'ddmErrorBound' | 'phStatistic';

const SIGNAL_OPTIONS: { id: SignalMetric; label: string; description: string }[] = [
  {
    id: 'rollingPrAuc',
    label: 'Rolling PR-AUC',
    description: 'Fusion adaptive curve vs. Static baseline across streaming transactions',
  },
  {
    id: 'adwinErrorMean',
    label: 'ADWIN Error Mean',
    description: 'Label-dependent adaptive windowing error estimate (post label delay)',
  },
  {
    id: 'ddmErrorBound',
    label: 'DDM Sigma Bound',
    description: 'PAC-learning error trajectory relative to minimum error (drift > 2.95 sigma)',
  },
  {
    id: 'phStatistic',
    label: 'Page-Hinkley Stat',
    description: 'Label-independent score distribution cumulative mean shift (early warning)',
  },
];

export function DriftTimelineChart({
  fusionTimeline,
  staticTimeline,
  visibleStepLimit,
}: DriftTimelineChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<SignalMetric>('rollingPrAuc');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const slicedFusion = visibleStepLimit
    ? fusionTimeline.filter((p) => p.step <= visibleStepLimit)
    : fusionTimeline;

  const slicedStatic = visibleStepLimit
    ? staticTimeline.filter((p) => p.step <= visibleStepLimit)
    : staticTimeline;

  if (slicedFusion.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-500 border border-slate-200 rounded-xl bg-white">
        Advance the stream to collect detector telemetry points.
      </div>
    );
  }

  const width = 880;
  const height = 270;
  const pad = { top: 24, right: 24, bottom: 36, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const minStep = fusionTimeline[0].step;
  const maxStep = fusionTimeline[fusionTimeline.length - 1].step;
  const stepSpan = Math.max(1, maxStep - minStep);

  const values = slicedFusion.map((p) => p[selectedMetric]);
  const staticValues =
    selectedMetric === 'rollingPrAuc' ? slicedStatic.map((p) => p.rollingPrAuc) : [];

  const maxValRaw = Math.max(
    selectedMetric === 'rollingPrAuc' ? 1.0 : 0.05,
    ...values,
    ...staticValues
  );
  const yMax =
    selectedMetric === 'rollingPrAuc'
      ? 1.0
      : selectedMetric === 'ddmErrorBound'
        ? Math.max(3.5, Math.ceil(maxValRaw * 1.15))
        : selectedMetric === 'phStatistic'
          ? Math.max(4.5, Math.ceil(maxValRaw * 1.15))
          : Math.max(0.08, Number((maxValRaw * 1.25).toFixed(3)));

  const xOf = (step: number) => pad.left + ((step - minStep) / stepSpan) * plotW;
  const yOf = (val: number) => pad.top + plotH - (Math.min(yMax, Math.max(0, val)) / yMax) * plotH;

  const buildPath = (pts: TimelinePoint[], key: SignalMetric) =>
    pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.step).toFixed(1)} ${yOf(p[key]).toFixed(1)}`)
      .join(' ');

  const fusionPath = buildPath(slicedFusion, selectedMetric);
  const staticPath =
    selectedMetric === 'rollingPrAuc' && slicedStatic.length > 1
      ? buildPath(slicedStatic, 'rollingPrAuc')
      : '';

  const isolatedMarkers = slicedFusion.filter((p) => p.fusionState === 'Isolated Drift');
  const systemicMarkers = slicedFusion.filter((p) => p.fusionState === 'Systemic Drift');
  const onsetMarkers = fusionTimeline.filter((p) => p.isTrueDriftOnset);

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((frac) => ({
    val: frac * yMax,
    y: pad.top + plotH - frac * plotH,
  }));

  const activeOption = SIGNAL_OPTIONS.find((o) => o.id === selectedMetric)!;
  const hoveredPoint = hoverIdx !== null && slicedFusion[hoverIdx] ? slicedFusion[hoverIdx] : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Detector Signal &amp; Fusion Timeline
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{activeOption.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {SIGNAL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedMetric(opt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedMetric === opt.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-700 inline-block" />
          <span>Fusion ({activeOption.label})</span>
        </div>
        {selectedMetric === 'rollingPrAuc' && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-400 inline-block" />
            <span>Static Baseline</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
          <span>Isolated Drift (Logged, No Retrain)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" />
          <span>Systemic Drift (Retrain Triggered)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-3 border-l-2 border-slate-700 inline-block" />
          <span>Injected Drift Onset</span>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[640px]"
          role="img"
          aria-label="Multi-detector concept drift timeline chart"
        >
          {/* Horizontal gridlines */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={pad.left}
                y1={tick.y}
                x2={width - pad.right}
                y2={tick.y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {selectedMetric === 'rollingPrAuc' || selectedMetric === 'adwinErrorMean'
                  ? tick.val.toFixed(2)
                  : tick.val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* True drift onset vertical guides */}
          {onsetMarkers.map((m) => (
            <g key={`onset-${m.step}`}>
              <line
                x1={xOf(m.step)}
                y1={pad.top}
                x2={xOf(m.step)}
                y2={height - pad.bottom}
                stroke="#334155"
                strokeWidth="1.25"
                strokeDasharray="4 3"
              />
              <text
                x={xOf(m.step) + 4}
                y={pad.top + 10}
                className="fill-slate-700 text-[10px] font-mono tabular-nums font-semibold"
              >
                Drift @{m.step}
              </text>
            </g>
          ))}

          {/* Threshold guide lines for DDM or Page-Hinkley */}
          {selectedMetric === 'ddmErrorBound' && (
            <line
              x1={pad.left}
              y1={yOf(2.95)}
              x2={width - pad.right}
              y2={yOf(2.95)}
              stroke="#DC2626"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}
          {selectedMetric === 'phStatistic' && (
            <line
              x1={pad.left}
              y1={yOf(3.8)}
              x2={width - pad.right}
              y2={yOf(3.8)}
              stroke="#DC2626"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* Static baseline dashed curve */}
          {staticPath && (
            <path
              d={staticPath}
              fill="none"
              stroke="#94A3B8"
              strokeWidth="1.75"
              strokeDasharray="5 4"
            />
          )}

          {/* Fusion signal curve */}
          <path d={fusionPath} fill="none" stroke="#1D4ED8" strokeWidth="2.25" />

          {/* Isolated Drift Markers */}
          {isolatedMarkers.map((m) => (
            <circle
              key={`iso-${m.step}`}
              cx={xOf(m.step)}
              cy={yOf(m[selectedMetric])}
              r="4"
              fill="#D97706"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          ))}

          {/* Systemic Drift Retrain Markers */}
          {systemicMarkers.map((m) => (
            <rect
              key={`sys-${m.step}`}
              x={xOf(m.step) - 4.5}
              y={yOf(m[selectedMetric]) - 4.5}
              width="9"
              height="9"
              rx="1.5"
              fill="#DC2626"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
          ))}

          {/* X-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
            const stepVal = Math.round(minStep + frac * stepSpan);
            return (
              <text
                key={idx}
                x={xOf(stepVal)}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                Txn {stepVal}
              </text>
            );
          })}

          {/* Interactive hover targets */}
          {slicedFusion.map((pt, idx) => (
            <rect
              key={`hit-${pt.step}-${idx}`}
              x={xOf(pt.step) - 6}
              y={pad.top}
              width="12"
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}

          {hoveredPoint && (
            <line
              x1={xOf(hoveredPoint.step)}
              y1={pad.top}
              x2={xOf(hoveredPoint.step)}
              y2={height - pad.bottom}
              stroke="#1D4ED8"
              strokeWidth="1"
              strokeOpacity="0.4"
            />
          )}
        </svg>

        {hoveredPoint && (
          <div className="mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-700">
            <span className="font-semibold text-slate-900">Step {hoveredPoint.step}</span>
            <span>PR-AUC: {hoveredPoint.rollingPrAuc.toFixed(3)}</span>
            <span>ADWIN Err: {hoveredPoint.adwinErrorMean.toFixed(4)}</span>
            <span>DDM Bound: {hoveredPoint.ddmErrorBound.toFixed(2)}σ</span>
            <span>PH Stat: {hoveredPoint.phStatistic.toFixed(2)}</span>
            <span>Fusion: {hoveredPoint.fusionState}</span>
            <span>Model: v1.{hoveredPoint.modelVersionNum - 1}</span>
          </div>
        )}
      </div>
    </div>
  );
}
