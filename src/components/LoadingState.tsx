'use client';

import { useEffect, useState } from 'react';

const SINGLE_STEPS = [
  { label: 'Connecting to website', duration: 2000 },
  { label: 'Launching browser', duration: 3000 },
  { label: 'Capturing screenshot', duration: 5000 },
  { label: 'Extracting HTML structure', duration: 3000 },
  { label: 'Running pattern detectors', duration: 4000 },
  { label: 'Calculating score', duration: 2000 },
];

const MULTI_STEPS = [
  { label: 'Launching browser', duration: 2000 },
  { label: 'Crawling homepage', duration: 4000 },
  { label: 'Discovering internal pages', duration: 2000 },
  { label: 'Crawling page 2 of 5', duration: 5000 },
  { label: 'Crawling page 3 of 5', duration: 5000 },
  { label: 'Crawling page 4 of 5', duration: 5000 },
  { label: 'Crawling page 5 of 5', duration: 5000 },
  { label: 'Running pattern detectors', duration: 4000 },
  { label: 'Averaging scores across pages', duration: 2000 },
];

const GITHUB_STEPS = [
  { label: 'Connecting to GitHub API', duration: 2000 },
  { label: 'Fetching repository metadata', duration: 3000 },
  { label: 'Reading file tree', duration: 4000 },
  { label: 'Fetching source files', duration: 8000 },
  { label: 'Running code pattern detectors', duration: 5000 },
  { label: 'Calculating code score', duration: 2000 },
];

const COMBINED_STEPS = [
  { label: 'Launching browser + GitHub API', duration: 2000 },
  { label: 'Crawling website', duration: 4000 },
  { label: 'Fetching repository file tree', duration: 3000 },
  { label: 'Fetching source files', duration: 6000 },
  { label: 'Running website pattern detectors', duration: 4000 },
  { label: 'Running code pattern detectors', duration: 4000 },
  { label: 'Calculating combined AI pattern score', duration: 2000 },
];

interface LoadingStateProps {
  url: string;
  mode?: 'single' | 'multi';
  analysisType?: 'website' | 'github' | 'combined';
}

export function LoadingState({ url, mode = 'single', analysisType = 'website' }: LoadingStateProps) {
  const STEPS =
    analysisType === 'combined' ? COMBINED_STEPS :
    analysisType === 'github' ? GITHUB_STEPS :
    mode === 'multi' ? MULTI_STEPS : SINGLE_STEPS;

  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const elapsedInterval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    let stepIndex = 0;
    let timeout: ReturnType<typeof setTimeout>;

    const advanceStep = () => {
      if (stepIndex < STEPS.length - 1) {
        stepIndex++;
        setCurrentStep(stepIndex);
        timeout = setTimeout(advanceStep, STEPS[stepIndex].duration);
      }
    };

    timeout = setTimeout(advanceStep, STEPS[0].duration);
    return () => { clearTimeout(timeout); clearInterval(elapsedInterval); };
  // STEPS is derived from stable props — intentionally omitted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisType, mode]);

  const displayUrl = (() => {
    try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname; }
    catch { return url; }
  })();

  const estimatedTime =
    analysisType === 'combined' ? '60–120s' :
    analysisType === 'github' ? '30–60s' :
    mode === 'multi' ? '60–90s' : '15–40s';

  const modeLabel =
    analysisType === 'combined' ? `Combined analysis · ${displayUrl}` :
    analysisType === 'github' ? `Repository analysis · ${displayUrl}` :
    mode === 'multi' ? `Full site analysis · ${displayUrl}` :
    `Analyzing ${displayUrl}`;

  return (
    <div className="min-h-[75vh] flex flex-col justify-end pb-16">
      <div className="mb-10">
        <p
          className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)] mb-4"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {modeLabel}
        </p>
        <h2
          className="text-3xl sm:text-4xl font-extrabold text-[var(--text)] leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {STEPS[currentStep].label}
          <span style={{ color: 'var(--accent)' }}>_</span>
        </h2>
      </div>

      <div className="space-y-2.5 max-w-sm mb-10">
        {STEPS.map((step, i) => (
          <div
            key={step.label}
            className="flex items-center gap-3 transition-opacity duration-500"
            style={{ opacity: i > currentStep ? 0.2 : i === currentStep ? 1 : 0.4 }}
          >
            <span
              className="flex-shrink-0 text-[11px] w-3 text-center"
              style={{
                fontFamily: 'var(--font-mono)',
                color: i < currentStep ? '#22c55e' : i === currentStep ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {i < currentStep ? '✓' : i === currentStep ? '›' : '·'}
            </span>
            <span
              className="text-xs"
              style={{
                color: i === currentStep ? 'var(--text)' : 'var(--muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <p
        className="text-[11px] text-[var(--muted)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {elapsed}s elapsed · typically {estimatedTime} total
      </p>
    </div>
  );
}
