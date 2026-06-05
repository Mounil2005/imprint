import type { DetectorContext, DetectorResult } from '../types';

// ─── Signal category definitions ────────────────────────────────────────────
//
// The key insight: individual patterns are ambiguous — a professional site
// might have any one of these. When multiple categories co-occur, they
// strongly reinforce each other. A site with AI copy + AI animations + generic
// structure is much more likely to be AI-generated than a site with any single
// signal alone.
//
// Scoring:
//   Any 1 category present              → 0 pts (insufficient alone)
//   2 categories present (weak pair)    → 2–3 pts
//   2 categories present (strong pair)  → 4–5 pts
//   3 categories present                → 6–8 pts

// ── Category A: AI copy markers ──────────────────────────────────────────────
const COPY_SIGNALS: Array<{ phrase: string; weight: number }> = [
  { phrase: 'transform your', weight: 2 },
  { phrase: 'revolutionize', weight: 2 },
  { phrase: 'cutting-edge', weight: 2 },
  { phrase: 'state-of-the-art', weight: 2 },
  { phrase: 'next-generation', weight: 2 },
  { phrase: 'next generation', weight: 2 },
  { phrase: 'game-changing', weight: 2 },
  { phrase: 'game changer', weight: 2 },
  { phrase: 'ai-powered', weight: 2 },
  { phrase: 'powered by ai', weight: 2 },
  { phrase: 'unlock the power', weight: 2 },
  { phrase: 'harness the power', weight: 2 },
  { phrase: "in today's fast-paced", weight: 3 },
  { phrase: "in today's competitive", weight: 3 },
  { phrase: 'in an increasingly', weight: 2 },
  { phrase: 'in the ever-evolving', weight: 3 },
  { phrase: 'paradigm shift', weight: 2 },
  { phrase: 'disruptive', weight: 1 },
  { phrase: 'seamlessly', weight: 1 },
  { phrase: 'effortlessly', weight: 2 },
  { phrase: 'join thousands', weight: 2 },
  { phrase: 'join millions', weight: 2 },
  { phrase: 'world-class', weight: 2 },
  { phrase: 'industry-leading', weight: 2 },
  { phrase: 'best-in-class', weight: 2 },
  { phrase: 'end-to-end solution', weight: 2 },
  { phrase: 'maximize roi', weight: 2 },
  { phrase: 'save time and money', weight: 2 },
];

// ── Category B: AI transition/animation markers ───────────────────────────────
const TRANSITION_SIGNALS: Array<{ pattern: string; weight: number }> = [
  { pattern: 'hover:scale-105', weight: 2 },
  { pattern: 'hover:scale-110', weight: 2 },
  { pattern: 'hover:-translate-y-1', weight: 2 },
  { pattern: 'hover:-translate-y-2', weight: 2 },
  { pattern: 'data-aos=', weight: 3 },
  { pattern: 'whileInView', weight: 2 },
  { pattern: 'fadeInUp', weight: 2 },
  { pattern: 'slideInUp', weight: 2 },
  { pattern: 'transition-all duration-300', weight: 1 },
  { pattern: 'transition-all duration-500', weight: 1 },
  { pattern: 'animate-fade-in', weight: 2 },
  { pattern: 'animate-slide-up', weight: 2 },
  { pattern: 'ScrollTrigger', weight: 2 },
];

// ── Category C: AI structural markers ────────────────────────────────────────
const STRUCTURAL_HEADING_SIGNALS = [
  'why choose us', 'why us', 'what sets us apart',
  'our services', 'our process', 'our approach',
  'the problem', 'the solution', "ready to get started",
  'our mission', 'our values', 'what we do',
  "let's talk", 'partner with us', 'our expertise',
  'by the numbers', 'our results', 'our impact',
];

function measureCopyStrength(lowerText: string): { score: number; found: string[] } {
  let score = 0;
  const found: string[] = [];
  for (const { phrase, weight } of COPY_SIGNALS) {
    if (lowerText.includes(phrase)) {
      score += weight;
      found.push(phrase);
    }
  }
  return { score, found };
}

