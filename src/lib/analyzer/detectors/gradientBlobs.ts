import type { DetectorContext, DetectorResult } from '../types';

// The "AI glow blob" is a near-universal pattern in AI-generated hero sections:
// an absolutely-positioned div with rounded-full + blur-3xl + a transparent color.
// It serves as a decorative background element with no functional purpose.
//
// Examples from AI output:
//   <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
//   <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 blur-3xl" />

// Tailwind classes that together form the "blob" pattern
const BLUR_CLASSES = ['blur-3xl', 'blur-2xl', 'blur-[80px]', 'blur-[60px]', 'blur-[100px]'];
const BLOB_COLORS = [
  'bg-purple', 'bg-violet', 'bg-indigo', 'bg-blue', 'bg-fuchsia', 'bg-pink',
  'from-purple', 'from-violet', 'from-indigo', 'from-blue',
];

// Hero gradient overlays (bg-gradient-to-* with opacity colors)
const HERO_GRADIENT_PATTERNS = [
  'bg-gradient-to-br from-purple',
  'bg-gradient-to-br from-violet',
  'bg-gradient-to-br from-indigo',
  'bg-gradient-to-r from-purple',
  'bg-gradient-to-r from-violet',
  'bg-gradient-to-r from-indigo',
  'bg-gradient-to-bl from-purple',
  'bg-gradient-to-bl from-violet',
  'bg-gradient-to-tr from-purple',
  'bg-gradient-to-tr from-indigo',
];

// CSS filter: blur patterns with large values in style tags
const CSS_BLUR_LARGE = /filter\s*:\s*blur\s*\(\s*([4-9]\d|[1-9]\d{2,})px\s*\)/;

function hasBlurBlob($el: ReturnType<ReturnType<typeof import('cheerio').load>>): boolean {
  const cls = $el.attr('class') || '';
  const hasBlur = BLUR_CLASSES.some((b) => cls.includes(b));
  const hasRounded = cls.includes('rounded-full');
  const hasBlobColor = BLOB_COLORS.some((c) => cls.includes(c));
  return hasBlur && (hasRounded || hasBlobColor);
}

export function detectGradientBlobs(ctx: DetectorContext): DetectorResult {
  const { $, html } = ctx;
  const evidence: string[] = [];
  let score = 0;

  // ── 1. Tailwind blur blobs: rounded-full + blur-3xl + color ──────────────
  let blobCount = 0;
  $('div, span, section').each((_, el) => {
    const $el = $(el);
    if (hasBlurBlob($el)) {
      blobCount++;
    }
  });

  if (blobCount >= 2) {
    const pts = blobCount >= 5 ? 3 : blobCount >= 3 ? 2 : 1;
    score += pts;
    evidence.push(`${blobCount} decorative blur-blob elements (rounded-full + blur-3xl + color) — signature AI background pattern`);
  }

  // ── 2. Hero gradient overlays with purple/violet/indigo colors ────────────
  const heroGradients = HERO_GRADIENT_PATTERNS.filter((p) => html.includes(p));
  if (heroGradients.length >= 2) {
    score += 2;
    evidence.push(`Purple/violet gradient overlay in hero section: "${heroGradients[0]}" — common in AI-generated hero backgrounds`);
  } else if (heroGradients.length === 1) {
    score += 1;
    evidence.push(`Gradient overlay: "${heroGradients[0]}"`);
  }

  // ── 3. pointer-events-none decorative elements with blur ─────────────────
  // This pattern is unmistakable: absolutely-positioned blobs explicitly
  // set pointer-events-none because they're pure decoration, not UI
  let decorativeBlobs = 0;
  $('[class*="pointer-events-none"]').each((_, el) => {
    const cls = $(el).attr('class') || '';
    if (BLUR_CLASSES.some((b) => cls.includes(b)) && cls.includes('absolute')) {
      decorativeBlobs++;
    }
  });
  if (decorativeBlobs >= 1) {
    score += 2;
    evidence.push(`${decorativeBlobs} absolute + blur + pointer-events-none decorative overlay${decorativeBlobs > 1 ? 's' : ''} — non-functional glow blobs`);
  }

  // ── 4. Large CSS blur in style blocks ────────────────────────────────────
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    if (CSS_BLUR_LARGE.test(css)) {
      score += 1;
      evidence.push('Large CSS blur (40px+) used for decorative glow effect in style block');
    }
  });
  // Also check inline styles
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    if (CSS_BLUR_LARGE.test(style)) {
      score += 1;
      evidence.push('Large CSS blur used as inline decorative glow');
    }
  });

  score = Math.min(6, score);
  const detected = score >= 2;

  return {
    id: 'gradient-blobs',
    name: 'Decorative Gradient Blobs',
    description: 'Blur-blob background elements and purple/violet hero gradients — a near-universal AI design pattern',
    category: 'visual' as const,
    detected,
    severity: score >= 4 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 6,
    evidence: detected ? evidence.slice(0, 4) : [],
    recommendation:
      'Replace decorative blur blobs and gradient overlays with purposeful visual design. Abstract glows with no relation to your brand are a strong visual cliché in AI-generated sites.',
  };
}
