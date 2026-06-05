import type { DetectedPattern, PatternCategory } from '@/types';

interface EvidenceListProps {
  patterns: DetectedPattern[];
}

function PatternRow({ pattern }: { pattern: DetectedPattern }) {
  const pct = pattern.maxScore > 0 ? Math.round((pattern.score / pattern.maxScore) * 100) : 0;

  const severityColor: Record<string, string> = {
    high: '#f87171',
    medium: '#fb923c',
    low: '#facc15',
    none: 'var(--muted)',
  };

  return (
    <div
      className="py-5 border-b border-[var(--border)] grid gap-x-6 items-start transition-opacity"
      style={{
        gridTemplateColumns: '1rem 1fr auto',
        opacity: pattern.detected ? 1 : 0.3,
      }}
    >
      {/* Status dot */}
      <div className="pt-[5px] flex-shrink-0">
        <span
          className="block w-1.5 h-1.5 rounded-full"
          style={{ background: pattern.detected ? severityColor[pattern.severity] : '#4ade80' }}
        />
      </div>

      {/* Name + evidence */}
      <div>
        <p className="text-sm font-medium text-[var(--text)] mb-0.5">{pattern.name}</p>
        <p className="text-xs text-[var(--muted)] mb-2">{pattern.description}</p>

        {pattern.detected && pattern.evidence.length > 0 && (
          <ul className="space-y-0.5">
            {pattern.evidence.map((e, i) => (
              <li
                key={i}
                className="text-[11px] text-[var(--muted)] flex items-start gap-2"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span className="opacity-40 flex-shrink-0">→</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        )}

        {!pattern.detected && (
          <p className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: '#4ade80' }}>
            Not detected
          </p>
        )}
      </div>

      {/* Severity indicator */}
      <div className="text-right flex-shrink-0">
        {pattern.detected && (
          <>
            <p
              className="text-[11px] mb-2"
              style={{ fontFamily: 'var(--font-mono)', color: severityColor[pattern.severity] }}
            >
              {pattern.severity}
            </p>
            <div className="w-14 h-0.5 bg-[var(--border-mid)] overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, background: severityColor[pattern.severity] }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<PatternCategory, { label: string; color: string }> = {
  visual: { label: 'Visual Patterns', color: '#818cf8' },
  structural: { label: 'Structural Patterns', color: '#fb923c' },
  content: { label: 'Content Patterns', color: '#f472b6' },
};

export function EvidenceList({ patterns }: EvidenceListProps) {
  const categories: PatternCategory[] = ['visual', 'structural', 'content'];

  return (
    <div className="space-y-10">
      {categories.map((cat) => {
        const group = patterns.filter((p) => p.category === cat);
        const detected = group.filter((p) => p.detected);
        const { label, color } = CATEGORY_LABELS[cat];

        return (
          <div key={cat}>
            {/* Category header */}
            <div className="border-t border-[var(--border)] pt-4 mb-1 flex items-baseline justify-between">
              <div className="flex items-center gap-3">
                <span className="block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                <p
                  className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {label}
                </p>
              </div>
              <p className="text-[11px] text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
                {detected.length}/{group.length} detected
              </p>
            </div>

            {/* Sort: detected first, then clean */}
            {[...group.filter((p) => p.detected), ...group.filter((p) => !p.detected)].map((p) => (
              <PatternRow key={p.id} pattern={p} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