function measureTransitionStrength(html: string): { score: number; found: string[] } {
  let score = 0;
  const found: string[] = [];
  for (const { pattern, weight } of TRANSITION_SIGNALS) {
    if (html.includes(pattern)) {
      score += weight;
      found.push(pattern);
    }
  }
  return { score, found };
}

function measureStructuralStrength($: DetectorContext['$']): { count: number; found: string[] } {
  const found: string[] = [];
  $('h2, h3').each((_, el) => {
    const t = ($)(el).text().trim().toLowerCase();
    for (const sig of STRUCTURAL_HEADING_SIGNALS) {
      if (t.includes(sig) && !found.includes(sig)) found.push(sig);
    }
  });
  return { count: found.length, found };
}

export function detectCompoundSignals(ctx: DetectorContext): DetectorResult {
  const { html, $, bodyText } = ctx;
  const lowerText = bodyText.toLowerCase();
  const evidence: string[] = [];

  const copy = measureCopyStrength(lowerText);
  const trans = measureTransitionStrength(html);
  const struct = measureStructuralStrength($);

  // Categorise presence as strong/weak/absent
  const copyActive = copy.score >= 3;       // 3+ weighted points
  const transActive = trans.score >= 3;     // 3+ weighted points
  const structActive = struct.count >= 2;   // 2+ matching headings

  const activeCount = [copyActive, transActive, structActive].filter(Boolean).length;

  let score = 0;

  if (activeCount >= 3) {
    // Triple compound: all three categories present
    // Each reinforces the others — much stronger signal than sum of parts
    score = 6 + Math.min(2, Math.floor((copy.score + trans.score) / 10));
    evidence.push(
      `Triple compound signal: AI copy (strength ${copy.score}), AI animations (strength ${trans.score}), generic headings (${struct.count}) — all co-present`,
    );
    if (copy.found.length > 0) evidence.push(`Copy: ${copy.found.slice(0, 3).map((s) => `"${s}"`).join(', ')}`);
    if (trans.found.length > 0) evidence.push(`Animations: ${trans.found.slice(0, 3).map((s) => `"${s}"`).join(', ')}`);
    if (struct.found.length > 0) evidence.push(`Headings: ${struct.found.slice(0, 3).map((s) => `"${s}"`).join(', ')}`);
  } else if (activeCount === 2) {
    if (copyActive && transActive) {
      // Strong pair: template copy + template animations
      score = 4 + Math.min(1, Math.floor((copy.score + trans.score) / 8));
      evidence.push(`Strong compound: AI copy patterns (${copy.found.slice(0, 2).map((s) => `"${s}"`).join(', ')}) + AI animations (${trans.found.slice(0, 2).map((s) => `"${s}"`).join(', ')})`);
    } else if (copyActive && structActive) {
      score = 3;
      evidence.push(`Compound: AI copy + generic section headings (${struct.found.slice(0, 2).map((s) => `"${s}"`).join(', ')})`);
    } else if (transActive && structActive) {
      score = 3;
      evidence.push(`Compound: AI animations + generic structure (${struct.found.slice(0, 2).map((s) => `"${s}"`).join(', ')})`);
    }
  } else if (activeCount === 1) {
    // Single signal — only award minimal points if very strong
    const strongest = Math.max(copy.score, trans.score, struct.count * 2);
    if (strongest >= 6) {
      score = 1;
      evidence.push('Single-category signal — individually insufficient, but noted');
    }
    // No score for weak single signals — this is intentional
  }

  score = Math.min(8, score);
  const detected = score >= 2;

  return {
    id: 'compound-signals',
    name: 'Combined AI Signal Patterns',
    description: 'Co-occurrence of AI-typical copy, animation, and structural patterns — stronger together than individually',
    category: 'content' as const,
    detected,
    severity: score >= 6 ? 'high' : score >= 4 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 8,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'The combination of template-style copy, uniform transitions, and generic section headings is a strong indicator of AI-assisted generation. Any one of these individually is common — together they form a recognizable fingerprint.',
  };
}
