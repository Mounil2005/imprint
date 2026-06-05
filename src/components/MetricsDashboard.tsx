import type { AnalysisMetrics } from '@/types';

interface MetricsDashboardProps {
  metrics: AnalysisMetrics;
}

/*
  REDESIGN RATIONALE:
  Original: 8 identical rounded-xl bordered cards, each with an emoji icon,
  a large number, a label, and a description. A classic AI-generated card grid.

  New approach: A single horizontal data strip divided by thin border-r lines.
  Compact, dense, and functional — reads as a data table, not a feature showcase.
  The values stand alone without needing card chrome to hold them.
*/
export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  const items = [
    { label: 'Cards', value: metrics.cardCount },
    { label: 'Badges', value: metrics.badgeCount },
    { label: 'CTAs', value: metrics.ctaCount },
    { label: 'Repeated Sections', value: metrics.repeatedSections },
    { label: 'Marketing Phrases', value: metrics.genericPhrases },
    { label: 'Nested Cards', value: metrics.nestedCardInstances },
    { label: 'Testimonials', value: metrics.testimonialCount },
    { label: 'Pricing Tiers', value: metrics.pricingTierCount },
  ];

  return (
    <div>
      <p
        className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-4"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Detected Counts
      </p>
      {/* Horizontal data strip — no cards, just border-b and border-r lines */}
      <div className="border border-[var(--border)] grid grid-cols-2 sm:grid-cols-4">
        {items.map((item, i) => {
          const isRight = (i + 1) % 2 === 0;
          const isRightSm = (i + 1) % 4 === 0;
          const isBottom = i < items.length - 2;
          const isBottomSm = i < items.length - 4;
          return (
            <div
              key={item.label}
              className={`px-5 py-4 ${
                !isRight ? 'border-r border-[var(--border)]' : ''
              } ${
                !isRightSm ? 'sm:border-r' : 'sm:border-r-0'
              } ${
                isBottom ? 'border-b border-[var(--border)]' : ''
              } ${
                isBottomSm ? 'sm:border-b' : 'sm:border-b-0'
              }`}
            >
              <div
                className="text-2xl sm:text-3xl font-black num mb-1"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: item.value > 0 ? 'var(--text)' : 'var(--muted)',
                }}
              >
                {item.value}
              </div>
              <div
                className="text-[11px] text-[var(--muted)]"
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
