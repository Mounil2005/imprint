import type { DetectorContext, DetectorResult } from '../types';

// Fonts that dominate AI-generated sites — not individually damning but highly
// correlated when loaded from Google Fonts with no other font diversity.
// Professionals also use these, so scoring is moderate and requires combinations.
const AI_GOOGLE_FONT_NAMES = [
  'Inter', 'DM+Sans', 'DM Sans',
  'Plus+Jakarta+Sans', 'Plus Jakarta Sans',
  'Outfit', 'Nunito', 'Poppins',
  'Manrope', 'Figtree', 'Geist',
  'Space+Grotesk', 'Space Grotesk',
  'Sora', 'Onest', 'Bricolage+Grotesque',
];

// Combinations that almost exclusively appear in AI-scaffolded projects
const AI_FONT_COMBOS: Array<[string, string]> = [
  ['Inter', 'DM+Sans'],
  ['Inter', 'DM Sans'],
  ['Inter', 'Geist'],
  ['Plus+Jakarta+Sans', 'Inter'],
  ['Plus Jakarta Sans', 'Inter'],
  ['Outfit', 'Inter'],
  ['Manrope', 'Inter'],
  ['DM+Sans', 'Outfit'],
];

function countAIFontsInUrl(url: string): { count: number; found: string[] } {
  const found: string[] = [];
  for (const font of AI_GOOGLE_FONT_NAMES) {
    if (url.includes(font)) found.push(font);
  }
  return { count: found.length, found };
}

export function detectFontStack(ctx: DetectorContext): DetectorResult {
  const { $, html } = ctx;
  const evidence: string[] = [];
  let score = 0;

  // ── 1. Google Fonts link tags ──────────────────────────────────────────────
  const googleFontLinks: string[] = [];
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    googleFontLinks.push($(el).attr('href') || '');
  });
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('fonts.google')) googleFontLinks.push(href);
  });

  const allFontsFound: string[] = [];
  for (const link of googleFontLinks) {
    const { found } = countAIFontsInUrl(link);
    allFontsFound.push(...found);
  }

  // ── 2. @import in style blocks ────────────────────────────────────────────
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    const imports = css.match(/@import\s+url\([^)]+fonts\.googleapis[^)]+\)/g) || [];
    for (const imp of imports) {
      const { found } = countAIFontsInUrl(imp);
      allFontsFound.push(...found);
    }
  });

  // ── 3. next/font/google pattern in rendered output ────────────────────────
  // Next.js renders these as <style> blocks with the font-face inline
  const nextFontPattern = /__next_font_|fonts\.gstatic\.com/;
  if (nextFontPattern.test(html)) {
    for (const font of AI_GOOGLE_FONT_NAMES) {
      if (html.includes(`font-family: '${font}'`) || html.includes(`font-family:"${font}"`)) {
        if (!allFontsFound.includes(font)) allFontsFound.push(font);
      }
    }
  }

  const uniqueFonts = [...new Set(allFontsFound)];

  if (uniqueFonts.length === 0) {
    return noResult();
  }

  // Score based on number and specificity of AI fonts found
  if (uniqueFonts.length >= 1) {
    score += 2;
    evidence.push(`AI-associated font${uniqueFonts.length > 1 ? 's' : ''} loaded: ${uniqueFonts.join(', ')}`);
  }

  // Check for AI font combinations
  const foundCombos = AI_FONT_COMBOS.filter(
    ([a, b]) => uniqueFonts.some((f) => f === a) && uniqueFonts.some((f) => f === b),
  );
  if (foundCombos.length > 0) {
    score += 2;
    evidence.push(`AI font pairing detected: ${foundCombos[0].join(' + ')} — common in AI-scaffolded projects`);
  }

  // Loading from Google Fonts (not self-hosted) adds marginal signal
  // Professionals typically self-host or use next/font for performance
  if (googleFontLinks.length > 0 && uniqueFonts.length >= 1) {
    score += 1;
    evidence.push(`Font loaded via Google Fonts CDN — not self-hosted or optimized`);
  }

  // Multiple AI fonts loaded is a stronger signal
  if (uniqueFonts.length >= 3) {
    score += 1;
    evidence.push(`${uniqueFonts.length} AI-associated fonts loaded (indicates little typographic consideration)`);
  }

  score = Math.min(7, score);
  const detected = score >= 3;

  return {
    id: 'font-stack',
    name: 'AI-Associated Font Stack',
    description: 'Site loads fonts strongly associated with AI-generated projects (Inter, DM Sans, Plus Jakarta Sans)',
    category: 'visual' as const,
    detected,
    severity: score >= 5 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 7,
    evidence: detected ? evidence : [],
    recommendation:
      'Choose fonts that reflect your brand identity rather than defaults. Consider a custom type pairing, system fonts for performance, or a more distinctive display typeface for headings.',
  };
}

function noResult(): DetectorResult {
  return {
    id: 'font-stack',
    name: 'AI-Associated Font Stack',
    description: 'Site loads fonts strongly associated with AI-generated projects (Inter, DM Sans, Plus Jakarta Sans)',
    category: 'visual' as const,
    detected: false,
    severity: 'none',
    score: 0,
    maxScore: 7,
    evidence: [],
    recommendation: '',
  };
}
