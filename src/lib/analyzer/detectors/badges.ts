import type { DetectorContext, DetectorResult } from '../types';

const BADGE_CLASS_PATTERNS = [
  'badge', 'tag', 'chip', 'label', 'pill', 'status',
  'indicator', 'token', 'lozenge',
];

const BADGE_INLINE_STYLES = [
  'border-radius: 9999px',
  'border-radius:9999px',
  'border-radius: 999px',
];

export function detectBadges(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const evidence: string[] = [];
  let badgeCount = 0;

  // Named badge classes
  for (const pattern of BADGE_CLASS_PATTERNS) {
    const found = $(`[class*="${pattern}"]`).length;
    if (found > 0) {
      badgeCount += found;
      if (found >= 2) {
        evidence.push(`${found} elements with "${pattern}" class`);
      }
    }
  }

  // Tailwind pill pattern: rounded-full + small text + padding
  let tailwindBadges = 0;
  $('span, div, p').each((_, el) => {
    const cls = $(el).attr('class') || '';
    const isRoundedFull = /rounded-full/.test(cls);
    const hasSmallPadding = /px-[123]|py-[01]|p-[01]/.test(cls);
    const hasTextSize = /text-xs|text-sm/.test(cls);
    if (isRoundedFull && (hasSmallPadding || hasTextSize)) {
      tailwindBadges++;
    }
  });
  if (tailwindBadges >= 3) {
    evidence.push(`${tailwindBadges} Tailwind pill-styled badge elements`);
    badgeCount = Math.max(badgeCount, tailwindBadges);
  }

  // Inline style badges
  let inlineBadges = 0;
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    if (BADGE_INLINE_STYLES.some((s) => style.includes(s))) {
      inlineBadges++;
    }
  });
  if (inlineBadges > 0) {
    evidence.push(`${inlineBadges} inline-styled pill/badge elements`);
    badgeCount += inlineBadges;
  }

  // Check for badge sections (many badges in a single area)
  $('section, div.features, [class*="features"], [class*="benefits"]').each((_, el) => {
    let sectionBadges = 0;
    for (const pattern of BADGE_CLASS_PATTERNS) {
      sectionBadges += $(el).find(`[class*="${pattern}"]`).length;
    }
    if (sectionBadges >= 5) {
      evidence.push(`Badge-heavy section: ${sectionBadges} badges concentrated in one area`);
    }
  });

  const detected = badgeCount >= 6;
  const score = Math.min(5, Math.round((badgeCount / 15) * 5));

  return {
    id: 'badge-heavy',
    name: 'Badge-Heavy Design',
    description: 'Overuse of badges, tags, and pill-shaped labels across the page',
    category: 'visual' as const,
    detected,
    severity: badgeCount >= 20 ? 'high' : badgeCount >= 10 ? 'medium' : badgeCount >= 6 ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 5,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'Reduce badge usage. Reserve badges for genuinely important status indicators. Replace decorative badges with clear typography.',
  };
}
