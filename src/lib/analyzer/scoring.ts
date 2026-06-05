import type {
  DetectedPattern,
  ConfidenceLevel,
  AnalysisMetrics,
  StructuralAnalysis,
  CategoryScores,
  PageImportance,
  PageContribution,
  ScoringBreakdown,
} from '@/types';

// Additive scoring: each detector contributes its points directly.
// Total possible exceeds 100 so that partially-matching sites cannot
// max out the scale — you need to trigger most patterns simultaneously.
// Score is capped at 100 for display purposes.
export function calculateTotalScore(patterns: DetectedPattern[]): number {
  return Math.min(100, patterns.reduce((sum, p) => sum + p.score, 0));
}

export function calculateCategoryScores(patterns: DetectedPattern[]): CategoryScores {
  const byCategory = (cat: string) => patterns.filter((p) => p.category === cat);

  const calc = (cat: string) => {
    const ps = byCategory(cat);
    return {
      score: ps.reduce((s, p) => s + p.score, 0),
      max: ps.reduce((s, p) => s + p.maxScore, 0),
    };
  };

  return {
    visual: calc('visual'),
    structural: calc('structural'),
    content: calc('content'),
  };
}

export function determineConfidence(
  htmlLength: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _patternsAnalyzed: number,
): ConfidenceLevel {
  if (htmlLength < 2000) return 'Low';
  if (htmlLength < 8000) return 'Medium';
  if (htmlLength >= 30000) return 'Very High';
  return 'High';
}

export function generateRecommendations(patterns: DetectedPattern[]): string[] {
  const recommendations: string[] = [];
  const detected = patterns.filter((p) => p.detected).sort((a, b) => b.score - a.score);

  for (const pattern of detected) {
    if (pattern.recommendation && !recommendations.includes(pattern.recommendation)) {
      recommendations.push(pattern.recommendation);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'This site shows a distinctive design approach. Continue focusing on brand-specific visual decisions.',
    );
  }

  if (detected.length >= 6) {
    recommendations.push(
      'Consider a design and content audit with a professional to establish a unique visual identity and voice.',
    );
  }

  return recommendations.slice(0, 6);
}

export function extractMetrics(patterns: DetectedPattern[]): AnalysisMetrics {
  const find = (id: string) => patterns.find((p) => p.id === id);

  const cardP = find('card-overload');
  const badgeP = find('badge-heavy');
  const ctaP = find('repeated-cta');
  const phraseP = find('marketing-genericity');
  const nestedP = find('nested-cards');
  const testimonialP = find('testimonial-cards');
  const pricingP = find('pricing-cards');
  const sectionsP = find('generic-sections');
  const reuseP = find('component-reuse');

  return {
    cardCount: cardP?.detected
      ? Math.max(4, Math.round((cardP.score / cardP.maxScore) * 16))
      : 0,
    badgeCount: badgeP?.detected
      ? Math.max(6, Math.round((badgeP.score / badgeP.maxScore) * 20))
      : 0,
    ctaCount: ctaP?.detected
      ? Math.max(2, Math.round((ctaP.score / ctaP.maxScore) * 6))
      : 0,
    repeatedSections: patterns.find((p) => p.id === 'layout-diversity')?.detected ? 3 : 0,
    genericPhrases: phraseP?.detected
      ? Math.max(3, Math.round((phraseP.score / phraseP.maxScore) * 15))
      : 0,
    nestedCardInstances: nestedP?.detected
      ? Math.max(1, Math.round((nestedP.score / nestedP.maxScore) * 4))
      : 0,
    testimonialCount: testimonialP?.detected
      ? Math.max(3, Math.round((testimonialP.score / testimonialP.maxScore) * 9))
      : 0,
    pricingTierCount: pricingP?.detected ? 3 : 0,
    genericSectionCount: sectionsP?.meta?.genericSections
      ? (sectionsP.meta.genericSections as string[]).length
      : 0,
    repeatedComponentTypes: reuseP?.meta?.repeatedComponents
      ? (reuseP.meta.repeatedComponents as string[]).length
      : 0,
  };
}

// ─── Page importance classification ──────────────────────────────────────────

