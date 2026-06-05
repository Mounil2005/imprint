import type { DetectorContext, DetectorResult } from '../types';

const PRICING_CLASS_PATTERNS = [
  'pricing', 'plan', 'tier', 'price-card', 'price-plan',
  'subscription', 'package', 'billing',
];

const PRICING_KEYWORDS = [
  'per month', 'per year', '/month', '/year', '/mo', '/yr',
  'billed annually', 'billed monthly', 'free forever',
  'starter plan', 'pro plan', 'enterprise plan', 'basic plan',
  'most popular', 'best value', 'recommended plan',
];

const CURRENCY_PATTERN = /\$\d+|\€\d+|\£\d+|\d+\s*USD|\d+\s*EUR/;

// Prices that end in 9 — the AI default pricing formula
const PRICES_ENDING_9 = /[$€£]\s*(9|19|29|39|49|59|69|79|89|99|119|129|149|199|249|299|499)\b/g;

// Boilerplate text found beneath AI-generated pricing sections
const PRICING_BOILERPLATE = [
  'cancel anytime', 'no credit card required',
  'no credit card needed', 'free to cancel',
  'cancel at any time', 'money-back guarantee',
  '30-day money back', '14-day free trial',
  'no contracts', 'no long-term contracts',
  'per seat per month', 'per user per month',
  'per user/month', 'per seat/month',
];

// Tier name patterns almost exclusively used in AI-generated pricing
const AI_TIER_NAMES = [
  'starter', 'basic', 'pro', 'professional', 'business',
  'enterprise', 'premium', 'plus', 'growth', 'scale',
  'free', 'team', 'agency',
];

export function detectPricing(ctx: DetectorContext): DetectorResult {
  const { $, html } = ctx;
  const evidence: string[] = [];
  let depthScore = 0;

  // Named pricing classes
  let namedCount = 0;
  for (const pattern of PRICING_CLASS_PATTERNS) {
    const found = $(`[class*="${pattern}"]`).length;
    if (found > 0) {
      namedCount += found;
      if (found >= 2) evidence.push(`${found} elements with "${pattern}" class`);
    }
  }

  // Pricing keywords in text
  const lowerHtml = html.toLowerCase();
  const foundKeywords: string[] = [];
  for (const keyword of PRICING_KEYWORDS) {
    if (lowerHtml.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }
  if (foundKeywords.length > 0) {
    evidence.push(`Pricing keywords: ${foundKeywords.slice(0, 4).map((k) => `"${k}"`).join(', ')}`);
  }

  // Currency symbols
  const currencyMatches = html.match(CURRENCY_PATTERN);
  const currencyCount = currencyMatches ? currencyMatches.length : 0;
  if (currencyCount >= 2) {
    evidence.push(`${currencyCount} price values detected (${currencyMatches!.slice(0, 3).join(', ')})`);
  }

  // Three-column pricing grid — require ALL three columns to contain pricing content
  let threeColumnPricing = false;
  $('[class*="grid"]').each((_, el) => {
    const children = $(el).children();
    if (children.length === 3) {
      let pricingChildCount = 0;
      children.each((__, child) => {
        const childHtml = ($(child).html() || '').toLowerCase();
        if (
          CURRENCY_PATTERN.test(childHtml) &&
          foundKeywords.some((k) => childHtml.includes(k.toLowerCase()))
        ) {
          pricingChildCount++;
        }
      });
      if (pricingChildCount === 3) {
        threeColumnPricing = true;
        evidence.push('Three-column pricing grid detected (Starter / Pro / Enterprise pattern)');
      }
    }
  });

  // ── Depth signals ──────────────────────────────────────────────────────────

  // "Most Popular" highlight badge — the single-tier visual differentiator in AI templates
  const hasMostPopular = lowerHtml.includes('most popular') || lowerHtml.includes('most loved') ||
    (lowerHtml.includes('recommended') && namedCount >= 2);
  if (hasMostPopular) {
    depthScore += 1;
    evidence.push('"Most Popular" or "Recommended" plan badge detected — standard AI pricing highlight');
  }

  // Prices ending in 9 (AI defaults: $9, $29, $49, $99, $199)
  const prices9 = html.match(PRICES_ENDING_9) || [];
  const unique9Prices = [...new Set(prices9)];
  if (unique9Prices.length >= 2) {
    depthScore += 1;
    evidence.push(`Prices ending in 9: ${unique9Prices.slice(0, 4).join(', ')} — AI default pricing formula`);
  }

  // Boilerplate assurances below pricing tiers
  const boilerplateFound = PRICING_BOILERPLATE.filter((b) => lowerHtml.includes(b));
  if (boilerplateFound.length >= 2) {
    depthScore += 2;
    evidence.push(`Pricing boilerplate: ${boilerplateFound.slice(0, 3).map((b) => `"${b}"`).join(', ')}`);
  } else if (boilerplateFound.length === 1) {
    depthScore += 1;
    evidence.push(`Pricing boilerplate: "${boilerplateFound[0]}"`);
  }

  // AI tier name set — Starter/Pro/Enterprise or Free/Pro/Business are AI defaults
  const tierNamesFound = AI_TIER_NAMES.filter((name) => lowerHtml.includes(name));
  if (threeColumnPricing && tierNamesFound.length >= 3) {
    depthScore += 1;
    evidence.push(`AI tier naming: ${tierNamesFound.slice(0, 4).join(', ')}`);
  }

  const detected = (namedCount >= 2 && foundKeywords.length >= 1) ||
    (currencyCount >= 3 && foundKeywords.length >= 2) ||
    threeColumnPricing;

  const baseScore = threeColumnPricing ? 4 : currencyCount >= 3 ? 2 : 1;
  const score = Math.min(8, detected ? baseScore + depthScore : 0);

  return {
    id: 'pricing-cards',
    name: 'Generic Pricing Section',
    description: 'Standard three-tier pricing with popular badge, prices ending in 9, and boilerplate assurances',
    category: 'visual' as const,
    detected,
    severity: score >= 6 ? 'high' : score >= 3 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 8,
    evidence: detected ? evidence.slice(0, 6) : [],
    recommendation:
      'Differentiate your pricing with specific value framing, transparent ROI calculations, or outcome-based tiers. Avoid the Starter/Pro/Enterprise template and "cancel anytime" boilerplate that appears on thousands of AI-generated pricing pages.',
  };
}
