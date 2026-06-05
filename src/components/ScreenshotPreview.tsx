'use client';

import { useState } from 'react';

interface ScreenshotPreviewProps {
  screenshot: string | null;
  url: string;
}

/*
  REDESIGN RATIONALE:
  Original: screenshot inside a rounded-xl bordered card with a browser chrome
  strip, a status dot, and a gradient fade at the bottom. Too much UI chrome
  wrapping a functional element.

  New approach: screenshot as a first-class editorial image. Thin border,
  no rounded corners, no gradient overlay unless collapsed. Browser chrome kept
  but simplified to a borderless strip. The "click to expand" is a plain text
  link rather than a hover-revealed overlay.
*/
export function ScreenshotPreview({ screenshot, url }: ScreenshotPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const domain = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  if (!screenshot || imgError) {
    return (
      <div
        className="border border-[var(--border)] flex items-center justify-center py-16 text-[var(--muted)] text-sm"
      >
        Screenshot unavailable
      </div>
    );
  }

  return (
    <div>
      {/* Header row — URL + expand toggle as plain text */}
      <div
        className="flex items-center justify-between mb-2 text-[11px] text-[var(--muted)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <span>{domain}</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="hover:text-[var(--text)] transition-colors"
        >
          {expanded ? 'Collapse ↑' : 'Expand ↓'}
        </button>
      </div>

      {/* Screenshot — no rounded corners, thin border */}
      <div
        className="border border-[var(--border)] overflow-hidden cursor-pointer relative"
        style={{ maxHeight: expanded ? '600px' : '260px', transition: 'max-height 0.35s ease' }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Minimal browser bar */}
        <div
          className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface)]"
        >
          {/* Traffic lights — minimal, no color */}
          {[0, 1, 2].map((d) => (
            <div key={d} className="w-2 h-2 rounded-full bg-[var(--border-mid)]" />
          ))}
          <span
            className="ml-2 text-[10px] text-[var(--muted)] truncate flex-1"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {url}
          </span>
        </div>

        <img
          src={screenshot}
          alt={`Screenshot of ${domain}`}
          className="w-full object-cover object-top block"
          onError={() => setImgError(true)}
        />

        {/* Collapse fade — only when not expanded */}
        {!expanded && (
          <div
            className="absolute bottom-0 inset-x-0 h-12 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--bg), transparent)' }}
          />
        )}
      </div>
    </div>
  );
}
