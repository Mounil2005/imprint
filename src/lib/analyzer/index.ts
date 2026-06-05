import * as cheerio from 'cheerio';
import type { DetectorContext } from './types';
import type { AnalysisResult, DetectedPattern, PageScore, PageContribution, ScoringBreakdown } from '@/types';

// Visual detectors
import { detectCards, detectNestedCards } from './detectors/cards';
import { detectBadges } from './detectors/badges';
import { detectCTA } from './detectors/cta';
import { detectDotGridBackground } from './detectors/backgrounds';
import { detectTestimonials } from './detectors/testimonials';
import { detectPricing } from './detectors/pricing';
import { detectIconGrid } from './detectors/iconGrid';

// Content detectors
import { detectHero } from './detectors/hero';
import { detectMarketingGenericity } from './detectors/marketingGenericity';
import { detectContentFramework } from './detectors/contentFramework';
import { detectVagueStatistics, detectAIPhraseOpeners, detectContentThinness } from './detectors/copyIntelligence';
import { detectMetaQuality } from './detectors/navFooter';

// Structural detectors
import { detectArchetype, detectGenericSections, detectTemplateSimilarity } from './detectors/archetype';
import { detectLayoutDiversity, detectComponentReuse } from './detectors/layoutDiversity';
import { detectGenericNavigation } from './detectors/navFooter';

// New detectors
import { detectTransitionPatterns } from './detectors/transitionPatterns';
import { detectCompoundSignals } from './detectors/compoundSignals';
import { detectFontStack } from './detectors/fontStack';
import { detectGradientBlobs } from './detectors/gradientBlobs';
import { detectTechStack } from './detectors/techStack';
import { detectSocialProofQuality } from './detectors/socialProofQuality';
import { detectFooterTemplate } from './detectors/footerTemplate';

import {
  calculateTotalScore,
  calculateCategoryScores,
  determineConfidence,
  generateRecommendations,
  extractMetrics,
  buildStructuralAnalysis,
  classifyPageImportance,
  buildScoringBreakdown,
  calculatePatternBasedScore,
} from './scoring';

// ─── Run all detectors on a single page ──────────────────────────────────────

function runDetectors(ctx: DetectorContext): DetectedPattern[] {
  return [
    // Visual
    detectCards(ctx),
    detectNestedCards(ctx),
    detectBadges(ctx),
    detectDotGridBackground(ctx),
    detectTestimonials(ctx),
    detectPricing(ctx),
    detectCTA(ctx),
    detectIconGrid(ctx),
    // Content
    detectHero(ctx),
    detectMarketingGenericity(ctx),
    detectContentFramework(ctx),
    detectVagueStatistics(ctx),
    detectAIPhraseOpeners(ctx),
    detectContentThinness(ctx),
    detectMetaQuality(ctx),
    // Structural
    detectArchetype(ctx),
    detectGenericSections(ctx),
    detectLayoutDiversity(ctx),
    detectComponentReuse(ctx),
    detectTemplateSimilarity(ctx),
    detectGenericNavigation(ctx),
    // Animation + compound
    detectTransitionPatterns(ctx),
    detectCompoundSignals(ctx),
    // Visual fingerprinting
    detectFontStack(ctx),
    detectGradientBlobs(ctx),
    detectTechStack(ctx),
    // Quality depth
    detectSocialProofQuality(ctx),
    detectFooterTemplate(ctx),
  ];
}

// ─── Merge patterns from multiple pages (max score wins per pattern) ──────────

function mergePatterns(allPagePatterns: DetectedPattern[][]): DetectedPattern[] {
  if (allPagePatterns.length === 0) return [];
  if (allPagePatterns.length === 1) return allPagePatterns[0];

  const best = new Map<string, DetectedPattern>();
  for (const pagePatterns of allPagePatterns) {
    for (const p of pagePatterns) {
      const existing = best.get(p.id);
      if (!existing || p.score > existing.score) {
        best.set(p.id, p);
      }
    }
  }

  return allPagePatterns[0].map((p) => best.get(p.id) ?? p);
}

