import type { DetectorContext, DetectorResult } from '../types';

// ─── Uncited Statistical Claims Detector (max 12pts) ─────────────────────────
// AI tools default to round-number statistics because they have no real data.
// The detector does NOT claim the stats are false — only that they are round-number
// claims with no source, methodology, or attribution found nearby on the page.

const VAGUE_STAT_REGEXES = [
  // Round percentage + benefit claim ("80% cost reduction", "95% faster")
  /\b([57][05]|[89][05]?|100|95|98|99)\s*%\s*(cost|time|effort|manual|error|process|productivity|efficiency|revenue|growth|faster|reduction|improvement|increase|saving|accuracy|uptime|satisfaction|success)/gi,
  // Multiplier ROI claims ("10x ROI", "3x faster", "5x productivity")
  /\b([2-9]\d*|10)x\s*(roi|return|productivity|faster|efficiency|growth|revenue|better|improvement)/gi,
  // Client/user count with + ("500+ clients", "1000+ companies", "50k+ users")
  /\b(\d{2,}[k]?\+)\s*(clients|customers|companies|businesses|enterprises|organizations|brands|users|projects)/gi,
  // Satisfaction/success percentage ("98% satisfaction", "99% uptime")
  /\b(9[5-9]|100)\s*%\s*(satisfaction|success|uptime|accuracy|retention|client|customer)/gi,
  // Years of experience as vague credential ("10+ years of experience")
  /\b\d+\+?\s*years?\s+(of\s+)?(experience|expertise|excellence|delivering|helping)/gi,
];

const SOURCE_INDICATORS = [
  'according to', 'study shows', 'research shows', 'survey', 'gartner', 'forrester',
  'mckinsey', 'source:', 'citation', 'harvard', 'mit',
];

export function detectVagueStatistics(ctx: DetectorContext): DetectorResult {
  const { bodyText, $ } = ctx;
  const evidence: string[] = [];
  const found: string[] = [];

  // Extract matches from body text
  for (const regex of VAGUE_STAT_REGEXES) {
    const matches = bodyText.match(regex);
    if (matches) {
      for (const m of matches.slice(0, 3)) {
        const clean = m.trim();
        if (!found.includes(clean)) found.push(clean);
      }
    }
  }

  // Check for any source attribution (reduces score if present)
  const hasSource = SOURCE_INDICATORS.some((s) => bodyText.toLowerCase().includes(s));

  if (found.length > 0) {
    evidence.push(`Round-number statistics without cited source: ${found.slice(0, 5).map((f) => `"${f}"`).join(', ')}`);
  }
  if (found.length >= 2 && !hasSource) {
    evidence.push('No source, methodology, or attribution found near these claims on the page');
  }

  // Stat display sections: only add as evidence when round-number patterns are also present
  const statElements = $('[class*="stat"], [class*="metric"], [class*="count"], [class*="number"]');
  if (statElements.length >= 3 && found.length >= 1) {
    evidence.push(`${statElements.length} stat/metric display blocks — common in AI-generated landing page sections`);
  }

  // Require at least 2 matches — one round number alone could easily be legitimate
  const detected = found.length >= 2;
  const rawScore = Math.min(12, found.length * 3 + (statElements.length >= 3 ? 2 : 0) - (hasSource ? 3 : 0));
  const score = Math.max(0, rawScore);

  return {
    id: 'vague-statistics',
    name: 'Uncited Statistical Claims',
    description: 'Round-number statistics (80% reduction, 10x ROI) with no source, methodology, or attribution found on the page',
    category: 'content',
    detected,
    severity: found.length >= 3 ? 'high' : found.length >= 2 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 12,
    evidence: detected ? evidence.slice(0, 4) : [],
    recommendation:
      'Round-number statistics without citations are a pattern AI tools generate by default. If these figures come from real data, adding a source or context (methodology, date, sample size) distinguishes them from AI-generated claims and strengthens credibility.',
  };
}

// ─── AI Prose Opener Detector (max 10pts) ─────────────────────────────────────
// AI language models have telltale sentence openers. These phrases appear
// repeatedly across AI-generated marketing copy and are virtually never
// written by a domain expert or experienced copywriter.