export function classifyPageImportance(pageType: string): { importance: PageImportance; weight: number } {
  const t = pageType.toLowerCase();
  if (t === 'home' || t === 'homepage') return { importance: 'homepage', weight: 0.40 };
  if (/^(features?|pricing|plans?|product|platform|capabilities|how-it-works)$/.test(t)) return { importance: 'product', weight: 0.25 };
  if (/^(services?|solutions?|industries|why[\s-]us|case[\s-]studies|portfolio|offerings)$/.test(t)) return { importance: 'services', weight: 0.20 };
  if (/^about/.test(t) || t === 'our story' || t === 'team' || t === 'mission') return { importance: 'about', weight: 0.10 };
  if (/^(contact|get.started|book|demo|get.in.touch)$/.test(t)) return { importance: 'contact', weight: 0.05 };
  if (/privacy|terms|legal|cookie|disclaimer|gdpr|compliance/.test(t)) return { importance: 'legal', weight: 0 };
  return { importance: 'other', weight: 0.15 };
}

// ─── Three scoring components ─────────────────────────────────────────────────

export function calculateCoverageScore(patterns: DetectedPattern[]): number {
  if (patterns.length === 0) return 0;
  const detected = patterns.filter((p) => p.detected).length;
  return Math.round((detected / patterns.length) * 100);
}

export function calculateStrengthScore(patterns: DetectedPattern[]): number {
  const detected = patterns.filter((p) => p.detected);
  if (detected.length === 0) return 0;
  const sumScores = detected.reduce((s, p) => s + p.score, 0);
  const sumMaxes = detected.reduce((s, p) => s + p.maxScore, 0);
  return sumMaxes > 0 ? Math.round((sumScores / sumMaxes) * 100) : 0;
}

export function calculateKeyPageScore(contributions: PageContribution[]): number {
  const meaningful = contributions.filter((c) => c.weight > 0);
  if (meaningful.length === 0) return 0;
  const totalWeight = meaningful.reduce((s, c) => s + c.weight, 0);
  const weightedSum = meaningful.reduce((s, c) => s + c.score * c.weight, 0);
  return Math.round(weightedSum / totalWeight);
}

export function calculatePatternBasedScore(
  patterns: DetectedPattern[],
  pageContributions: PageContribution[],
): number {
  const coverage = calculateCoverageScore(patterns);
  const strength = calculateStrengthScore(patterns);
  const keyPage = pageContributions.length > 0
    ? calculateKeyPageScore(pageContributions)
    : Math.min(100, patterns.reduce((s, p) => s + p.score, 0));
  return Math.min(100, Math.round(coverage * 0.50 + strength * 0.30 + keyPage * 0.20));
}

export function buildScoringBreakdown(
  patterns: DetectedPattern[],
  pageContributions: PageContribution[],
): ScoringBreakdown {
  return {
    coverageScore: calculateCoverageScore(patterns),
    strengthScore: calculateStrengthScore(patterns),
    keyPageScore: calculateKeyPageScore(pageContributions),
    detectedCount: patterns.filter((p) => p.detected).length,
    totalPatterns: patterns.length,
    pageContributions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export function buildStructuralAnalysis(patterns: DetectedPattern[]): StructuralAnalysis {
  const archP = patterns.find((p) => p.id === 'website-archetype');
  const tmplP = patterns.find((p) => p.id === 'template-similarity');
  const layoutP = patterns.find((p) => p.id === 'layout-diversity');
  const reuseP = patterns.find((p) => p.id === 'component-reuse');
  const sectionsP = patterns.find((p) => p.id === 'generic-sections');

  return {
    archetype: (archP?.meta?.archetype as string) || 'Unknown',
    archetypeMatchScore: (archP?.meta?.archetypeMatchScore as number) || 0,
    templateSimilarity: (tmplP?.meta?.templateSimilarity as number) || 0,
    layoutDiversity: (layoutP?.meta?.layoutDiversity as 'low' | 'medium' | 'high') || 'medium',
    repeatedComponents: (reuseP?.meta?.repeatedComponents as string[]) || [],
    genericSections: (sectionsP?.meta?.genericSections as string[]) || [],
    sectionSequence: (archP?.meta?.sectionSequence as string[]) || [],
  };
}
