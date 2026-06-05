import type { DetectorContext, DetectorResult, CheerioAPI } from '../types';

// ─── Layout type classification ──────────────────────────────────────────────

type LayoutType =
  | 'hero-full'
  | 'grid-3'
  | 'grid-4'
  | 'grid-2'
  | 'list'
  | 'split-lr'
  | 'timeline'
  | 'centered-single'
  | 'full-width-cta'
  | 'unknown';

const GRID_3_PATTERNS = [
  /grid-cols-3/,
  /sm:grid-cols-3/,
  /md:grid-cols-3/,
  /lg:grid-cols-3/,
  /columns-3/,
];

const GRID_4_PATTERNS = [
  /grid-cols-4/,
  /sm:grid-cols-4/,
  /md:grid-cols-4/,
  /lg:grid-cols-4/,
];

const GRID_2_PATTERNS = [
  /grid-cols-2/,
  /sm:grid-cols-2/,
  /md:grid-cols-2/,
  /lg:grid-cols-2/,
];

const TIMELINE_CLASSES = ['timeline', 'step', 'process-step', 'roadmap', 'journey'];
const SPLIT_CLASSES = ['split', 'two-col', 'image-text', 'text-image', 'left-right', 'feature-split'];

function classifySection(cls: string, childrenCount: number): LayoutType {
  const c = cls.toLowerCase();

  if (/hero|banner|jumbotron|landing|intro|splash/.test(c)) return 'hero-full';

  if (TIMELINE_CLASSES.some((t) => c.includes(t))) return 'timeline';
  if (SPLIT_CLASSES.some((s) => c.includes(s))) return 'split-lr';

  if (GRID_4_PATTERNS.some((p) => p.test(c))) return 'grid-4';
  if (GRID_3_PATTERNS.some((p) => p.test(c))) return 'grid-3';
  if (GRID_2_PATTERNS.some((p) => p.test(c))) return 'grid-2';

  // Check children count as proxy for grid type
  const directChildren = childrenCount;
  if (directChildren >= 4 && /grid|flex/.test(c)) return 'grid-4';
  if (directChildren === 3 && /grid|flex/.test(c)) return 'grid-3';
  if (directChildren === 2 && /grid|flex/.test(c)) return 'split-lr';

  if (/cta|call-to-action|get-started|contact|signup/.test(c)) return 'full-width-cta';
  if (/center|centered/.test(c)) return 'centered-single';

  return 'unknown';
}

const HIGH_DIVERSITY_TYPES: LayoutType[] = ['timeline', 'split-lr'];
const LOW_DIVERSITY_TYPES: LayoutType[] = ['grid-3', 'grid-4'];

export function detectLayoutDiversity(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const layouts: LayoutType[] = [];
  const evidence: string[] = [];

  // Analyze top-level sections
  $('section, [class*="section"], main > div').each((_, el) => {
    const cls = $(el).attr('class') || '';
    const children = $(el).children();
    const type = classifySection(cls, children.length);
    if (type !== 'unknown') layouts.push(type);
  });

  if (layouts.length === 0) {
    return {
      id: 'layout-diversity',
      name: 'Layout Diversity',
      description: 'Measure of variation across section layout types',
      category: 'structural',
      detected: false,
      severity: 'none',
      score: 0,
      maxScore: 8,
      evidence: [],
      recommendation: 'Introduce varied section layouts: split layouts, timelines, and editorial sections.',
      meta: { layoutDiversity: 'medium' },
    };
  }

  const uniqueLayouts = new Set(layouts);
  const gridLayouts = layouts.filter((l) => LOW_DIVERSITY_TYPES.includes(l));
  const diverseLayouts = layouts.filter((l) => HIGH_DIVERSITY_TYPES.includes(l));

  // Consecutive grid detection (2+ grids in a row)
  let consecutiveGrids = 0;
  let maxConsecutive = 0;
  for (const l of layouts) {
    if (LOW_DIVERSITY_TYPES.includes(l)) {
      consecutiveGrids++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveGrids);
    } else {
      consecutiveGrids = 0;
    }
  }

  // Determine diversity level
  const diversityRatio = uniqueLayouts.size / layouts.length;
  const gridRatio = gridLayouts.length / layouts.length;

  let diversity: 'low' | 'medium' | 'high';
  // Raised thresholds: grid layouts are a normal professional design choice.
  // Only flag when the site is *aggressively* grid-only with no layout variation.
  if (gridRatio >= 0.85 || maxConsecutive >= 5 || (uniqueLayouts.size <= 1 && layouts.length >= 5)) {
    diversity = 'low';
  } else if (diverseLayouts.length >= 1 || diversityRatio >= 0.4) {
    diversity = 'high';
  } else {
    diversity = 'medium';
  }

  // Medium diversity is not a signal — only genuinely grid-locked sites are detected
  const detected = diversity === 'low';

  if (layouts.length > 0) {
    const layoutCounts: Record<string, number> = {};
    for (const l of layouts) layoutCounts[l] = (layoutCounts[l] || 0) + 1;
    const dominant = Object.entries(layoutCounts).sort(([, a], [, b]) => b - a)[0];
    if (dominant) evidence.push(`Dominant layout: "${dominant[0]}" appears ${dominant[1]} times`);
  }

  if (maxConsecutive >= 3) {
    evidence.push(`${maxConsecutive} consecutive grid/card sections with no layout variation`);
  }
  if (diverseLayouts.length === 0 && layouts.length >= 3) {
    evidence.push('No timeline, split, or editorial layouts detected — all sections follow grid pattern');
  }
  if (diverseLayouts.length > 0) {
    evidence.push(`Varied layouts found: ${[...new Set(diverseLayouts)].join(', ')}`);
  }

  const scoreMap = { low: 8, medium: 3, high: 0 };
  const score = scoreMap[diversity];

  return {
    id: 'layout-diversity',
    name: 'Layout Diversity',
    description: 'Low layout variation across sections — repeated grid patterns throughout',
    category: 'structural',
    detected,
    severity: diversity === 'low' ? 'high' : diversity === 'medium' ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 8,
    evidence: detected ? evidence : [],
    recommendation:
      'Break repeated grid sections with split layouts, timelines, editorial prose sections, or asymmetric content blocks. Not every section needs a three-column grid.',
    meta: { layoutDiversity: diversity },
  };
}

