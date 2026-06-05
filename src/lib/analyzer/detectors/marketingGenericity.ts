import type { DetectorContext, DetectorResult } from '../types';

interface PhraseEntry {
  phrase: string;
  category: string;
  weight: number; // 1 = standard, 2 = strong signal
}

const PHRASES: PhraseEntry[] = [
  // Transformation language (strong signals)
  { phrase: 'transform your', category: 'Transformation', weight: 2 },
  { phrase: 'revolutionize', category: 'Transformation', weight: 2 },
  { phrase: 'game-changing', category: 'Transformation', weight: 2 },
  { phrase: 'game changer', category: 'Transformation', weight: 2 },
  { phrase: 'disruptive', category: 'Transformation', weight: 2 },
  { phrase: 'reimagine', category: 'Transformation', weight: 1 },
  { phrase: 'redefine', category: 'Transformation', weight: 1 },
  { phrase: 'paradigm shift', category: 'Transformation', weight: 2 },
  // Innovation / quality claims (strong signals)
  { phrase: 'next-generation', category: 'Innovation', weight: 2 },
  { phrase: 'next generation', category: 'Innovation', weight: 2 },
  { phrase: 'cutting-edge', category: 'Innovation', weight: 2 },
  { phrase: 'cutting edge', category: 'Innovation', weight: 2 },
  { phrase: 'state-of-the-art', category: 'Innovation', weight: 2 },
  { phrase: 'state of the art', category: 'Innovation', weight: 2 },
  { phrase: 'best-in-class', category: 'Innovation', weight: 2 },
  { phrase: 'world-class', category: 'Innovation', weight: 2 },
  { phrase: 'industry-leading', category: 'Innovation', weight: 2 },
  { phrase: 'intelligent automation', category: 'Innovation', weight: 2 },
  { phrase: 'digital transformation', category: 'Innovation', weight: 2 },
  { phrase: 'future-ready', category: 'Innovation', weight: 1 },
  { phrase: 'future-proof', category: 'Innovation', weight: 1 },
  // AI buzzwords
  { phrase: 'powered by ai', category: 'AI Buzzword', weight: 2 },
  { phrase: 'ai-powered', category: 'AI Buzzword', weight: 2 },
  { phrase: 'ai-driven', category: 'AI Buzzword', weight: 2 },
  { phrase: 'machine learning', category: 'AI Buzzword', weight: 1 },
  // Empowerment / ease language
  { phrase: 'empower your', category: 'Empowerment', weight: 1 },
  { phrase: 'unlock the power', category: 'Empowerment', weight: 2 },
  { phrase: 'unlock your potential', category: 'Empowerment', weight: 2 },
  { phrase: 'harness the power', category: 'Empowerment', weight: 2 },
  { phrase: 'supercharge', category: 'Empowerment', weight: 1 },
  { phrase: 'seamlessly', category: 'Ease Claim', weight: 1 },
  { phrase: 'effortlessly', category: 'Ease Claim', weight: 2 },
  { phrase: 'seamless experience', category: 'Ease Claim', weight: 2 },
  { phrase: 'end-to-end solution', category: 'Ease Claim', weight: 2 },
  { phrase: 'all-in-one', category: 'Ease Claim', weight: 1 },
  // Social proof clichés — specific AI-generated phrasing only
  { phrase: 'join thousands', category: 'Social Proof', weight: 2 },
  { phrase: 'join millions', category: 'Social Proof', weight: 2 },
  { phrase: 'trusted by thousands', category: 'Social Proof', weight: 2 },
  { phrase: 'loved by teams', category: 'Social Proof', weight: 1 },
  // Business jargon — only the most egregious, context-free ones
  { phrase: 'synergy', category: 'Jargon', weight: 2 },
  { phrase: 'value-driven', category: 'Jargon', weight: 1 },
  // Value prop clichés — keep only the template-specific ones
  { phrase: 'save time and money', category: 'Value Prop', weight: 2 },
  { phrase: 'maximize roi', category: 'Value Prop', weight: 2 },
  { phrase: 'boost productivity', category: 'Value Prop', weight: 1 },
  // No-code promise language — very specific AI-generated copy pattern
  { phrase: 'no code required', category: 'No-Code Promise', weight: 2 },
  { phrase: 'without any code', category: 'No-Code Promise', weight: 2 },
  { phrase: 'no coding required', category: 'No-Code Promise', weight: 2 },
];

export function detectMarketingGenericity(ctx: DetectorContext): DetectorResult {
  const { bodyText } = ctx;
  const lowerText = bodyText.toLowerCase();
  const evidence: string[] = [];

  const found: PhraseEntry[] = [];
  const categoryCounts: Record<string, number> = {};
  let weightedTotal = 0;

  for (const entry of PHRASES) {
    if (lowerText.includes(entry.phrase)) {
      found.push(entry);
      categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
      weightedTotal += entry.weight;
    }
  }

  // Phrase repetition — how many times does the same phrase appear
  const repetitionBonus = found.filter((f) => {
    const regex = new RegExp(f.phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    const count = (bodyText.match(regex) || []).length;
    return count >= 3;
  }).length;

  if (found.length > 0) {
    const examples = found.slice(0, 6).map((f) => `"${f.phrase}"`).join(', ');
    evidence.push(`Generic marketing phrases detected: ${examples}`);
  }

  const topCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  for (const [cat, count] of topCategories) {
    evidence.push(`${cat}: ${count} phrase${count > 1 ? 's' : ''} detected`);
  }

  if (repetitionBonus > 0) {
    evidence.push(`${repetitionBonus} phrase${repetitionBonus > 1 ? 's' : ''} repeated 3+ times across the page`);
  }

  const phraseCount = found.length;
  const detected = phraseCount >= 5;
  const rawScore = Math.min(12, Math.round((weightedTotal / 20) * 12) + repetitionBonus);
  const score = detected ? rawScore : 0;

  return {
    id: 'marketing-genericity',
    name: 'Marketing Genericity',
    description: 'Overuse of generic marketing buzzwords and AI-associated phrases',
    category: 'content',
    detected,
    severity: phraseCount >= 10 ? 'high' : phraseCount >= 7 ? 'medium' : detected ? 'low' : 'none',
    score,
    maxScore: 12,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'Replace generic claims with specific, verifiable statements. Instead of "industry-leading" write the actual metric. Instead of "seamlessly" describe the concrete workflow.',
  };
}
