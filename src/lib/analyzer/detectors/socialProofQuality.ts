import type { DetectorContext, DetectorResult } from '../types';

// Formulaic phrases that appear almost exclusively in AI-written testimonials.
// Real customer quotes are specific and personal; AI defaults to these templates.
const FORMULAIC_PHRASES = [
  // "Transform" openers
  'has transformed our', 'has transformed my', 'transformed the way we',
  'has revolutionized our', 'revolutionized the way',
  'has changed the way', 'changed the way we',
  // Generic superlatives
  "couldn't imagine going back",
  "can't imagine going back",
  "can't go back",
  'game changer for our', 'game-changer for our',
  'game changer for my',
  'changed our workflow', 'streamlined our workflow',
  // AI ROI templates
  'saved us hours', 'saves us hours',
  'saves hours every week', 'saved hours per week',
  'increased our productivity', 'boosted our productivity',
  // Generic "highly recommend" closers
  'highly recommend', 'i highly recommend',
  'would highly recommend',
  // Exceeded-expectations boilerplate
  'exceeded our expectations', 'exceeded my expectations',
  'beyond our expectations',
  // "Exactly what we needed"
  'exactly what we needed', 'exactly what i needed',
  'exactly what our team needed',
  // Easy/intuitive claims
  'so easy to use', 'incredibly easy to use',
  'intuitive and easy',
  'easy to use and', 'simple and intuitive',
  // Team approval
  'our entire team loves', 'the whole team loves',
  'our team has been', 'my team loves',
];

// Generic role + company attribution format produced by AI:
// "CEO, Acme Corp" / "Head of Marketing, TechCorp" / "John D., Company Name"
const GENERIC_ROLE_PATTERN = /\b(ceo|cto|coo|founder|co-founder|co founder|vp|director|head of|manager|lead|owner)\b.{0,30}(inc|llc|ltd|co\.|corp|company|group|studio|agency|solutions|technologies|tech|digital)\b/i;

// "Title, Company" comma-separated attribution
const TITLE_COMPANY_PATTERN = /^[A-Z][^,\n]{2,30},\s*[A-Z][^,\n]{2,40}$/m;

function extractTestimonialTexts($: DetectorContext['$']): string[] {
  const texts: string[] = [];

  // Blockquotes
  $('blockquote').each((_, el) => {
    const t = $( el).text().trim();
    if (t.length > 20) texts.push(t);
  });

  // Elements with testimonial/quote class
  $('[class*="testimonial"], [class*="review"], [class*="quote"]').each((_, el) => {
    const $el = $(el);
    const p = $el.find('p, [class*="text"], [class*="body"]').first().text().trim();
    if (p.length > 20) texts.push(p);
  });

  return [...new Set(texts)].slice(0, 20);
}

function countStarRatings($: DetectorContext['$'], html: string): { total: number; allFive: boolean } {
  // Count star rating elements
  const starElements = $('[class*="star"], [class*="rating"]').length;
  const starEmojis = (html.match(/★|⭐|🌟/g) || []).length;
  const total = starElements + starEmojis;

  // Check if ratings vary — look for 4-star, 3.5-star, etc.
  const hasVariedRatings =
    html.includes('4.5') || html.includes('4 star') || html.includes('3.5') ||
    html.includes('aria-label="4') || html.includes('aria-label="3') ||
    /\b4\s*(?:out of|\/)\s*5\b/i.test(html) ||
    /\b4\.?\d?\s*stars?\b/i.test(html);

  return { total, allFive: total >= 3 && !hasVariedRatings };
}

function measureFormulaic(texts: string[]): { count: number; examples: string[] } {
  const examples: string[] = [];
  let count = 0;

  for (const text of texts) {
    const lower = text.toLowerCase();
    const matched = FORMULAIC_PHRASES.find((p) => lower.includes(p));
    if (matched) {
      count++;
      if (examples.length < 3) {
        examples.push(`"${matched}" found in testimonial`);
      }
    }
  }

  return { count, examples };
}