// ─── Component Reuse Detector (7pts) ─────────────────────────────────────────

interface ComponentPattern {
  label: string;
  count: number;
}

function findRepeatedPatterns($: CheerioAPI): ComponentPattern[] {
  const patterns: ComponentPattern[] = [];

  // Pattern 1: icon/svg + heading + paragraph
  let iconTitleDesc = 0;
  $('div, article, li').each((_, el) => {
    const $el = $(el);
    const hasIcon = $el.find('svg, img, i[class], [class*="icon"]').length > 0;
    const hasHeading = $el.find('h2,h3,h4,h5,strong').length > 0;
    const hasP = $el.find('p').length > 0;
    const childCount = $el.children().length;
    if (hasIcon && hasHeading && hasP && childCount <= 5) iconTitleDesc++;
  });
  if (iconTitleDesc >= 3) {
    patterns.push({ label: 'Icon → Title → Description', count: iconTitleDesc });
  }

  // Pattern 2: image + heading + text (card-like) — raised to 6+ to avoid
  // triggering on blog grids, testimonial rows, and other normal content patterns
  let imgTitleText = 0;
  $('div, article').each((_, el) => {
    const $el = $(el);
    const hasImg = $el.find('img:not([class*="avatar"]):not([class*="logo"])').length > 0;
    const hasHeading = $el.find('h2,h3,h4').length > 0;
    const hasText = $el.find('p').length > 0;
    const childCount = $el.children().length;
    if (hasImg && hasHeading && hasText && childCount <= 6) imgTitleText++;
  });
  if (imgTitleText >= 6) {
    patterns.push({ label: 'Image → Heading → Text', count: imgTitleText });
  }

  // Pattern 3: number/stat + label (stat blocks)
  let statBlocks = 0;
  $('div, li').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const hasNumeric = /\d+[k+%]?|\d+,\d+/.test(text);
    const hasLabel = $el.find('p, span').length >= 1;
    const childCount = $el.children().length;
    if (hasNumeric && hasLabel && childCount <= 3 && $el.children().length >= 1) statBlocks++;
  });
  if (statBlocks >= 3) {
    patterns.push({ label: 'Number → Label (Stat)', count: statBlocks });
  }

  // Pattern 4: heading + text + button (CTA card) — raised threshold significantly.
  // Nearly every section on a professional website has heading+text+link.
  // Only flag when it's *extremely* repeated, suggesting templated section generation.
  let ctaCards = 0;
  $('[class*="card"], article, div').each((_, el) => {
    const $el = $(el);
    const hasHeading = $el.find('h2,h3,h4').length > 0;
    const hasText = $el.find('p').length > 0;
    const hasBtn = $el.find('a, button').length > 0;
    const childCount = $el.children().length;
    if (hasHeading && hasText && hasBtn && childCount >= 2 && childCount <= 5) ctaCards++;
  });
  if (ctaCards >= 9) {
    patterns.push({ label: 'Heading → Text → CTA Button', count: ctaCards });
  }

  return patterns.sort((a, b) => b.count - a.count);
}

export function detectComponentReuse(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const patterns = findRepeatedPatterns($);
  const evidence: string[] = [];

  for (const p of patterns.slice(0, 4)) {
    evidence.push(`"${p.label}" pattern used ${p.count}× across the page`);
  }

  const totalRepeated = patterns.reduce((s, p) => s + p.count, 0);
  const detected = patterns.length >= 3 || (patterns.length >= 2 && patterns.reduce((s, p) => s + p.count, 0) >= 15);
  const score = Math.min(7, patterns.length * 2 + (totalRepeated > 10 ? 2 : 0));

  return {
    id: 'component-reuse',
    name: 'Component Reuse',
    description: 'Identical structural component patterns reused throughout the page',
    category: 'structural',
    detected,
    severity: patterns.length >= 3 ? 'high' : patterns.length >= 2 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 7,
    evidence: detected ? evidence : [],
    recommendation:
      'Vary how you present information. Use narrative prose for some sections, comparison tables for others, and let content drive the structure rather than fitting everything into the same component shell.',
    meta: { repeatedComponents: patterns.slice(0, 4).map((p) => `${p.label} (×${p.count})`) },
  };
}
