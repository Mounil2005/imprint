import type { DetectorContext, DetectorResult } from '../types';

const CTA_TEXTS = [
  'get started',
  'start free',
  'start for free',
  'try for free',
  'try free',
  'sign up free',
  'sign up',
  'get started for free',
  'book a demo',
  'request a demo',
  'schedule a demo',
  'learn more',
  'see how it works',
  'explore',
  'join now',
  'join for free',
  'get access',
  'get early access',
  'claim your spot',
  'start your journey',
  'start your free trial',
  'free trial',
  'get a demo',
  'contact us',
  'talk to us',
  'talk to sales',
];

const PRIMARY_BUTTON_CLASSES = [
  'btn-primary', 'button-primary', 'cta', 'cta-button',
  'btn-cta', 'primary-button', 'hero-cta',
];

export function detectCTA(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const evidence: string[] = [];
  const foundTexts: string[] = [];

  const buttonElements = $('a, button, [role="button"], [class*="btn"], [class*="button"]');

  buttonElements.each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const cls = $(el).attr('class') || '';

    for (const ctaText of CTA_TEXTS) {
      if (text === ctaText || text.startsWith(ctaText) || text.endsWith(ctaText)) {
        if (!foundTexts.includes(text)) {
          foundTexts.push(text);
        }
        break;
      }
    }

    for (const pattern of PRIMARY_BUTTON_CLASSES) {
      if (cls.includes(pattern) && !foundTexts.includes(text) && text.length > 0) {
        foundTexts.push(text);
        break;
      }
    }
  });

  // Count exact duplicates
  const textCounts: Record<string, number> = {};
  buttonElements.each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (CTA_TEXTS.some((c) => text.includes(c))) {
      textCounts[text] = (textCounts[text] || 0) + 1;
    }
  });

  let duplicateCTAs = 0;
  for (const [text, count] of Object.entries(textCounts)) {
    if (count >= 2) {
      duplicateCTAs++;
      evidence.push(`"${text}" appears ${count} times`);
    }
  }

  if (foundTexts.length > 0) {
    evidence.push(`Generic CTA phrases detected: ${foundTexts.slice(0, 5).map((t) => `"${t}"`).join(', ')}`);
  }

  const totalCTAs = Object.keys(textCounts).length;
  // The real signal is the SAME CTA text appearing many times, not just having 3 different CTAs.
  // Every professional site has "Get started", "Learn more", and "Contact" — that's good UX.
  const score = Math.min(5, duplicateCTAs * 2 + (totalCTAs >= 5 ? 1 : 0));
  const detected = duplicateCTAs >= 2 || totalCTAs >= 5;

  return {
    id: 'repeated-cta',
    name: 'Repeated CTA Buttons',
    description: 'Multiple identical or generic call-to-action buttons throughout the page',
    detected,
    category: 'visual' as const,
    severity: duplicateCTAs >= 3 ? 'high' : duplicateCTAs >= 2 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 5,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'Diversify your CTAs with specific, contextual language. Instead of multiple "Get Started" buttons, use action-specific text like "Start your first project" or "Import your data".',
  };
}
