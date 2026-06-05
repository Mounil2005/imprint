import type { ScoringBreakdown, DetectedPattern } from '@/types';
import { getScoreColor } from '@/lib/utils';

interface ScoringBreakdownPanelProps {
  breakdown: ScoringBreakdown;
  patterns: DetectedPattern[];
  finalScore: number;
}

// User-facing labels that describe page importance without revealing the weights
const PAGE_ROLE_LABEL: Record<string, string> = {
  homepage: 'Homepage',
  product: 'Product',
  services: 'Services',
  about: 'About',
  contact: 'Contact',
  legal: 'Excluded',
  other: 'Other',
};

export function PageScoreList({ breakdown, patterns, finalScore }: ScoringBreakdownPanelProps) {
  const detected = patterns.filter((p) => p.detected);
  const missing = patterns.filter((p) => !p.detected);

  const meaningfulPages = breakdown.pageContributions.filter((c) => c.weight > 0);
  const legalPages = breakdown.pageContributions.filter((c) => c.weight === 0);
  const finalColor = getScoreColor(finalScore);

  return (
    <div className="space-y-10">

      {/* ── Pattern coverage ────────────────────────────────────────────────── */}
      <div>
        <p
          className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-4"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Pattern Coverage — {breakdown.detectedCount} / {breakdown.totalPatterns} detected
        </p>

        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-0">
          {/* Detected */}
          <div>
            <p
              className="text-[11px] text-[var(--muted)] mb-2 pb-1 border-b border-[var(--border)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Detected {detected.length}
            </p>
            <ul className="space-y-1">
              {detected.map((p) => {
                const pct = Math.round((p.score / p.maxScore) * 100);
                const color = getScoreColor(pct);
                return (
                  <li key={p.id} className="flex items-center gap-2 text-xs text-[var(--text)] py-0.5">
                    <span style={{ color: '#4ade80' }}>✓</span>
                    <span className="flex-1">{p.name}</span>
                    <span
                      className="text-[10px] px-1.5 rounded"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        background: `${color}18`,
                        color,
                      }}
                    >
                      {p.severity}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Not detected */}
          <div className="mt-6 sm:mt-0">
            <p
              className="text-[11px] text-[var(--muted)] mb-2 pb-1 border-b border-[var(--border)]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Not detected {missing.length}
            </p>
            <ul className="space-y-1">
              {missing.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs text-[var(--muted)] py-0.5 opacity-40">
                  <span>·</span>
                  <span>{p.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Pages analyzed ──────────────────────────────────────────────────── */}
      {meaningfulPages.length > 1 && (
        <div>
          <p
            className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-4"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Pages Analyzed — {meaningfulPages.length + legalPages.length} crawled
          </p>

          <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
            {[...meaningfulPages]
              .sort((a, b) => b.weight - a.weight)
              .map((page) => {
                const path = (() => { try { return new URL(page.url).pathname || '/'; } catch { return page.url; } })();
                const color = getScoreColor(page.score);
                const label = PAGE_ROLE_LABEL[page.importance] ?? page.pageType;

                return (
                  <div
                    key={page.url}
                    className="grid items-center gap-4 px-4 py-3"
                    style={{ gridTemplateColumns: '6rem 1fr auto' }}
                  >
                    <span
                      className="text-[11px] text-[var(--muted)] capitalize"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-xs text-[var(--muted)] truncate"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {path}
                    </span>
                    <span
                      className="text-sm font-black num text-right w-8"
                      style={{ fontFamily: 'var(--font-display)', color }}
                    >
                      {page.score}
                    </span>
                  </div>
                );
              })}

            {legalPages.length > 0 && (
              <div className="px-4 py-2">
                <span
                  className="text-[11px] text-[var(--muted)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {legalPages.length} legal/privacy page{legalPages.length > 1 ? 's' : ''} not scored
                </span>
              </div>
            )}

            {/* Final score summary row */}
            <div
              className="grid items-center gap-4 px-4 py-3 bg-white/[0.02]"
              style={{ gridTemplateColumns: '6rem 1fr auto' }}
            >
              <span />
              <span className="text-xs font-medium text-[var(--text)]">Combined score</span>
              <span
                className="text-sm font-black num w-8 text-right"
                style={{ fontFamily: 'var(--font-display)', color: finalColor }}
              >
                {finalScore}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
