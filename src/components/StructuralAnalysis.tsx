import type { StructuralAnalysis, CategoryScores } from '@/types';

interface StructuralAnalysisProps {
  structural: StructuralAnalysis;
  categoryScores: CategoryScores;
}

function CategoryBar({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs text-[var(--text)]">{label}</span>
        <span className="text-[11px] text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
          {pct}%
        </span>
      </div>
      <div className="h-0.5 bg-[var(--border-mid)] overflow-hidden">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function archetypeMatchLabel(score: number): string {
  if (score >= 80) return 'Strong match';
  if (score >= 60) return 'Moderate match';
  if (score >= 40) return 'Partial match';
  return 'Low match';
}

function templateSimilarityLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'High similarity', color: '#f87171' };
  if (score >= 45) return { label: 'Moderate similarity', color: '#facc15' };
  return { label: 'Low similarity', color: '#4ade80' };
}

export function StructuralAnalysisPanel({ structural, categoryScores }: StructuralAnalysisProps) {
  const diversityColor: Record<string, string> = {
    low: '#f87171',
    medium: '#facc15',
    high: '#4ade80',
  };

  const tmpl = templateSimilarityLabel(structural.templateSimilarity);

  return (
    <div className="space-y-10">
      {/* ── Category breakdown ────────────────────────────────────── */}
      <div>
        <p
          className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Score by Category
        </p>
        <div className="space-y-4 max-w-sm">
          <CategoryBar label="Visual Patterns" score={categoryScores.visual.score} max={categoryScores.visual.max} color="#818cf8" />
          <CategoryBar label="Structural Patterns" score={categoryScores.structural.score} max={categoryScores.structural.max} color="#fb923c" />
          <CategoryBar label="Content Patterns" score={categoryScores.content.score} max={categoryScores.content.max} color="#f472b6" />
        </div>
      </div>

      {/* ── Structural facts ───────────────────────────────────────── */}
      <div>
        <p
          className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Structural Analysis
        </p>

        <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
          {/* Archetype */}
          <div className="grid grid-cols-[10rem_1fr] items-baseline gap-4 px-4 py-3">
            <span className="text-[11px] text-[var(--muted)]">Website Archetype</span>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-[var(--text)]">{structural.archetype}</span>
              {structural.archetypeMatchScore > 0 && (
                <span className="text-[11px] text-[var(--muted)]">
                  {archetypeMatchLabel(structural.archetypeMatchScore)}
                </span>
              )}
            </div>
          </div>

          {/* Template similarity */}
          {structural.templateSimilarity > 0 && (
            <div className="grid grid-cols-[10rem_1fr] items-baseline gap-4 px-4 py-3">
              <span className="text-[11px] text-[var(--muted)]">Template Similarity</span>
              <span className="text-sm font-medium" style={{ color: tmpl.color }}>
                {tmpl.label}
              </span>
            </div>
          )}

          {/* Layout diversity */}
          <div className="grid grid-cols-[10rem_1fr] items-baseline gap-4 px-4 py-3">
            <span className="text-[11px] text-[var(--muted)]">Layout Diversity</span>
            <span className="text-sm font-medium capitalize" style={{ color: diversityColor[structural.layoutDiversity] }}>
              {structural.layoutDiversity}
            </span>
          </div>

          {/* Section sequence */}
          {structural.sectionSequence.length > 0 && (
            <div className="grid grid-cols-[10rem_1fr] items-start gap-4 px-4 py-3">
              <span className="text-[11px] text-[var(--muted)] pt-0.5">Section Sequence</span>
              <span className="text-[11px] text-[var(--muted)] break-words" style={{ fontFamily: 'var(--font-mono)' }}>
                {structural.sectionSequence.join(' → ')}
              </span>
            </div>
          )}

          {/* Repeated components */}
          {structural.repeatedComponents.length > 0 && (
            <div className="grid grid-cols-[10rem_1fr] items-start gap-4 px-4 py-3">
              <span className="text-[11px] text-[var(--muted)] pt-0.5">Repeated Components</span>
              <ul className="space-y-0.5">
                {structural.repeatedComponents.map((c, i) => (
                  <li key={i} className="text-[11px] text-[var(--muted)] flex items-start gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span className="opacity-40">→</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generic sections */}
          {structural.genericSections.length > 0 && (
            <div className="grid grid-cols-[10rem_1fr] items-start gap-4 px-4 py-3">
              <span className="text-[11px] text-[var(--muted)] pt-0.5">Generic Sections</span>
              <ul className="space-y-0.5">
                {structural.genericSections.map((s, i) => (
                  <li key={i} className="text-[11px] text-[var(--muted)] flex items-start gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                    <span className="opacity-40">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
