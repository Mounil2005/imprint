import type { DetectorContext, DetectorResult } from '../types';

// ─── Section vocabulary ─────────────────────────────────────────────────────

const SECTION_CLASS_KEYWORDS: Record<string, string[]> = {
  hero: ['hero', 'banner', 'jumbotron', 'landing', 'intro', 'splash', 'masthead', 'above-fold'],
  features: ['feature', 'capability', 'how-it-works', 'product', 'what-we-do', 'offering'],
  benefits: ['benefit', 'advantage', 'why-us', 'value-prop', 'strength', 'why-choose'],
  services: ['service', 'solution', 'what-we-offer'],
  testimonials: ['testimonial', 'review', 'client', 'customer', 'feedback', 'social-proof'],
  pricing: ['pricing', 'plan', 'subscription', 'package', 'tier'],
  faq: ['faq', 'question', 'accordion'],
  cta: ['cta', 'call-to-action', 'get-started', 'signup', 'ready', 'next-step', 'contact'],
  stats: ['stat', 'number', 'metric', 'count', 'impact', 'fact'],
  team: ['team', 'people', 'about', 'founder', 'staff'],
  industries: ['industry', 'sector', 'vertical', 'market', 'use-case'],
  cases: ['case-study', 'portfolio', 'work', 'project', 'success-story'],
  logos: ['logo', 'partner', 'trust', 'brand', 'client-logo'],
};

const HEADING_KEYWORDS: Record<string, string[]> = {
  features: ['features', 'capabilities', 'how it works', 'what we do', 'what you get', 'what is'],
  benefits: ['benefits', 'why choose', 'why us', 'advantages', 'why we', 'what sets us'],
  services: ['services', 'solutions', 'offerings', 'what we offer', 'what we provide'],
  testimonials: ['testimonials', 'what clients say', 'what customers say', 'trusted by', 'reviews', 'what people say'],
  pricing: ['pricing', 'plans', 'subscriptions', 'choose a plan'],
  faq: ['faq', 'frequently asked', 'common questions', 'got questions'],
  cta: ['get started', 'start free', 'contact us', 'book a demo', 'ready to', "let's talk", 'try for free'],
  stats: ['numbers', 'stats', 'by the numbers', 'impact', 'results', 'our impact'],
  team: ['team', 'about us', 'our story', 'meet the', 'who we are'],
  industries: ['industries', 'sectors', 'use cases', 'who we serve', 'industries we serve'],
  cases: ['case studies', 'success stories', 'our work', 'portfolio'],
  logos: ['trusted by', 'used by', 'powered by', 'as seen in', 'our clients', 'our partners'],
};

// ─── Known site archetypes with their section sequences ─────────────────────

const ARCHETYPES = [
  {
    name: 'SaaS Landing Page',
    sequences: [
      ['hero', 'features', 'pricing', 'testimonials', 'cta'],
      ['hero', 'benefits', 'features', 'pricing', 'cta'],
      ['hero', 'features', 'testimonials', 'pricing', 'faq', 'cta'],
      ['hero', 'logos', 'features', 'pricing', 'cta'],
    ],
  },
  {
    name: 'AI Agency Landing Page',
    sequences: [
      ['hero', 'services', 'benefits', 'testimonials', 'cta'],
      ['hero', 'services', 'cases', 'industries', 'cta'],
      ['hero', 'features', 'services', 'testimonials', 'cta'],
      ['hero', 'services', 'stats', 'testimonials', 'contact'],
    ],
  },
  {
    name: 'Consulting Agency',
    sequences: [
      ['hero', 'services', 'industries', 'team', 'contact'],
      ['hero', 'services', 'benefits', 'cases', 'contact'],
      ['hero', 'services', 'industries', 'benefits', 'testimonials', 'contact'],
    ],
  },
  {
    name: 'Startup / Product Marketing',
    sequences: [
      ['hero', 'features', 'benefits', 'stats', 'cta'],
      ['hero', 'features', 'stats', 'pricing', 'cta'],
      ['hero', 'logos', 'features', 'stats', 'testimonials', 'cta'],
    ],
  },
  {
    name: 'Developer Tool',
    sequences: [
      ['hero', 'features', 'pricing', 'faq', 'cta'],
      ['hero', 'features', 'benefits', 'pricing', 'cta'],
      ['hero', 'logos', 'features', 'pricing', 'faq'],
    ],
  },
  {
    name: 'Marketing / Creative Agency',
    sequences: [
      ['hero', 'cases', 'services', 'testimonials', 'contact'],
      ['hero', 'services', 'cases', 'team', 'contact'],
    ],
  },
];

