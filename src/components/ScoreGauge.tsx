'use client';

import { useEffect, useRef, useState } from 'react';
import { getScoreColor, getScoreLabel } from '@/lib/utils';
import type { ConfidenceLevel } from '@/types';

interface ScoreDisplayProps {
  score: number;
  confidenceLevel: ConfidenceLevel;
  detectedCount: number;
  totalPatterns: number;
  analysisTime: number;
}

/*
  REDESIGN RATIONALE:
  Original: SVG circular arc gauge with glowing score in the center.
  Replaced with a typographic display — a large animated number.
  This reads as a deliberate design choice (editorial/data-journalism style)
  rather than a template UI element. The horizontal progress bar provides
  the visual "fill" effect without the AI-landing-page circular gauge.
*/
export function ScoreDisplay({
  score,
  confidenceLevel,
  detectedCount,
  totalPatterns,
  analysisTime,
}: ScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplayScore(Math.round(score * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [score]);

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div>
      {/* Large typographic score */}
      <div className="flex items-end gap-3 mb-2">
        <span
          className="text-[6rem] sm:text-[8rem] font-black leading-none num"
          style={{ fontFamily: 'var(--font-display)', color }}
        >
          {displayScore}
        </span>
        <span
          className="text-2xl text-[var(--muted)] mb-3 num"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          /100
        </span>
      </div>

      {/* Label */}
      <p
        className="text-sm font-semibold mb-4"
        style={{ fontFamily: 'var(--font-display)', color }}
      >
        {label}
      </p>

      {/* Score bar — thin, not decorative */}
      <div className="h-0.5 bg-[var(--border-mid)] w-full mb-4 overflow-hidden">
        <div
          className="h-full transition-all duration-[1.2s] ease-out"
          style={{ width: `${displayScore}%`, background: color }}
        />
      </div>

      {/* Inline stats — not cards */}
      <div
        className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[var(--muted)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span>
          {detectedCount}/{totalPatterns} patterns detected
        </span>
        <span>confidence: {confidenceLevel.toLowerCase()}</span>
        <span>{(analysisTime / 1000).toFixed(1)}s analysis</span>
      </div>
    </div>
  );
}
