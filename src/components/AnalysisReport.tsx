'use client';

import { useState } from 'react';
import type { AnalysisResult } from '@/types';
import type { CodeAnalysisResult, CodeDetectedPattern } from '@/types/github';
import { ScoreDisplay } from './ScoreGauge';
import { MetricsDashboard } from './MetricsDashboard';
import { EvidenceList } from './EvidenceList';
import { Recommendations } from './Recommendations';
import { ScreenshotPreview } from './ScreenshotPreview';
import { PatternBreakdown } from './PatternBreakdown';
import { StructuralAnalysisPanel } from './StructuralAnalysis';
import { PageScoreList } from './PageScoreList';
import { getScoreColor, getScoreLabel } from '@/lib/utils';

type Tab = 'overview' | 'structural' | 'patterns' | 'recommendations' | 'code-analysis';

interface AnalysisReportProps {
  result: AnalysisResult;
  onReset: () => void;
  // Combined mode — optional
  codeResult?: CodeAnalysisResult;
  combinedScore?: number;
  interpretation?: string;
}

// ── Code pattern row (used in code analysis tab) ──────────────────────────────

function CodePatternRow({ pattern }: { pattern: CodeDetectedPattern }) {
  const pct = pattern.maxScore > 0 ? Math.round((pattern.score / pattern.maxScore) * 100) : 0;
  const color =
    pct >= 75 ? '#f87171' :
    pct >= 40 ? '#fb923c' :
    pct > 0 ? '#facc15' :
    '#4ade80';

  return (
    <div
      className="py-5 border-b border-[var(--border)] grid gap-x-6 items-start"
      style={{ gridTemplateColumns: '1rem 1fr auto', opacity: pattern.detected ? 1 : 0.3 }}
    >
      <div className="pt-[5px]">
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: pattern.detected ? color : '#4ade80' }} />
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--text)] mb-0.5">{pattern.name}</p>
        <p className="text-xs text-[var(--muted)] mb-2">{pattern.description}</p>
        {pattern.detected && pattern.evidence.length > 0 && (
          <ul className="space-y-0.5">
            {pattern.evidence.map((e, i) => (
              <li key={i} className="text-[11px] text-[var(--muted)] flex items-start gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
                <span className="opacity-40 flex-shrink-0">→</span>
                <span>{e}</span>
              </li>
            ))}
          </ul>
        )}
        {!pattern.detected && (
          <p className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: '#4ade80' }}>Not detected</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        {pattern.detected && (
          <>
            <p className="text-[11px] mb-2" style={{ fontFamily: 'var(--font-mono)', color }}>
              {pct >= 75 ? 'high' : pct >= 40 ? 'medium' : 'low'}
            </p>
            <div className="w-14 h-0.5 bg-[var(--border-mid)] overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Code analysis tab content ─────────────────────────────────────────────────

function CodeAnalysisTab({ codeResult }: { codeResult: CodeAnalysisResult }) {
  const detected = codeResult.patterns.filter((p) => p.detected);
  const clean = codeResult.patterns.filter((p) => !p.detected);
  const detectedCount = detected.length;
  const color = getScoreColor(codeResult.score);

  return (
    <div className="space-y-10">
      {/* Score header */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          AI Code Pattern Score — {codeResult.owner}/{codeResult.repo}
        </p>
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-5xl font-black leading-none num" style={{ fontFamily: 'var(--font-display)', color }}>
            {codeResult.score}
          </span>
          <span className="text-lg text-[var(--muted)] num" style={{ fontFamily: 'var(--font-mono)' }}>/100</span>
        </div>
        <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color }}>
          {getScoreLabel(codeResult.score)}
        </p>
        <div className="h-0.5 bg-[var(--border-mid)] w-full max-w-md overflow-hidden mb-3">
          <div className="h-full" style={{ width: `${codeResult.score}%`, background: color, transition: 'width 0.8s ease-out' }} />
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
          <span>{detectedCount} patterns detected</span>
          <span>{codeResult.analyzedFileCount} files analyzed</span>
          <span>{((codeResult.fetchTime + codeResult.analysisTime) / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Score breakdown */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-5" style={{ fontFamily: 'var(--font-display)' }}>
          Pattern Breakdown
        </p>
        <div className="space-y-4">
          {detected.sort((a, b) => b.score - a.score).map((p) => {
            const pct = Math.round((p.score / p.maxScore) * 100);
            const c = getScoreColor(pct);
            return (
              <div key={p.id}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xs text-[var(--text)]">{p.name}</span>
                  <span className="text-[10px] px-1.5 rounded" style={{ fontFamily: 'var(--font-mono)', background: `${c}18`, color: c }}>
                    {pct >= 75 ? 'high' : pct >= 40 ? 'medium' : 'low'}
                  </span>
                </div>
                <div className="h-0.5 bg-[var(--border-mid)] overflow-hidden">
                  <div className="h-full" style={{ width: `${pct}%`, background: c, transition: 'width 0.8s ease-out' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full pattern list */}
      <div>
        <div className="border-t border-[var(--border)] pt-4 mb-1 flex items-baseline justify-between">
          <div className="flex items-center gap-3">
            <span className="block w-2 h-2 rounded-full" style={{ background: '#818cf8' }} />
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]" style={{ fontFamily: 'var(--font-display)' }}>
              Code Patterns
            </p>
          </div>
          <p className="text-[11px] text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {detectedCount}/{codeResult.patterns.length} detected
          </p>
        </div>
        {[...detected, ...clean].map((p) => (
          <CodePatternRow key={p.id} pattern={p} />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-[var(--muted)] max-w-xl leading-relaxed italic">
        Code Pattern Score reflects patterns commonly found in AI-assisted or vibe-coded repositories —
        not whether the code was generated by AI. These patterns can appear in hand-crafted codebases too.
      </p>
    </div>
  );
}

// ── Combined score header ─────────────────────────────────────────────────────

function CombinedScoreHeader({
  websiteScore,
  codeScore,
  combinedScore,
  interpretation,
}: {
  websiteScore: number;
  codeScore: number;
  combinedScore: number;
  interpretation: string;
}) {
  const combinedColor = getScoreColor(combinedScore);

  return (
    <div className="mb-10">
      {/* Three-score display */}
      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
        Combined AI Pattern Score
      </p>
      <div className="flex items-end gap-6 mb-4 flex-wrap">
        <div>
          <span className="text-[5rem] sm:text-[7rem] font-black leading-none num" style={{ fontFamily: 'var(--font-display)', color: combinedColor }}>
            {combinedScore}
          </span>
          <span className="text-xl text-[var(--muted)] ml-1 num" style={{ fontFamily: 'var(--font-mono)' }}>/100</span>
        </div>
        <div className="mb-3 flex gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Website</p>
            <p className="text-2xl font-bold num" style={{ fontFamily: 'var(--font-display)', color: getScoreColor(websiteScore) }}>{websiteScore}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[var(--muted)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>Code</p>
            <p className="text-2xl font-bold num" style={{ fontFamily: 'var(--font-display)', color: getScoreColor(codeScore) }}>{codeScore}</p>
          </div>
        </div>
      </div>
      <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: combinedColor }}>
        {getScoreLabel(combinedScore)}
      </p>
      <div className="h-0.5 bg-[var(--border-mid)] w-full mb-4 overflow-hidden">
        <div className="h-full transition-all duration-[1.2s] ease-out" style={{ width: `${combinedScore}%`, background: combinedColor }} />
      </div>
      <p className="text-sm text-[var(--muted)] max-w-xl leading-relaxed italic">
        {interpretation}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AnalysisReport({
  result,
  onReset,
  codeResult,
  combinedScore,
  interpretation,
}: AnalysisReportProps) {
  const isCombined = Boolean(codeResult && combinedScore !== undefined);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const domain = (() => {
    try { return new URL(result.url).hostname; } catch { return result.url; }
  })();

  const detectedCount = result.patterns.filter((p) => p.detected).length;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'structural', label: 'Structural Analysis' },
    { id: 'patterns', label: `Evidence (${detectedCount})` },
    { id: 'recommendations', label: `Recommendations (${result.recommendations.length})` },
    ...(isCombined ? [{ id: 'code-analysis' as Tab, label: 'Code Analysis' }] : []),
  ];

  return (
    <div className="py-10">
      {/* ── Site header ── */}
      <div className="border-b border-[var(--border)] pb-6 mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p
              className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-1.5"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {isCombined
                ? 'Combined Analysis'
                : result.crawlMode === 'multi'
                ? `Full site · ${result.pagesAnalyzed} pages · averaged`
                : 'Analyzed'}
            </p>
            <h1
              className="text-xl sm:text-2xl font-bold text-[var(--text)] break-all leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {domain}
              {isCombined && codeResult && (
                <span className="text-[var(--muted)] font-normal"> + {codeResult.owner}/{codeResult.repo}</span>
              )}
            </h1>
            <p
              className="text-xs text-[var(--muted)] mt-1 break-all"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {result.url}
            </p>
          </div>
          <button
            onClick={onReset}
            className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors flex-shrink-0 mt-1"
          >
            ← Analyze another
          </button>
        </div>
      </div>

      {/* ── Score display ── */}
      <div className="mb-12">
        {isCombined && codeResult && combinedScore !== undefined && interpretation ? (
          <CombinedScoreHeader
            websiteScore={result.score}
            codeScore={codeResult.score}
            combinedScore={combinedScore}
            interpretation={interpretation}
          />
        ) : (
          <ScoreDisplay
            score={result.score}
            confidenceLevel={result.confidenceLevel}
            detectedCount={detectedCount}
            totalPatterns={result.patterns.length}
            analysisTime={result.analysisTime}
          />
        )}
      </div>

      {/* ── Scoring breakdown (multi mode only) ── */}
      {result.crawlMode === 'multi' && result.scoringBreakdown && (
        <div className="mb-12">
          <PageScoreList
            breakdown={result.scoringBreakdown}
            patterns={result.patterns}
            finalScore={result.score}
          />
        </div>
      )}

      {/* ── Disclaimer ── */}
      <p className="text-[11px] text-[var(--muted)] mb-10 max-w-xl leading-relaxed italic">
        {isCombined
          ? 'Scores reflect patterns commonly found in AI-assisted development — not whether the site or code was made by AI.'
          : 'This score reflects common AI-generated design patterns — not whether the site was made by AI. High-scoring patterns can appear in hand-crafted designs too.'}
      </p>

      {/* ── Screenshot ── */}
      <div className="mb-12">
        <ScreenshotPreview screenshot={result.screenshot} url={result.url} />
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-[var(--border)] mb-10">
        <div className="flex gap-0 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-0 mr-7 pb-3 text-sm transition-colors"
              style={{
                fontFamily: 'var(--font-display)',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'overview' && (
        <div className="space-y-14">
          <MetricsDashboard metrics={result.metrics} />
          <PatternBreakdown patterns={result.patterns} />
        </div>
      )}

      {activeTab === 'structural' && (
        <StructuralAnalysisPanel
          structural={result.structural}
          categoryScores={result.categoryScores}
        />
      )}

      {activeTab === 'patterns' && <EvidenceList patterns={result.patterns} />}

      {activeTab === 'recommendations' && (
        <Recommendations recommendations={result.recommendations} score={result.score} />
      )}

      {activeTab === 'code-analysis' && codeResult && (
        <CodeAnalysisTab codeResult={codeResult} />
      )}
    </div>
  );
}
