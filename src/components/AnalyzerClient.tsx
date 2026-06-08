'use client';

import { useState } from 'react';
import { AnalysisReport } from '@/components/AnalysisReport';
import { CodeAnalysisReport } from '@/components/CodeAnalysisReport';
import { LoadingState } from '@/components/LoadingState';
import type { AnalysisResult, AnalysisError } from '@/types';
import { isAnalysisError } from '@/types';
import type { CodeAnalysisResult, CombinedAnalysisResult, CodeAnalysisError } from '@/types/github';
import { isCodeAnalysisError, isCombinedAnalysisResult } from '@/types/github';

type PageState =
  | { status: 'idle' }
  | { status: 'loading'; displayUrl: string; analysisType: 'website' | 'github' | 'combined' }
  | { status: 'success-website'; result: AnalysisResult }
  | { status: 'success-code'; result: CodeAnalysisResult }
  | { status: 'success-combined'; websiteResult: AnalysisResult; codeResult: CodeAnalysisResult; combinedScore: number; interpretation: string }
  | { status: 'error'; message: string };

export default function AnalyzerClient() {
  const [url, setUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [showGithub, setShowGithub] = useState(false);
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [pageState, setPageState] = useState<PageState>({ status: 'idle' });

  const hasWebsite = url.trim().length > 0;
  const hasGithub = githubUrl.trim().length > 0;
  const canAnalyze = hasWebsite || (showGithub && hasGithub);

  async function handleAnalyze(targetUrl: string = url, targetMode: 'single' | 'multi' = mode) {
    const trimmedUrl = targetUrl.trim();
    const trimmedGithub = showGithub ? githubUrl.trim() : '';

    if (!trimmedUrl && !trimmedGithub) return;

    const analysisType =
      trimmedUrl && trimmedGithub ? 'combined' :
      trimmedGithub ? 'github' : 'website';

    const displayUrl = trimmedUrl || trimmedGithub;
    setPageState({ status: 'loading', displayUrl, analysisType });

    try {
      if (analysisType === 'website') {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmedUrl, mode: targetMode }),
        });
        const data: AnalysisResult | AnalysisError = await res.json();
        if (isAnalysisError(data)) {
          setPageState({ status: 'error', message: data.error });
        } else {
          setPageState({ status: 'success-website', result: data });
        }
      } else {
        const body: Record<string, string> = { githubUrl: trimmedGithub };
        if (trimmedUrl) {
          body.websiteUrl = trimmedUrl;
          body.websiteMode = targetMode;
        }
        const res = await fetch('/api/analyze-repo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data: CodeAnalysisResult | CombinedAnalysisResult | CodeAnalysisError = await res.json();
        if (isCodeAnalysisError(data)) {
          setPageState({ status: 'error', message: data.error });
        } else if (isCombinedAnalysisResult(data)) {
          setPageState({
            status: 'success-combined',
            websiteResult: data.websiteResult,
            codeResult: data.codeResult,
            combinedScore: data.combinedScore,
            interpretation: data.interpretation,
          });
        } else {
          setPageState({ status: 'success-code', result: data as CodeAnalysisResult });
        }
      }
    } catch {
      setPageState({ status: 'error', message: 'Network error — check your connection.' });
    }
  }

  function handleReset() {
    setPageState({ status: 'idle' });
    setUrl('');
    setGithubUrl('');
  }

  if (pageState.status === 'loading') {
    return <LoadingState url={pageState.displayUrl} analysisType={pageState.analysisType} mode={mode} />;
  }
  if (pageState.status === 'success-website') {
    return <AnalysisReport result={pageState.result} onReset={handleReset} />;
  }
  if (pageState.status === 'success-code') {
    return <CodeAnalysisReport result={pageState.result} onReset={handleReset} />;
  }
  if (pageState.status === 'success-combined') {
    return (
      <AnalysisReport
        result={pageState.websiteResult}
        codeResult={pageState.codeResult}
        combinedScore={pageState.combinedScore}
        interpretation={pageState.interpretation}
        onReset={handleReset}
      />
    );
  }

  return (
    <>
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28">
        <h1
          className="text-[clamp(2.8rem,8vw,6rem)] font-extrabold leading-[0.95] tracking-tight text-[var(--text)] mb-7"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Does your site
          <br />
          feel{' '}
          <span style={{ color: 'var(--accent)' }}>vibe-coded?</span>
        </h1>

        <p className="text-base sm:text-lg text-[var(--muted)] max-w-lg mb-10 leading-relaxed">
          Analyze any website for AI-generated design, copy, and structural patterns.
          Add a GitHub repository for deep code pattern analysis.
          Get a score from 0 to 100.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); handleAnalyze(); }} className="flex flex-col gap-3 max-w-xl">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yoursite.com"
              aria-label="Website URL to analyze"
              className="flex-1 bg-[var(--surface)] border border-[var(--border-mid)] px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            {!showGithub && (
              <button
                type="submit"
                disabled={!canAnalyze}
                className="px-6 py-3 text-sm font-semibold transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Analyze →
              </button>
            )}
          </div>

          {showGithub && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="github.com/owner/repo"
                aria-label="GitHub repository URL"
                className="flex-1 bg-[var(--surface)] border border-[var(--border-mid)] px-4 py-3 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none transition-colors"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <button
                type="submit"
                disabled={!canAnalyze}
                className="px-6 py-3 text-sm font-semibold transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--accent)', color: 'var(--accent-fg)' }}
              >
                Analyze →
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => { setShowGithub(!showGithub); if (showGithub) setGithubUrl(''); }}
              className="px-3 py-1.5 text-xs transition-colors rounded-sm border"
              style={{
                fontFamily: 'var(--font-mono)',
                background: showGithub ? 'var(--border-mid)' : 'transparent',
                color: showGithub ? 'var(--text)' : 'var(--muted)',
                borderColor: showGithub ? 'var(--border-mid)' : 'transparent',
              }}
            >
              {showGithub ? '✓ GitHub repo' : '+ GitHub repo'}
            </button>
            <span className="text-[var(--border-mid)] text-xs">|</span>
            {(['single', 'multi'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="px-3 py-1.5 text-xs transition-colors rounded-sm"
                style={{
                  fontFamily: 'var(--font-mono)',
                  background: mode === m ? 'var(--border-mid)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--muted)',
                  border: `1px solid ${mode === m ? 'var(--border-mid)' : 'transparent'}`,
                }}
              >
                {m === 'single' ? 'Single page' : 'Full site (5 pages)'}
              </button>
            ))}
          </div>

          {showGithub && hasWebsite && hasGithub && (
            <p className="text-[11px] text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
              Combined mode: website pattern score + code pattern score → combined AI pattern score
            </p>
          )}
          {showGithub && !hasWebsite && (
            <p className="text-[11px] text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
              Repository-only mode: analyzes source files for AI code generation patterns
            </p>
          )}
          {mode === 'multi' && !showGithub && (
            <p className="text-[11px] text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>
              ~60–90s · crawls homepage + top pages · averaged score
            </p>
          )}
        </form>

        {pageState.status === 'error' && (
          <p className="mt-4 text-sm text-red-400">✕ {pageState.message}</p>
        )}
      </section>

      <section className="pb-24">
        <div className="border-t border-[var(--border)] pt-5 mb-10">
          <h2 className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]" style={{ fontFamily: 'var(--font-display)' }}>
            The Scale
          </h2>
        </div>
        <div className="mb-10">
          <div className="relative h-1 w-full overflow-hidden">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #22c55e 0%, #eab308 35%, #f97316 65%, #ef4444 100%)' }} />
          </div>
          <div className="grid grid-cols-4 mt-3">
            {[
              { range: '0–25', label: 'Unique Design', sub: 'Low pattern usage' },
              { range: '26–50', label: 'Some Patterns', sub: 'Mixed signals' },
              { range: '51–75', label: 'Pattern-Heavy', sub: 'High AI pattern use' },
              { range: '76–100', label: 'Vibe-Coded', sub: 'Extremely formulaic' },
            ].map((s) => (
              <div key={s.range} className="pr-4">
                <p className="text-[11px] text-[var(--muted)] mb-0.5 num" style={{ fontFamily: 'var(--font-mono)' }}>{s.range}</p>
                <p className="text-xs font-semibold text-[var(--text)]">{s.label}</p>
                <p className="text-[11px] text-[var(--muted)] leading-snug mt-0.5 hidden sm:block">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm text-[var(--muted)] max-w-xl leading-relaxed">
          A high score means the site follows patterns that frequently appear in AI-generated
          or template-built websites. It does{' '}
          <strong className="text-[var(--text)] font-medium">not</strong>{' '}
          prove a site was made by AI — experienced developers sometimes use these patterns intentionally.
          A low score suggests a more custom, deliberate approach.
        </p>
      </section>
    </>
  );
}
