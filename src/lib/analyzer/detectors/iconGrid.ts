import type { DetectorContext, DetectorResult } from '../types';

export function detectIconGrid(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const evidence: string[] = [];

  // Icon-title-description groups
  const FEATURE_CLASS_PATTERNS = [
    'feature', 'benefit', 'service', 'capability', 'offering',
    'advantage', 'why-us', 'how-it-works', 'use-case',
  ];

  // Count icon+heading+paragraph groups
  let iconGroupCount = 0;

  // Pattern 1: Named feature sections
  for (const pattern of FEATURE_CLASS_PATTERNS) {
    const containers = $(`[class*="${pattern}"]`);
    if (containers.length >= 3) {
      // Check if they have icon + title + description structure
      let structuredCount = 0;
      containers.each((_, el) => {
        const $el = $(el);
        const hasIcon = $el.find('svg, img, i[class], [class*="icon"]').length > 0;
        const hasHeading = $el.find('h2, h3, h4, h5, strong').length > 0;
        const hasText = $el.find('p, span').length > 0;
        if (hasIcon && hasHeading && hasText) structuredCount++;
      });
      if (structuredCount >= 3) {
        iconGroupCount += structuredCount;
        evidence.push(`${structuredCount} icon+title+description feature items with "${pattern}" class`);
      }
    }
  }

  // Pattern 2: Grid containers with icon-heading-p children
  $('[class*="grid"], [class*="features"], [class*="benefits"]').each((_, el) => {
    const children = $(el).children();
    if (children.length < 3) return;

    let iconHeadingPCount = 0;
    children.each((__, child) => {
      const $child = $(child);
      const hasIcon = $child.find('svg, img, [class*="icon"]').length > 0;
      const hasHeading = $child.find('h2, h3, h4, strong').length > 0;
      const hasP = $child.find('p').length > 0;
      if (hasIcon && hasHeading && hasP) iconHeadingPCount++;
    });

    if (iconHeadingPCount >= 3) {
      iconGroupCount = Math.max(iconGroupCount, iconHeadingPCount);
      if (!evidence.some((e) => e.includes('icon+title'))) {
        evidence.push(`${iconHeadingPCount} icon+title+description groups in a grid layout`);
      }
    }
  });

  // Pattern 3: SVG-heavy sections — raised threshold significantly.
  // Modern sites use SVGs for logos, decorative elements, and UI chrome.
  // Only use as a fallback signal when the count is very high.
  const svgCount = $('svg').length;
  if (svgCount >= 16) {
    evidence.push(`${svgCount} SVG icons found (unusually high — common in icon-heavy feature grids)`);
    if (iconGroupCount === 0) iconGroupCount = Math.floor(svgCount / 3);
  }

  // Pattern 4: List items with icons — raised threshold
  $('ul, ol').each((_, el) => {
    const items = $(el).children('li');
    if (items.length < 5) return;

    let iconItems = 0;
    items.each((__, li) => {
      if ($(li).find('svg, img, i[class], [class*="icon"], [class*="check"]').length > 0) {
        iconItems++;
      }
    });

    if (iconItems >= 6) {
      iconGroupCount = Math.max(iconGroupCount, iconItems);
      evidence.push(`Icon-prefixed list with ${iconItems} items`);
    }
  });

  // Raised from 3 to 6 — a single feature grid (3 items) is normal professional design
  const detected = iconGroupCount >= 6;
  const score = Math.min(12, Math.round((iconGroupCount / 12) * 12));

  return {
    id: 'icon-grid',
    name: 'Icon-Title-Description Grid',
    description: 'Repeated icon → heading → description feature grid pattern',
    category: 'structural' as const,
    detected,
    severity: iconGroupCount >= 9 ? 'high' : iconGroupCount >= 6 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 12,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'Replace generic icon-feature grids with product screenshots, workflow diagrams, or interactive demos that show your product in action.',
  };
}