const AI_PROSE_OPENERS = [
  // Context-setting openers (extremely common in AI copy)
  "in today's fast-paced",
  "in today's competitive",
  "in today's rapidly evolving",
  "in today's digital",
  "in an increasingly",
  "in the ever-evolving",
  "in the rapidly evolving",
  "in the modern business",
  "as the world becomes more",
  "as businesses evolve",
  // Self-description patterns
  "we are committed to",
  "we are dedicated to",
  "we pride ourselves on",
  "our mission is to",
  "we are passionate about",
  "we specialize in providing",
  "we understand that",
  "our team of dedicated",
  "our team of experienced",
  "our team of expert",
  "our expert team",
  "as a leading provider",
  "as a trusted partner",
  "as a premier",
  "with a proven track record",
  "with years of experience",
  "with decades of experience",
  // Empowerment language
  "empowering businesses",
  "empowering enterprises",
  "empowering organizations",
  "helping businesses",
  "helping organizations",
  "transforming the way",
  "revolutionizing the way",
  // Generic offer patterns
  "tailored to your needs",
  "tailored solutions",
  "customized solutions",
  "comprehensive solutions",
  "end-to-end solutions",
  "our comprehensive suite",
  "a full suite of",
  // Partnership clichés
  "partner with us",
  "your success is our",
  "let us help you",
  "take your business to",
  "take your organization to",
  // Whether/if openers
  "whether you're a startup",
  "whether you're looking",
  "whether you need",
  "no matter the size",
  "regardless of your industry",
];

export function detectAIPhraseOpeners(ctx: DetectorContext): DetectorResult {
  const { bodyText } = ctx;
  const lowerText = bodyText.toLowerCase();
  const found: string[] = [];
  const evidence: string[] = [];

  for (const opener of AI_PROSE_OPENERS) {
    if (lowerText.includes(opener)) {
      found.push(opener);
    }
  }

  if (found.length > 0) {
    evidence.push(
      `AI prose patterns detected: ${found.slice(0, 5).map((f) => `"${f}"`).join(', ')}`,
    );
  }
  if (found.length >= 5) {
    evidence.push('High density of template-prose patterns — these openers are strongly associated with AI-generated copy');
  }

  const detected = found.length >= 2;
  const score = Math.min(10, found.length * 2);

  return {
    id: 'ai-prose-openers',
    name: 'AI Prose Patterns',
    description: 'Body copy uses sentence openers and framing patterns characteristic of AI-written marketing text',
    category: 'content',
    detected,
    severity: found.length >= 6 ? 'high' : found.length >= 3 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 10,
    evidence: detected ? evidence.slice(0, 3) : [],
    recommendation:
      'These sentence openers and framing patterns appear very frequently in AI-generated marketing copy. Replacing them with direct statements — leading with what you actually do rather than contextualising the market — tends to read as more authoritative and specific.',
  };
}

// ─── Content Thinness Detector (max 6pts) ─────────────────────────────────────
// AI-generated landing pages tend to have lots of headings and bullet points
// but very little sustained prose. Each paragraph is 2–3 sentences.
// High heading-to-paragraph ratio = low information density.

export function detectContentThinness(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const evidence: string[] = [];

  const headingCount = $('h1, h2, h3, h4').length;
  const paragraphs = $('p').toArray().filter((el) => {
    const text = $(el).text().trim();
    return text.length > 20; // ignore empty/tiny paragraphs
  });
  const paragraphCount = paragraphs.length;

  // Average paragraph word count
  const wordCounts = paragraphs.map((el) =>
    $(el).text().trim().split(/\s+/).length,
  );
  const avgWordCount =
    wordCounts.length > 0
      ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length)
      : 0;

  // Heading-to-paragraph ratio (> 0.6 = too many headings, not enough prose)
  const headingRatio = paragraphCount > 0 ? headingCount / paragraphCount : 2;

  // Count bullet list items
  const listItemCount = $('li').length;

  let score = 0;

  // 20 words or fewer (< 2 sentences) is more specific to AI-generated brevity
  // 30 words fires on modern landing pages that use intentionally short punchy paragraphs
  if (avgWordCount > 0 && avgWordCount < 20 && paragraphCount >= 5) {
    score += 3;
    evidence.push(
      `Average paragraph: ${avgWordCount} words — unusually short even for landing page copy`,
    );
  }
  if (headingRatio > 0.7 && headingCount >= 8) {
    score += 2;
    evidence.push(
      `${headingCount} headings vs ${paragraphCount} paragraphs (ratio ${headingRatio.toFixed(1)}) — heading-heavy structure`,
    );
  }
  if (listItemCount > 0 && paragraphCount > 0 && listItemCount / paragraphCount > 3) {
    score += 1;
    evidence.push(
      `${listItemCount} list items vs ${paragraphCount} paragraphs — bullet-heavy, low prose density`,
    );
  }

  score = Math.min(6, score);
  const detected = score >= 2;

  return {
    id: 'content-thinness',
    name: 'Thin / Uniform Content',
    description: 'Paragraphs are short and uniform, with a high heading-to-prose ratio typical of AI-generated pages',
    category: 'content',
    detected,
    severity: score >= 5 ? 'high' : score >= 3 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 6,
    evidence: detected ? evidence : [],
    recommendation:
      'Write longer, more varied paragraphs that demonstrate genuine domain knowledge. Real expertise shows in depth, not in a list of 3-word bullet points.',
  };
}
