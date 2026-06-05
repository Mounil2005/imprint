import type { DetectorContext, DetectorResult } from '../types';

const HERO_CLASS_PATTERNS = [
  'hero', 'banner', 'jumbotron', 'masthead', 'splash',
  'hero-section', 'landing-hero', 'page-hero',
];

const HERO_HEADLINE_PATTERNS = [
  /^the (easiest|fastest|smartest|best|ultimate|only|#1)/i,
  /^(build|create|launch|grow|scale|supercharge|transform|revolutionize)/i,
  /\bin minutes\b/i,
  /\bwithout (code|coding|technical|a developer|any code)\b/i,
  /\bfor (teams|businesses|startups|everyone|all)\b/i,
  /\bthat (grows|scales|works) with you\b/i,
  /\ball.in.one\b/i,
  /\bno (credit card|signup|installation) required\b/i,
];

const HERO_SUBHEADLINE_PATTERNS = [
  /\bseamlessly\b/i,
  /\beffortlessly\b/i,
  /\binstantly\b/i,
  /\bjoin (thousands|millions|hundreds of thousands) of\b/i,
  /\btrusted by\b/i,
  /\bpowered by\b/i,
];

export function detectHero(ctx: DetectorContext): DetectorResult {
  const { $, html } = ctx;
  const evidence: string[] = [];
  let genericScore = 0;

  // Named hero classes
  let hasNamedHero = false;
  for (const pattern of HERO_CLASS_PATTERNS) {
    if ($(`[class*="${pattern}"]`).length > 0) {
      hasNamedHero = true;
      evidence.push(`Hero section with "${pattern}" class detected`);
      break;
    }
  }

  // First h1 headline analysis
  const h1 = $('h1').first();
  const h1Text = h1.text().trim();
  if (h1Text) {
    for (const pattern of HERO_HEADLINE_PATTERNS) {
      if (pattern.test(h1Text)) {
        genericScore += 2;
        evidence.push(`Generic hero headline: "${h1Text.substring(0, 60)}${h1Text.length > 60 ? '...' : ''}"`);
        break;
      }
    }
  }

  // Subheadline analysis
  const firstSection = $('section, .hero, [class*="hero"]').first();
  const subText = firstSection.find('p').first().text().trim() || $('h2, h3').first().text().trim();
  if (subText) {
    for (const pattern of HERO_SUBHEADLINE_PATTERNS) {
      if (pattern.test(subText)) {
        genericScore++;
        evidence.push(`Generic subheadline pattern: "${subText.substring(0, 60)}${subText.length > 60 ? '...' : ''}"`);
        break;
      }
    }
  }

  // Background gradient hero — minor signal, not standalone
  const hasGradient =
    html.includes('bg-gradient') ||
    html.includes('background: linear-gradient') ||
    html.includes('background:linear-gradient');
  if (hasGradient && hasNamedHero) {
    genericScore++;
    evidence.push('Gradient background in hero section');
  }

  // Require meaningful copy-level evidence — not just structural presence.
  // Dual CTAs, logo bars, and named hero classes are standard professional design
  // and should not trigger detection on their own.
  const detected = genericScore >= 3;
  const score = Math.min(6, genericScore * 1.5 + (hasNamedHero ? 1 : 0));

  return {
    id: 'generic-hero',
    name: 'Generic Hero Layout',
    description: 'Standard hero section with generic headline, subheadline, and CTA buttons',
    category: 'content' as const,
    detected,
    severity: genericScore >= 4 ? 'high' : genericScore >= 2 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? Math.round(score) : 0,
    maxScore: 6,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'This hero section matches common SaaS template patterns. A hero that leads with your actual product in context, a specific outcome for a named customer type, or a direct statement only your company could make tends to stand out from the template baseline.',
  };
}