// ─── Template structural patterns ────────────────────────────────────────────

const TEMPLATE_PATTERNS = [
  { name: 'Hero → Grid → Grid → CTA', pattern: ['hero', 'features', 'benefits', 'cta'] },
  { name: 'Hero → Benefits → Testimonials → CTA', pattern: ['hero', 'benefits', 'testimonials', 'cta'] },
  { name: 'Hero → Features → Pricing → FAQ', pattern: ['hero', 'features', 'pricing', 'faq'] },
  { name: 'Hero → Services → Industries → Contact', pattern: ['hero', 'services', 'industries', 'contact'] },
  { name: 'Hero → Logos → Features → CTA', pattern: ['hero', 'logos', 'features', 'cta'] },
];

// ─── Generic section heading names ───────────────────────────────────────────

// These are distinctly AI-generated section headings — they're either:
// a) Phrases only a template-following AI would use ("Why Choose Us"), or
// b) Exact keyword-phrase sections copied verbatim from SaaS templates.
// Deliberately excluded: 'features', 'testimonials', 'faq', 'trusted by', 'get started',
// 'how it works', 'about us', 'contact us', 'our work', 'case studies' — these are all
// normal, well-established section names used by high-quality professional websites.
const GENERIC_SECTION_NAMES = [
  'why choose us', 'why us', 'what sets us apart', 'our services', 'our process',
  'industries we serve', 'what we offer', 'our approach', 'the problem',
  'the solution', 'what we do', "ready to get started", "let's talk",
  'our clients', 'our mission', 'our values', 'get in touch', 'start today',
  'by the numbers', 'our results', 'why partner with us', 'what our clients say',
  'our expertise', 'our impact', 'our story', 'why choose', 'partner with us',
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function detectSectionType(cls: string, id: string, heading: string): string {
  const combined = `${cls} ${id}`.toLowerCase();
  const h = heading.toLowerCase().trim();

  for (const [type, keywords] of Object.entries(SECTION_CLASS_KEYWORDS)) {
    if (keywords.some((k) => combined.includes(k))) return type;
  }
  for (const [type, keywords] of Object.entries(HEADING_KEYWORDS)) {
    if (keywords.some((k) => h.includes(k))) return type;
  }
  return 'unknown';
}

function lcsLength(a: string[], b: string[]): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function sequenceSimilarity(actual: string[], template: string[]): number {
  const filtered = actual.filter((t) => t !== 'unknown');
  if (filtered.length === 0 || template.length === 0) return 0;
  const lcs = lcsLength(filtered, template);
  return lcs / Math.max(filtered.length, template.length);
}

function extractSections(ctx: DetectorContext): string[] {
  const { $ } = ctx;
  const seen: string[] = [];

  // Try semantic sections
  $('section, [class*="section"], [id*="section"]').each((_, el) => {
    const cls = ($(el).attr('class') || '').toLowerCase();
    const id = ($(el).attr('id') || '').toLowerCase();
    const heading = $(el).find('h1,h2,h3').first().text();
    const type = detectSectionType(cls, id, heading);
    if (type !== 'unknown' && !seen.includes(type)) seen.push(type);
  });

  // Fallback: main > div children with headings
  if (seen.length < 2) {
    $('main > div, body > div').each((_, el) => {
      const cls = ($(el).attr('class') || '').toLowerCase();
      const id = ($(el).attr('id') || '').toLowerCase();
      const heading = $(el).find('h1,h2,h3').first().text();
      if (!heading) return;
      const type = detectSectionType(cls, id, heading);
      if (type !== 'unknown' && !seen.includes(type)) seen.push(type);
    });
  }

  return seen;
}

// ─── Detector: Website Archetype (10pts) ─────────────────────────────────────

export function detectArchetype(ctx: DetectorContext): DetectorResult {
  const sequence = extractSections(ctx);
  const evidence: string[] = [];

  let bestMatch = { name: 'Unknown', score: 0 };

  for (const archetype of ARCHETYPES) {
    for (const template of archetype.sequences) {
      const sim = sequenceSimilarity(sequence, template);
      if (sim > bestMatch.score) {
        bestMatch = { name: archetype.name, score: sim };
      }
    }
  }

  const matchPct = Math.round(bestMatch.score * 100);
  // 65% threshold: being a SaaS with a hero+features+cta structure isn't itself an AI signal
  const detected = matchPct >= 65 && sequence.length >= 4;

  if (sequence.length > 0) {
    evidence.push(`Section sequence detected: ${sequence.join(' → ')}`);
  }
  if (detected) {
    evidence.push(`Website structure matches "${bestMatch.name}" pattern (${matchPct}% similarity)`);
  }

  const score = detected ? Math.min(10, Math.round((bestMatch.score) * 10)) : 0;

  return {
    id: 'website-archetype',
    name: 'Website Archetype Match',
    description: 'Page structure closely follows a recognizable AI-generated website blueprint',
    category: 'structural',
    detected,
    severity: matchPct >= 75 ? 'high' : matchPct >= 55 ? 'medium' : detected ? 'low' : 'none',
    score,
    maxScore: 10,
    evidence: detected ? evidence : [],
    recommendation:
      'Break out of the standard section sequence. Introduce unexpected structural moments: start mid-story, use editorial layouts, or let one section dominate instead of following the hero→features→cta formula.',
    meta: {
      archetype: bestMatch.name,
      archetypeMatchScore: matchPct,
      sectionSequence: sequence,
    },
  };
}

// ─── Detector: Generic Section Naming (5pts) ──────────────────────────────────

export function detectGenericSections(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const found: string[] = [];
  const evidence: string[] = [];

  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.length < 4 || text.length > 80) return;
    for (const name of GENERIC_SECTION_NAMES) {
      if (text === name || text.startsWith(name) || text.endsWith(name)) {
        const original = $(el).text().trim();
        if (!found.includes(original)) {
          found.push(original);
        }
        break;
      }
    }
  });

  const detected = found.length >= 3;
  const score = Math.min(5, Math.round((found.length / 6) * 5));

  if (found.length > 0) {
    evidence.push(`Generic section headings: ${found.slice(0, 6).map((f) => `"${f}"`).join(', ')}`);
  }

  return {
    id: 'generic-sections',
    name: 'Generic Section Naming',
    description: 'Section headings use generic AI-generated titles instead of specific framing',
    category: 'structural',
    detected,
    severity: found.length >= 5 ? 'high' : found.length >= 3 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 5,
    evidence: detected ? evidence : [],
    recommendation:
      'Replace generic headings like "Why Choose Us" and "Our Services" with specific, context-rich titles that only your company could use.',
    meta: { genericSections: found },
  };
}