// ─── Build a full AnalysisResult from detected patterns ──────────────────────

function buildResult(
  url: string,
  patterns: DetectedPattern[],
  screenshot: string | null,
  htmlLength: number,
  crawlTime: number,
  startTime: number,
  crawlMode: 'single' | 'multi',
  pagesAnalyzed: number,
  pageScores: PageScore[],
  scoringBreakdown: ScoringBreakdown,
): AnalysisResult {
  return {
    url,
    score: calculateTotalScore(patterns),
    confidenceLevel: determineConfidence(htmlLength, patterns.length),
    screenshot,
    metrics: extractMetrics(patterns),
    patterns,
    recommendations: generateRecommendations(patterns),
    structural: buildStructuralAnalysis(patterns),
    categoryScores: calculateCategoryScores(patterns),
    crawlMode,
    pagesAnalyzed,
    pageScores,
    scoringBreakdown,
    timestamp: new Date().toISOString(),
    analysisTime: Date.now() - startTime + crawlTime,
  };
}

// ─── Public: single-page analysis ────────────────────────────────────────────

export async function analyzeWebsite(
  url: string,
  html: string,
  screenshot: string | null,
  crawlTime: number,
): Promise<AnalysisResult> {
  const startTime = Date.now();
  const $ = cheerio.load(html);
  const pageTitle = $('title').text().trim();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const ctx: DetectorContext = { html, $, url, pageTitle, bodyText };

  const patterns = runDetectors(ctx);
  const singlePageScore = calculateTotalScore(patterns);

  // Build a single-page contribution (homepage assumed for single-page crawl)
  const pageContributions: PageContribution[] = [{
    url,
    pageType: 'home',
    importance: 'homepage',
    score: singlePageScore,
    weight: 1.0,
  }];

  const scoringBreakdown = buildScoringBreakdown(patterns, pageContributions);

  return buildResult(url, patterns, screenshot, html.length, crawlTime, startTime, 'single', 1, [], scoringBreakdown);
}

// ─── Public: multi-page analysis ─────────────────────────────────────────────

export async function analyzeMultiplePages(
  pages: Array<{ url: string; pageType: string; html: string; screenshot: string | null; crawlTime: number }>,
  totalCrawlTime: number,
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // Run detectors on each page
  const perPageResults = pages.map((page) => {
    const $ = cheerio.load(page.html);
    const pageTitle = $('title').text().trim();
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const ctx: DetectorContext = { html: page.html, $, url: page.url, pageTitle, bodyText };
    const patterns = runDetectors(ctx);
    const score = calculateTotalScore(patterns);
    return { page, patterns, score };
  });

  // Classify each page and build PageScore with importance + weight
  const pageScores: PageScore[] = perPageResults.map(({ page, patterns, score }) => {
    const { importance, weight } = classifyPageImportance(page.pageType);
    return {
      url: page.url,
      pageType: page.pageType,
      importance,
      score,
      screenshot: page.screenshot,
      patternCount: patterns.filter((p) => p.detected).length,
      weight,
    };
  });

  // Build page contributions for the Key Page Score component
  const pageContributions: PageContribution[] = pageScores.map((ps) => ({
    url: ps.url,
    pageType: ps.pageType,
    importance: ps.importance,
    score: ps.score,
    weight: ps.weight,
  }));

  // Merge patterns — take max score per pattern across all pages
  const mergedPatterns = mergePatterns(perPageResults.map((r) => r.patterns));

  // Build scoring breakdown
  const scoringBreakdown = buildScoringBreakdown(mergedPatterns, pageContributions);

  // ── NEW: three-component final score ─────────────────────────────────────
  // Replaces simple per-page averaging
  const finalScore = calculatePatternBasedScore(mergedPatterns, pageContributions);

  const result = buildResult(
    pages[0].url,
    mergedPatterns,
    pages[0].screenshot,
    pages.reduce((sum, p) => sum + p.html.length, 0),
    totalCrawlTime,
    startTime,
    'multi',
    pages.length,
    pageScores,
    scoringBreakdown,
  );

  result.score = finalScore;

  return result;
}
