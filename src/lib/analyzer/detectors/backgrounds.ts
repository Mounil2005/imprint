import type { DetectorContext, DetectorResult } from '../types';

const DOT_GRID_CLASS_PATTERNS = [
  'dot-grid', 'dot-pattern', 'dotted', 'grid-pattern',
  'bg-dot', 'bg-grid', 'pattern-dot', 'background-dots',
  'dots-bg', 'grid-bg', 'hero-pattern', 'mesh-gradient',
];

export function detectDotGridBackground(ctx: DetectorContext): DetectorResult {
  const { $, html } = ctx;
  const evidence: string[] = [];
  let detected = false;

  // Check class names
  for (const pattern of DOT_GRID_CLASS_PATTERNS) {
    const found = $(`[class*="${pattern}"]`).length;
    if (found > 0) {
      detected = true;
      evidence.push(`Elements with "${pattern}" class: ${found}`);
    }
  }

  // Check inline styles for the specific dot-grid radial-gradient pattern.
  // Must match the 1-2px colored dot signature to avoid false-positives on
  // legitimate glows, focus rings, and hover effects that also use radial-gradient.
  const DOT_GRID_PATTERN = /radial-gradient\([^)]*circle[^)]*,\s*[^,)]+\s+[12]px,\s*transparent/;
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    if (DOT_GRID_PATTERN.test(style)) {
      detected = true;
      evidence.push('Radial-gradient dot pattern (1px dots) detected in inline styles');
    }
  });

  // Check for SVG pattern definitions in HTML
  if (html.includes('<defs>') && html.includes('<pattern')) {
    detected = true;
    evidence.push('SVG <pattern> element used for background grid/dots');
  }

  // Only detect the specific AI dot-grid radial-gradient (1px dots), not generic glows
  if (DOT_GRID_PATTERN.test(html)) {
    detected = true;
    evidence.push('CSS radial-gradient dot grid pattern detected (1px dot signature)');
  }

  // Tailwind dot grid pattern (common in AI-generated sites)
  if ($('[class*="bg-dot"]').length > 0 || $('[class*="bg-grid"]').length > 0) {
    detected = true;
    evidence.push('Tailwind dot/grid background utility class detected');
  }

  return {
    id: 'dot-grid-background',
    name: 'Dot-Grid Background',
    description: 'Decorative dot-grid or mesh pattern used as a section background',
    category: 'visual' as const,
    detected,
    severity: detected ? 'low' : 'none',
    score: detected ? 3 : 0,
    maxScore: 3,
    evidence: detected ? evidence.slice(0, 4) : [],
    recommendation:
      'Replace dot-grid patterns with purposeful background choices. Consider solid colors, real photography, or custom illustrations that reflect your brand.',
  };
}
