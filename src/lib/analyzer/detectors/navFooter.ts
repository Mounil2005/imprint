import type { DetectorContext, DetectorResult } from '../types';

// ─── Generic Navigation Detector (max 5pts) ───────────────────────────────────
// AI-generated sites almost universally follow the same 5-item nav pattern.
// Home / Services (or Solutions) / About / Blog (or Resources) / Contact.
// Deviations from this template indicate intentional information architecture.

const NAV_TEMPLATES = [
  ['home', 'services', 'about', 'contact'],
  ['home', 'services', 'about', 'blog', 'contact'],
  ['home', 'solutions', 'about', 'contact'],
  ['home', 'solutions', 'about', 'blog', 'contact'],
  ['home', 'services', 'industries', 'about', 'contact'],
  ['home', 'services', 'about', 'resources', 'contact'],
  ['home', 'about', 'services', 'contact'],
  ['home', 'about', 'solutions', 'contact'],
  ['home', 'what-we-do', 'about', 'contact'],
  ['home', 'services', 'case-studies', 'about', 'contact'],
  ['home', 'services', 'portfolio', 'about', 'contact'],
];

// Items that make a nav feel generic/AI-generated
const GENERIC_NAV_ITEMS = [
  'get started', 'get a demo', 'book a demo', 'request a demo',
  'schedule a call', 'free trial', 'try free', 'start free',
  'resources', 'insights', 'solutions', 'capabilities',
];

export function detectGenericNavigation(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const evidence: string[] = [];

  // Extract nav link text
  const navLinks: string[] = [];
  $('nav a, header a, [role="navigation"] a, [class*="navbar"] a, [class*="nav-"] a').each((_, el) => {
    const text = $(el).text().trim().toLowerCase().replace(/[^a-z\s-]/g, '').trim();
    if (text.length >= 2 && text.length < 30 && !navLinks.includes(text)) {
      navLinks.push(text);
    }
  });

  if (navLinks.length === 0) {
    return {
      id: 'generic-navigation',
      name: 'Generic Navigation Structure',
      description: 'Navigation follows a standard AI-generated site template',
      category: 'structural',
      detected: false,
      severity: 'none',
      score: 0,
      maxScore: 5,
      evidence: [],
      recommendation: 'Design navigation that reflects your actual user journeys, not a template.',
    };
  }

  // Score against known templates
  let bestSimilarity = 0;
  for (const template of NAV_TEMPLATES) {
    const matches = template.filter((item) =>
      navLinks.some((l) => l.includes(item) || item.includes(l.split(' ')[0]))
    ).length;
    const similarity = matches / template.length;
    bestSimilarity = Math.max(bestSimilarity, similarity);
  }

  // Check for generic CTA items in nav
  const genericCTAItems = navLinks.filter((l) =>
    GENERIC_NAV_ITEMS.some((g) => l.includes(g))
  );

  const matchPct = Math.round(bestSimilarity * 100);
  // "Get started" in nav is universal — removed as a standalone trigger.
  // Only flag when the nav structure itself closely matches AI-template patterns.
  const detected = matchPct >= 70 || genericCTAItems.length >= 2;

  if (navLinks.length > 0) {
    evidence.push(`Nav links: ${navLinks.slice(0, 7).join(' · ')}`);
  }
  if (matchPct >= 60) {
    evidence.push(`${matchPct}% match to standard AI-site navigation template`);
  }
  if (genericCTAItems.length > 0) {
    evidence.push(`Generic CTA in nav: ${genericCTAItems.map((c) => `"${c}"`).join(', ')}`);
  }

  const score = Math.min(5, Math.round(bestSimilarity * 4) + (genericCTAItems.length >= 1 ? 1 : 0));

  return {
    id: 'generic-navigation',
    name: 'Generic Navigation Structure',
    description: 'Navigation follows a standard AI-generated site template (Home/Services/About/Blog/Contact)',
    category: 'structural',
    detected,
    severity: matchPct >= 90 ? 'high' : matchPct >= 70 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 5,
    evidence: detected ? evidence : [],
    recommendation:
      'Design navigation around your users\' actual decision journeys, not a template. Consider non-standard groupings that reflect your unique offering.',
  };
}

// ─── Meta & Title Quality Detector (max 5pts) ────────────────────────────────
// AI tools produce titles like "Company — AI Solutions & Automation | RPA & Data Analytics"
// — keyword-stuffed, pipe-separated, hitting every category. Real brands have
// specific, single-focused titles.

const TECH_BUZZWORD_LIST = [
  'ai', 'ml', 'machine learning', 'deep learning', 'neural',
  'rpa', 'automation', 'analytics', 'data', 'cloud', 'digital',
  'iot', 'blockchain', 'cybersecurity', 'devops', 'saas', 'paas',
  'enterprise', 'intelligent', 'platform', 'solutions', 'services',
];

export function detectMetaQuality(ctx: DetectorContext): DetectorResult {
  const { $, pageTitle } = ctx;
  const evidence: string[] = [];
  let score = 0;

  const meta = $('meta[name="description"]').attr('content') || '';
  const titleLower = pageTitle.toLowerCase();
  const metaLower = meta.toLowerCase();

  // 1. Title keyword stuffing: 3+ tech buzzwords
  const titleBuzzwords = TECH_BUZZWORD_LIST.filter((k) => titleLower.includes(k));
  if (titleBuzzwords.length >= 3) {
    score += 2;
    evidence.push(
      `Title contains ${titleBuzzwords.length} tech buzzwords: ${titleBuzzwords.slice(0, 5).join(', ')}`,
    );
  }

  // 2. Pipe/ampersand keyword-list title ("X & Y | Z & W")
  const separators = (pageTitle.match(/[|&]/g) || []).length;
  if (separators >= 2) {
    score += 2;
    evidence.push(
      `Title uses ${separators} separators (| or &) to stack keyword categories — hallmark of AI-generated titles`,
    );
  }

  // 3. Meta description mirrors title (low uniqueness)
  if (meta.length > 20) {
    const titleWords = titleLower.split(/\W+/).filter((w) => w.length > 4);
    const sharedWords = titleWords.filter((w) => metaLower.includes(w)).length;
    const overlapRatio = sharedWords / Math.max(titleWords.length, 1);
    if (overlapRatio >= 0.5 && sharedWords >= 4) {
      score += 1;
      evidence.push(
        `Meta description shares ${sharedWords} keywords with title (${Math.round(overlapRatio * 100)}% overlap)`,
      );
    }
  }

  // 4. Missing meta description
  if (!meta || meta.length < 20) {
    score += 1;
    evidence.push('No meta description — AI-built sites often omit this');
  }

  score = Math.min(5, score);
  const detected = score >= 2;

  return {
    id: 'meta-quality',
    name: 'Keyword-Stuffed Title / Meta',
    description: 'Page title or meta description uses pipe-separated keyword lists instead of specific brand messaging',
    category: 'content',
    detected,
    severity: score >= 4 ? 'high' : score >= 2 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 5,
    evidence: detected ? evidence : [],
    recommendation:
      'Write a title that states one specific thing your company does, not a keyword list. "Autellia — Intelligent Automation for Insurance Claims" beats "Enterprise AI/ML Solutions & Automation Technology | RPA & Data Analytics".',
  };
}
