import type { DetectedPattern } from '@/types';
import { getScoreColor } from '@/lib/utils';

interface PatternBreakdownProps {
  patterns: DetectedPattern[];
}

/*
  REDESIGN RATIONALE:
  Original: bar chart rows inside a space-y-2 list — visually fine but wrapped
  in a labeled card section. Kept the bar chart concept but stripped surrounding
  card chrome and badge headers. Integrated naturally into the overview flow.
*/
export function PatternBreakdown({ patterns }: PatternBreakdownProps) {
  const detected = patterns.filter((p) => p.detected).sort((a, b) => b.score - a.score);

  if (detected.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">No patterns detected.</p>
    );
  }

  return (
    <div>
      <p
        className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-5"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Score Breakdown
      </p>
      <div className="space-y-4">
        {detected.map((pattern) => {
          const pct = Math.round((pattern.score / pattern.maxScore) * 100);
          const color = getScoreColor(pct);
          return (
            <div key={pattern.id}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs text-[var(--text)]">{pattern.name}</span>
                <span
                  className="text-[10px] px-1.5 rounded"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: `${color}18`,
                    color,
                  }}
                >
                  {pattern.severity}
                </span>
              </div>
              <div className="h-0.5 bg-[var(--border-mid)] overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: color, transition: 'width 0.8s ease-out' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
