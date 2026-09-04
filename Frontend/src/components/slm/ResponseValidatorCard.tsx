import { CheckCircle2, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { ValidationCheckResult } from '@/lib/slmEngine';

interface ResponseValidatorCardProps {
  validation: ValidationCheckResult | null;
  deviceId?: string;
}

export function ResponseValidatorCard({ validation, deviceId }: ResponseValidatorCardProps) {
  if (!validation) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-graphite-900/40 p-5 text-center text-xs text-gray-500">
        <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-gray-600" />
        Response Validator idle. Awaiting query dispatch to inspect grounding and safety metrics.
      </div>
    );
  }

  const checks = [
    {
      label: 'Telemetry Grounded',
      desc: 'Response mapped to real machine telemetry schema',
      passed: validation.telemetry_grounded,
    },
    {
      label: 'Device Matched',
      desc: `Target machine verified in edge registry (${deviceId || 'Active Device'})`,
      passed: validation.device_matched,
    },
    {
      label: 'No Unsupported Values',
      desc: 'No hallucinated or fabricated metrics; safe fallback if unavailable',
      passed: validation.no_unsupported_values,
    },
    {
      label: 'Response Validated & Safety Guard',
      desc: 'Actuator controls disallowed; read-only telemetry boundary confirmed',
      passed: validation.safety_actuator_passed,
    },
  ];

  const allPassed = validation.overall_status === 'PASSED';

  return (
    <div className="rounded-xl border border-white/[0.08] bg-graphite-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`h-4 w-4 ${allPassed ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
            Response Validator Status
          </span>
        </div>
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase border ${
            allPassed
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
          }`}
        >
          {allPassed ? (
            <>
              <CheckCircle2 className="h-3 w-3" /> PASSED
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3" /> REJECTED
            </>
          )}
        </span>
      </div>

      <div className="space-y-2">
        {checks.map((chk) => (
          <div
            key={chk.label}
            className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-200">
                {chk.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                )}
                <span>{chk.label}</span>
              </div>
              <div className="mt-0.5 pl-5 font-mono text-[10px] text-gray-500">{chk.desc}</div>
            </div>
            <span
              className={`font-mono text-[10px] font-bold ${
                chk.passed ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {chk.passed ? '✓ PASS' : '✕ FAIL'}
            </span>
          </div>
        ))}
      </div>

      {validation.rejection_reason && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{validation.rejection_reason}</span>
        </div>
      )}
    </div>
  );
}