function measureGenericAttribution($: DetectorContext['$']): number {
  let genericCount = 0;

  $('[class*="testimonial"], [class*="review"], [class*="author"], [class*="name"]').each((_, el) => {
    const $el = $(el);
    const nameEl = $el.find('[class*="name"], [class*="author"], strong, h4, h5').first();
    const roleEl = $el.find('[class*="role"], [class*="title"], [class*="position"], em, span').first();

    const nameText = nameEl.text().trim();
    const roleText = roleEl.text().trim();
    const combined = `${roleText} ${nameText}`;

    if (GENERIC_ROLE_PATTERN.test(combined) || TITLE_COMPANY_PATTERN.test(combined)) {
      genericCount++;
    }
  });

  return genericCount;
}

function measureLengthUniformity(texts: string[]): boolean {
  if (texts.length < 3) return false;
  const lengths = texts.map((t) => t.split(/\s+/).length);
  const avg = lengths.reduce((s, l) => s + l, 0) / lengths.length;
  const maxDeviation = Math.max(...lengths.map((l) => Math.abs(l - avg)));
  // If all testimonials are within 35% of average length, it's suspiciously uniform
  return maxDeviation / avg < 0.35;
}

export function detectSocialProofQuality(ctx: DetectorContext): DetectorResult {
  const { $, html } = ctx;
  const evidence: string[] = [];
  let score = 0;

  const testimonialTexts = extractTestimonialTexts($);
  const starRatings = countStarRatings($, html);
  const formulaic = measureFormulaic(testimonialTexts);
  const genericAttribution = measureGenericAttribution($);
  const uniformLength = testimonialTexts.length >= 3 && measureLengthUniformity(testimonialTexts);

  // ── 1. All-5-star ratings (suspicious uniformity) ─────────────────────────
  if (starRatings.allFive && starRatings.total >= 10) {
    score += 3;
    evidence.push(`${starRatings.total} star-rating indicators with no score variation — all testimonials appear to be 5-star`);
  } else if (starRatings.allFive && starRatings.total >= 3) {
    score += 2;
    evidence.push('No rating variation detected across testimonial section — all appear to be 5-star');
  }

  // ── 2. Formulaic testimonial text ─────────────────────────────────────────
  if (formulaic.count >= 2) {
    score += 3;
    evidence.push(`${formulaic.count} testimonials use AI-template phrases`);
    evidence.push(...formulaic.examples);
  } else if (formulaic.count === 1) {
    score += 1;
    evidence.push(...formulaic.examples);
  }

  // ── 3. Generic "Role, Company" attribution ────────────────────────────────
  if (genericAttribution >= 3) {
    score += 2;
    evidence.push(`${genericAttribution} testimonials use generic "Title, Company Name" attribution format`);
  } else if (genericAttribution >= 1) {
    score += 1;
    evidence.push(`Generic attribution format detected (e.g. "CEO, CompanyName")`);
  }

  // ── 4. Suspiciously uniform testimonial length ────────────────────────────
  if (uniformLength) {
    score += 1;
    evidence.push(`${testimonialTexts.length} testimonials are suspiciously uniform in length (< 35% deviation from average)`);
  }

  score = Math.min(8, score);
  const detected = score >= 2;

  return {
    id: 'social-proof-quality',
    name: 'Formulaic Social Proof',
    description: 'Testimonials match patterns common in AI-generated social proof: all-identical ratings, formulaic phrasing, generic attribution',
    category: 'content' as const,
    detected,
    severity: score >= 6 ? 'high' : score >= 3 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 8,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'These testimonials match patterns commonly found in AI-generated social proof: formulaic phrasing, all-identical ratings, and generic attribution. Whether or not they are real, adding specificity — full names, linked profiles, concrete outcomes, and varied voices — makes them more credible and harder to dismiss.',
  };
}
