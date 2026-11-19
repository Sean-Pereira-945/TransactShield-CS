import { CheckCircle2, ShieldAlert, X, XCircle } from 'lucide-react';
import { ScoredTransaction } from '../types/transactshield';

interface CasePacketDrawerProps {
  transaction: ScoredTransaction | null;
  onClose: () => void;
  onFeedback: (txId: string, feedback: 'confirmed_fraud' | 'false_positive') => void;
}

export function CasePacketDrawer({
  transaction,
  onClose,
  onFeedback,
}: CasePacketDrawerProps) {
  if (!transaction) return null;

  const maxAbsShap = Math.max(
    0.25,
    ...transaction.shapTopK.map((item) => Math.abs(item.contribution))
  );

  const decisionStyle =
    transaction.decision === 'Decline'
      ? 'text-red-700'
      : transaction.decision === 'Review'
        ? 'text-amber-700'
        : 'text-emerald-700';

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/20"
      role="dialog"
      aria-modal="true"
      aria-label={`Investigator Case Packet for ${transaction.txId}`}
    >
      <div className="w-full max-w-lg bg-white h-full border-l border-slate-200 flex flex-col justify-between overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500 font-mono tabular-nums">
                Investigator Case Packet · {transaction.txId}
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900 mt-1">
                {transaction.channel} · ${transaction.amount.toFixed(2)}
              </h2>
              <div className="text-xs text-slate-500 mt-1">
                {transaction.timestampLabel} · Regime: {transaction.regimeLabel} · Model{' '}
                <span className="font-mono">{transaction.modelVersion}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close case packet"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Score & Decision Policy Summary */}
          <div className="grid grid-cols-3 gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500">Fraud Score</div>
              <div className="font-mono tabular-nums text-xl font-semibold text-slate-900 mt-1">
                {(transaction.fraudScore * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Policy Action</div>
              <div className={`text-base font-semibold mt-1.5 flex items-center gap-1.5 ${decisionStyle}`}>
                <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{transaction.decision}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Delayed Ground Truth</div>
              <div className="text-sm font-medium text-slate-800 mt-1.5 font-mono tabular-nums">
                {transaction.isFraud === 1 ? 'Confirmed Fraud' : 'Legitimate'}
              </div>
            </div>
          </div>

          {/* SHAP Top-K Feature Contributions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                SHAP Per-Transaction Attribution (Log-Odds)
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Base φ₀ = {transaction.baseLogOdds.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Additive contributions relative to the Stage-I baseline feature mean. Positive values
              push toward fraud; negative values mitigate risk.
            </p>

            <div className="space-y-3">
              {transaction.shapTopK.map((item) => {
                const pct = Math.min(100, (Math.abs(item.contribution) / maxAbsShap) * 100);
                const isPositive = item.contribution >= 0;
                return (
                  <div key={item.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate pr-2">
                        {item.feature}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 shrink-0">
                        x={item.value.toFixed(2)} ·{' '}
                        <span className={isPositive ? 'text-red-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                          {isPositive ? '+' : ''}
                          {item.contribution.toFixed(3)}
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-xs overflow-hidden">
                      <div
                        className={`h-full ${isPositive ? 'bg-red-600' : 'bg-emerald-600'}`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Investigator Audit Guidance */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs text-slate-600">
            <div className="font-semibold text-slate-800">ORT Governance &amp; Audit Note</div>
            <p className="leading-relaxed">
              Thresholds are calibrated for 3-tier risk management (Allow &lt; 42%, Step-Up Review
              42%–72%, Decline ≥ 72%). Analyst feedback is recorded against model{' '}
              <span className="font-mono">{transaction.modelVersion}</span> for post-hoc auditability.
            </p>
          </div>
        </div>

        {/* Analyst Feedback Actions */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {transaction.analystFeedback === 'confirmed_fraud' && 'Recorded: Confirmed Fraud'}
            {transaction.analystFeedback === 'false_positive' && 'Recorded: False Positive'}
            {!transaction.analystFeedback && 'Record investigator disposition:'}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onFeedback(transaction.txId, 'false_positive')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                transaction.analystFeedback === 'false_positive'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>False Positive</span>
            </button>
            <button
              type="button"
              onClick={() => onFeedback(transaction.txId, 'confirmed_fraud')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                transaction.analystFeedback === 'confirmed_fraud'
                  ? 'bg-red-700 text-white border-red-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Confirm Fraud</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
