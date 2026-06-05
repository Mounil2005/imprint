import type { DetectorContext, DetectorResult } from '../types';

// Standard column headers that appear in AI-generated footers.
// These exact labels — especially as a group — are a strong signal.
const AI_FOOTER_COLUMN_HEADERS = [
  'product', 'company', 'resources', 'support', 'legal',
  'solutions', 'platform', 'developers', 'enterprise',
  'about', 'services', 'explore', 'features', 'pricing',
  'blog', 'docs', 'documentation', 'changelog', 'community',
];

// The strongest signal: these specific combos appear in AI footers constantly
const AI_COLUMN_COMBOS: Array<string[]> = [
  ['product', 'company', 'resources'],
  ['product', 'company', 'legal'],
  ['product', 'solutions', 'company'],
  ['features', 'company', 'resources'],
  ['platform', 'company', 'support'],
  ['product', 'developers', 'company'],
];

// Social platform link targets
const SOCIAL_PLATFORMS = [
  'twitter.com', 'x.com',
  'linkedin.com',
  'github.com',
  'instagram.com',
  'facebook.com',
  'youtube.com',
  'tiktok.com',
  'discord.com', 'discord.gg',
];

// Boilerplate copyright & newsletter text
const COPYRIGHT_PATTERNS = [
  /©\s*20\d{2}\s+\w/,         // © 2024 Company
  /copyright\s+©?\s*20\d{2}/i,
  /all rights reserved/i,
];

const NEWSLETTER_PATTERNS = [
  'subscribe to our newsletter',
  'subscribe to newsletter',
  'enter your email',
  'get updates',
  'stay up to date',
  'stay updated',
  'join our newsletter',
  'sign up for updates',
];

function getFooterElement($: DetectorContext['$']): ReturnType<ReturnType<typeof import('cheerio').load>> | null {
  const footer = $('footer').first();
  if (footer.length > 0) return footer;
  // Some sites use div[role="contentinfo"] or class="footer"
  const byRole = $('[role="contentinfo"]').first();
  if (byRole.length > 0) return byRole;
  const byClass = $('[class*="footer"]').first();
  if (byClass.length > 0) return byClass;
  return null;
}

export function detectFooterTemplate(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const evidence: string[] = [];
  let score = 0;

  const footer = getFooterElement($);
  if (!footer) {
    return noResult();
  }

  const footerText = footer.text().toLowerCase();

  // ── 1. Column header matching ──────────────────────────────────────────────
  // Find heading elements inside footer
  const footerHeadings: string[] = [];
  footer.find('h2, h3, h4, h5, p strong, span').each((_, el) => {
    const t = $(el).text().trim().toLowerCase();
    if (t.length >= 3 && t.length <= 25 && AI_FOOTER_COLUMN_HEADERS.includes(t)) {
      if (!footerHeadings.includes(t)) footerHeadings.push(t);
    }
  });

  // Check for known AI column combos
  const matchedCombo = AI_COLUMN_COMBOS.find((combo) =>
    combo.every((col) => footerHeadings.includes(col)),
  );

  if (matchedCombo) {
    score += 3;
    evidence.push(`AI footer column structure: ${matchedCombo.join(' | ')} — standard AI-generated site-map footer`);
  } else if (footerHeadings.length >= 3) {
    score += 2;
    evidence.push(`${footerHeadings.length} standard column headers in footer: ${footerHeadings.slice(0, 4).join(', ')}`);
  } else if (footerHeadings.length >= 2) {
    score += 1;
    evidence.push(`Footer columns: ${footerHeadings.join(', ')}`);
  }

  // ── 2. Social platform links in footer ────────────────────────────────────
  const socialLinksInFooter: string[] = [];
  footer.find('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const platform = SOCIAL_PLATFORMS.find((p) => href.includes(p));
    if (platform && !socialLinksInFooter.includes(platform)) {
      socialLinksInFooter.push(platform.split('.')[0]);
    }
  });

  if (socialLinksInFooter.length >= 3) {
    score += 2;
    evidence.push(`${socialLinksInFooter.length} social platform links in footer: ${socialLinksInFooter.join(', ')} — generic social icon row`);
  } else if (socialLinksInFooter.length >= 2) {
    score += 1;
  }

  // ── 3. Copyright boilerplate ───────────────────────────────────────────────
  const hasCopyright = COPYRIGHT_PATTERNS.some((p) => p.test(footerText));
  const hasAllRightsReserved = /all rights reserved/i.test(footerText);
  if (hasCopyright && hasAllRightsReserved) {
    score += 1;
    evidence.push('"All rights reserved." copyright boilerplate present');
  }

  // ── 4. Newsletter signup in footer ────────────────────────────────────────
  const hasNewsletter = NEWSLETTER_PATTERNS.some((p) => footerText.includes(p));
  const hasEmailInput = footer.find('input[type="email"], input[placeholder*="email" i]').length > 0;
  if (hasNewsletter || hasEmailInput) {
    score += 1;
    evidence.push('Newsletter signup form in footer — standard template footer element');
  }

  // ── 5. Very long footer with many links (site-map style) ──────────────────
  const footerLinks = footer.find('a').length;
  if (footerLinks >= 20 && footerHeadings.length >= 3) {
    score += 1;
    evidence.push(`${footerLinks} links across ${footerHeadings.length} columns — exhaustive site-map footer`);
  }

  score = Math.min(6, score);
  const detected = score >= 2;

  return {
    id: 'footer-template',
    name: 'Template Footer Structure',
    description: 'Footer follows the standard AI-generated multi-column site-map pattern',
    category: 'structural' as const,
    detected,
    severity: score >= 4 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 6,
    evidence: detected ? evidence.slice(0, 4) : [],
    recommendation:
      'Replace the standard four-column footer with a footer that reflects your actual navigation priorities. Consider fewer, more intentional links rather than duplicating your entire sitemap at the bottom of every page.',
  };
}

function noResult(): DetectorResult {
  return {
    id: 'footer-template',
    name: 'Template Footer Structure',
    description: 'Footer follows the standard AI-generated multi-column site-map pattern',
    category: 'structural' as const,
    detected: false,
    severity: 'none',
    score: 0,
    maxScore: 6,
    evidence: [],
    recommendation: '',
  };
}
