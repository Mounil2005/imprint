interface RecommendationsProps {
  recommendations: string[];
  score: number;
}

/*
  REDESIGN RATIONALE:
  Original: each recommendation in a rounded-xl bordered card with an emoji icon
  prefix. Identical container shapes for every item.

  New approach: numbered editorial list. Large faded numbers (01, 02…) act as
  typographic anchors. The actual recommendation text sits beside them with
  generous spacing. No card containers — just structured whitespace.
  This is how a design consultant would present findings, not a template generator.
*/
export function Recommendations({ recommendations, score }: RecommendationsProps) {
  if (score <= 25) {
    return (
      <div className="py-10 border-t border-[var(--border)]">
        <p
          className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Recommendations
        </p>
        <p className="text-sm text-[var(--text)] leading-relaxed max-w-lg">
          This site scores low on the AI Pattern Scale, suggesting a deliberate, custom
          design approach. No significant recommendations — keep focusing on specific,
          non-generic visual decisions.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border)] pt-4">
      <p
        className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-10"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Recommendations
      </p>
      <div className="space-y-0 max-w-2xl">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="grid grid-cols-[3rem_1fr] gap-x-5 py-8 border-b border-[var(--border)]"
          >
            {/* Large faded number as typographic anchor */}
            <span
              className="text-3xl font-black text-[var(--border-mid)] leading-none pt-0.5 num select-none"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="text-sm text-[var(--text)] leading-relaxed">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