// ─── Detector: Template Similarity (5pts) ─────────────────────────────────────

export function detectTemplateSimilarity(ctx: DetectorContext): DetectorResult {
  const sequence = extractSections(ctx);
  const evidence: string[] = [];

  let bestTemplate = { name: '', score: 0 };

  for (const tmpl of TEMPLATE_PATTERNS) {
    const sim = sequenceSimilarity(sequence, tmpl.pattern);
    if (sim > bestTemplate.score) bestTemplate = { name: tmpl.name, score: sim };
  }

  const matchPct = Math.round(bestTemplate.score * 100);
  // Aligned with detectArchetype threshold (65%) — a common section order isn't itself an AI signal
  const detected = matchPct >= 60 && sequence.length >= 3;

  if (detected) {
    evidence.push(`Structural pattern matches: "${bestTemplate.name}" (${matchPct}%)`);
    evidence.push(`Common in AI-generated landing page templates`);
  }

  const score = detected ? Math.min(5, Math.round(bestTemplate.score * 5)) : 0;

  return {
    id: 'template-similarity',
    name: 'Template Similarity',
    description: 'Overall page architecture closely matches common AI-generated landing page templates',
    category: 'structural',
    detected,
    severity: matchPct >= 80 ? 'high' : matchPct >= 60 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 5,
    evidence: detected ? evidence : [],
    recommendation:
      'Introduce structural surprises that break the template mold. Consider starting with an unexpected section, using asymmetric layouts, or eliminating common template sections entirely.',
    meta: { templateSimilarity: matchPct },
  };
}
