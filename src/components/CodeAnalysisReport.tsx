'use client';

import { useEffect, useRef, useState } from 'react';
import type { CodeAnalysisResult, CodeDetectedPattern } from '@/types/github';
import { getScoreColor, getScoreLabel } from '@/lib/utils';

// ── Animated score number ─────────────────────────────────────────────────────

function AnimatedScore({ score }: { score: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const dur = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(score * eased));
      if (t < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [score]);

  const color = getScoreColor(score);

  return (
    <div>
      <div className="flex items-end gap-3 mb-2">
        <span
          className="text-[6rem] sm:text-[8rem] font-black leading-none num"
          style={{ fontFamily: 'var(--font-display)', color }}
        >
          {display}
        </span>
        <span className="text-2xl text-[var(--muted)] mb-3 num" style={{ fontFamily: 'var(--font-mono)' }}>
          /100
        </span>
      </div>
      <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color }}>
        {getScoreLabel(score)}
      </p>
      <div className="h-0.5 bg-[var(--border-mid)] w-full mb-4 overflow-hidden">
        <div
          className="h-full transition-all duration-[1.2s] ease-out"
          style={{ width: `${display}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Pattern row ───────────────────────────────────────────────────────────────

function PatternRow({ pattern }: { pattern: CodeDetectedPattern }) {
  const pct = pattern.maxScore > 0 ? Math.round((pattern.score / pattern.maxScore) * 100) : 0;
  const severityColor = pattern.score >= pattern.maxScore * 0.75 ? '#f87171'
    : pattern.score >= pattern.maxScore * 0.4 ? '#fb923c'
    : pattern.score > 0 ? '#facc15'
    : '#4ade80';

  return (
    <div
      className="py-5 border-b border-[var(--border)] grid gap-x-6 items-start transition-opacity"
      style={{ gridTemplateColumns: '1rem 1fr auto', opacity: pattern.detected ? 1 : 0.3 }}
    >
      <div className="pt-[5px] flex-shrink-0">
        <span className="block w-1.5 h-1.5 rounded-full" style={{ background: pattern.detected ? severityColor : '#4ade80' }} />
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
          <p className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: '#4ade80' }}>
            Not detected
          </p>
        )}
      </div>

      <div className="text-right flex-shrink-0">
        {pattern.detected && (
          <>
            <p className="text-[11px] mb-2" style={{ fontFamily: 'var(--font-mono)', color: severityColor }}>
              {pct >= 75 ? 'high' : pct >= 40 ? 'medium' : 'low'}
            </p>
            <div className="w-14 h-0.5 bg-[var(--border-mid)] overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, background: severityColor }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Score breakdown bar chart ─────────────────────────────────────────────────

function ScoreBreakdown({ patterns }: { patterns: CodeDetectedPattern[] }) {
  const detected = patterns.filter((p) => p.detected).sort((a, b) => b.score - a.score);
  if (detected.length === 0) return <p className="text-sm text-[var(--muted)]">No patterns detected.</p>;

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-5" style={{ fontFamily: 'var(--font-display)' }}>
        Score Breakdown
      </p>
      <div className="space-y-4">
        {detected.map((p) => {
          const pct = Math.round((p.score / p.maxScore) * 100);
          const color = getScoreColor(pct);
          return (
            <div key={p.id}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs text-[var(--text)]">{p.name}</span>
                <span className="text-[10px] px-1.5 rounded" style={{ fontFamily: 'var(--font-mono)', background: `${color}18`, color }}>
                  {pct >= 75 ? 'high' : pct >= 40 ? 'medium' : 'low'}
                </span>
              </div>
              <div className="h-0.5 bg-[var(--border-mid)] overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, background: color, transition: 'width 0.8s ease-out' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface CodeAnalysisReportProps {
  result: CodeAnalysisResult;
  onReset: () => void;
}

type Tab = 'overview' | 'evidence';

export function CodeAnalysisReport({ result, onReset }: CodeAnalysisReportProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const detectedCount = result.patterns.filter((p) => p.detected).length;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'evidence', label: `Evidence (${detectedCount})` },
  ];

  const totalTime = ((result.fetchTime + result.analysisTime) / 1000).toFixed(1);

  return (
    <div className="py-10">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-6 mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-1.5" style={{ fontFamily: 'var(--font-mono)' }}>
              Repository Analysis
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)] break-all leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {result.owner}/{result.repo}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-1 break-all" style={{ fontFamily: 'var(--font-mono)' }}>
              {result.repoUrl}
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

      {/* Score */}
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
          AI Code Pattern Score
        </p>
        <AnimatedScore score={result.score} />
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
          <span>{detectedCount}/{result.patterns.length} patterns detected</span>
          <span>{result.analyzedFileCount} files analyzed</span>
          <span>{totalTime}s analysis</span>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-[var(--muted)] mb-10 max-w-xl leading-relaxed italic">
        This score reflects patterns commonly found in AI-assisted or vibe-coded projects — not whether the code was written by AI.
        These patterns can appear in hand-crafted codebases too.
      </p>

      {/* Tabs */}
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
                <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-14">
          <ScoreBreakdown patterns={result.patterns} />

          {/* File stats */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] mb-5" style={{ fontFamily: 'var(--font-display)' }}>
              Repository Stats
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: 'Files analyzed', value: result.analyzedFileCount },
                { label: 'Total source files', value: result.fileCount },
                { label: 'Patterns detected', value: `${detectedCount} found` },
                { label: 'Fetch time', value: `${(result.fetchTime / 1000).toFixed(1)}s` },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-lg font-bold text-[var(--text)] num" style={{ fontFamily: 'var(--font-display)' }}>
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5" style={{ fontFamily: 'var(--font-mono)' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div>
          <div className="border-t border-[var(--border)] pt-4 mb-1 flex items-baseline justify-between">
            <div className="flex items-center gap-3">
              <span className="block w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#818cf8' }} />
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]" style={{ fontFamily: 'var(--font-display)' }}>
                Code Patterns
              </p>
            </div>
            <p className="text-[11px] text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {detectedCount}/{result.patterns.length} detected
            </p>
          </div>
          {[...result.patterns.filter((p) => p.detected), ...result.patterns.filter((p) => !p.detected)].map((p) => (
            <PatternRow key={p.id} pattern={p} />
          ))}
        </div>
      )}
    </div>
  );
}
