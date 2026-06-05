import type { DetectorContext, DetectorResult } from '../types';

// Known AI-generated content frameworks: ordered sets of heading-level phrases
// that follow a predictable argumentative structure.
const FRAMEWORKS: Array<{ name: string; signals: string[][] }> = [
  {
    name: 'Problem → Solution → Benefits',
    signals: [
      ['problem', 'challenge', 'pain point', 'struggle', 'frustrat', 'difficult'],
      ['solution', 'answer', 'solve', 'fix', 'resolve', 'introducing'],
      ['benefit', 'advantage', 'result', 'outcome', 'gain', 'transform'],
    ],
  },
  {
    name: 'Challenge → Approach → Results',
    signals: [
      ['challenge', 'problem', 'obstacle', 'barrier', 'issue'],
      ['approach', 'process', 'method', 'how we', 'our way', 'strategy'],
      ['result', 'outcome', 'impact', 'success', 'achievement', 'deliver'],
    ],
  },
  {
    name: 'Features → Benefits → CTA',
    signals: [
      ['feature', 'capability', 'what we offer', 'what you get', 'includes'],
      ['benefit', 'advantage', 'why it matters', 'so you can', 'helps you'],
      ['get started', 'try free', 'book a demo', 'start today', 'contact us'],
    ],
  },
  {
    name: 'Pain Point → Solution → Outcome',
    signals: [
      ['tired of', 'struggling with', 'wasted', 'inefficient', 'manual', 'outdated', 'broken'],
      ['finally', 'introducing', 'now you can', 'we built', 'designed to'],
      ['save', 'increase', 'reduce', 'eliminate', 'maximize', 'scale'],
    ],
  },
  {
    name: 'Why We Exist → What We Do → Who We Serve',
    signals: [
      ['mission', 'we believe', 'founded to', 'why we', 'our purpose'],
      ['we build', 'we provide', 'we help', 'we create', 'what we do'],
      ['for teams', 'for businesses', 'who we serve', 'ideal for', 'built for'],
    ],
  },
];

export function detectContentFramework(ctx: DetectorContext): DetectorResult {
  const { $ } = ctx;
  const evidence: string[] = [];
  const detectedFrameworks: string[] = [];

  // Collect all headings in order
  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.length > 2) headings.push(text);
  });

  // Also check body text in paragraphs
  const allText = $('body').text().toLowerCase();

  for (const framework of FRAMEWORKS) {
    let phaseMatches = 0;

    for (const phaseSignals of framework.signals) {
      // Only match signals in headings — body text is too broad and produces false positives
      // on any professional website that uses standard vocabulary
      const inHeadings = headings.some((h) =>
        phaseSignals.some((s) => h.includes(s))
      );
      if (inHeadings) phaseMatches++;
    }

    // Require all 3 phases to match in headings — 2/3 produces too many false positives
    if (phaseMatches >= 3) {
      detectedFrameworks.push(framework.name);
      evidence.push(`"${framework.name}" content structure detected in section headings (${phaseMatches}/3 phases)`);
    }
  }

  // Also check for "3-step process" pattern (extremely common in AI sites)
  const hasNumberedProcess =
    allText.includes('step 1') ||
    allText.includes('step one') ||
    (allText.includes('step 2') && allText.includes('step 3')) ||
    /\b(01|02|03)\b/.test(allText);
  if (hasNumberedProcess) {
    evidence.push('Numbered "Step 1 / Step 2 / Step 3" process framework detected');
  }

  const detected = detectedFrameworks.length >= 1 || hasNumberedProcess;
  const score = Math.min(7, detectedFrameworks.length * 3 + (hasNumberedProcess ? 2 : 0));

  return {
    id: 'content-framework',
    name: 'Generic Content Framework',
    description: 'Page content follows a predictable AI-generated argumentative structure',
    category: 'content',
    detected,
    severity: detectedFrameworks.length >= 2 ? 'high' : detected ? 'medium' : 'none',
    score: detected ? score : 0,
    maxScore: 7,
    evidence: detected ? evidence.slice(0, 4) : [],
    recommendation:
      'This page follows a content structure (Problem → Solution → Benefits, or Features → CTA) that is very common in AI-generated sites. Pages that lead with specific customer outcomes, named examples, and concrete numbers tend to feel more distinctive than sites following the standard argumentative template.',
  };
}
