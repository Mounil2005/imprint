import type { DetectorContext, DetectorResult } from '../types';

const NAMED_CARD_PATTERNS = [
  'card', 'tile', 'panel', 'widget', 'feature-item',
  'service-item', 'product-item', 'grid-item',
];

export function detectCards(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const evidence: string[] = [];

  let namedCount = 0;
  for (const pattern of NAMED_CARD_PATTERNS) {
    const found = $(`[class*="${pattern}"]`).length;
    if (found > 0) {
      namedCount += found;
      if (found >= 3) evidence.push(`${found} elements with "${pattern}" class detected`);
    }
  }

  let tailwindCount = 0;
  $('div, article, li, section').each((_, el) => {
    const cls = $(el).attr('class') || '';
    if (/rounded/.test(cls) && (/shadow/.test(cls) || /border/.test(cls)) && /\bp-\d|px-\d|py-\d/.test(cls)) {
      tailwindCount++;
    }
  });

  let gridCardCount = 0;
  let gridContainers = 0;
  $('[class*="grid"], [class*="flex"]').each((_, el) => {
    const children = $(el).children();
    if (children.length >= 3) {
      const tags = children.toArray().map((c) => (c as unknown as { tagName: string }).tagName);
      if (new Set(tags).size <= 2) {
        gridCardCount += children.length;
        gridContainers++;
      }
    }
  });
  if (gridContainers > 0) evidence.push(`${gridContainers} grid/flex containers with repeated uniform children`);

  const total = Math.max(namedCount, tailwindCount, gridCardCount);
  const score = Math.min(10, Math.round((total / 12) * 10));
  const detected = total >= 4;

  if (namedCount >= 4) evidence.push(`${namedCount} card-named elements found`);
  if (tailwindCount >= 4) evidence.push(`${tailwindCount} Tailwind-styled card elements found`);

  return {
    id: 'card-overload',
    name: 'Card Overload',
    description: 'Excessive use of card-based UI components throughout the page',
    category: 'visual',
    detected,
    severity: total >= 16 ? 'high' : total >= 8 ? 'medium' : total >= 4 ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 10,
    evidence: detected ? evidence : [],
    recommendation:
      'Reduce repetitive card layouts. Vary sections with split layouts, timelines, full-width banners, or narrative prose.',
  };
}

export function detectNestedCards(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const evidence: string[] = [];
  let nestedCount = 0;

  const cardSelector = NAMED_CARD_PATTERNS.map((p) => `[class*="${p}"]`).join(', ');
  $(cardSelector).each((_, el) => {
    const inner = $(el).find(cardSelector).length;
    if (inner > 0) {
      nestedCount++;
      const parentClass = ($(el).attr('class') || '').split(' ')[0];
      evidence.push(`Card inside card: ".${parentClass}" contains ${inner} nested card(s)`);
    }
  });
  $('[class*="rounded"][class*="shadow"], [class*="rounded"][class*="border"]').each((_, el) => {
    const inner = $(el).find('[class*="rounded"][class*="shadow"], [class*="rounded"][class*="border"]').length;
    if (inner > 0) nestedCount++;
  });

  const detected = nestedCount > 0;
  const score = Math.min(5, nestedCount * 2);

  return {
    id: 'nested-cards',
    name: 'Nested Card Layouts',
    description: 'Cards containing other cards, creating excessive visual nesting',
    category: 'visual',
    detected,
    severity: nestedCount >= 3 ? 'high' : nestedCount >= 1 ? 'medium' : 'none',
    score: detected ? score : 0,
    maxScore: 5,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'Use flat hierarchy with visual separation through whitespace and typography instead of nesting cards.',
  };
}
