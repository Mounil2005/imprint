export interface AnalysisRequest {
  url: string;
  mode?: 'single' | 'multi';
}

export type Severity = 'none' | 'low' | 'medium' | 'high';
export type ConfidenceLevel = 'Low' | 'Medium' | 'High' | 'Very High';
export type PatternCategory = 'visual' | 'structural' | 'content';

export interface StructuralMeta {
  archetype?: string;
  archetypeMatchScore?: number;
  templateSimilarity?: number;
  layoutDiversity?: 'low' | 'medium' | 'high';
  repeatedComponents?: string[];
  genericSections?: string[];
  sectionSequence?: string[];
}

export interface DetectedPattern {
  id: string;
  name: string;
  description: string;
  category: PatternCategory;
  detected: boolean;
  severity: Severity;
  score: number;
  maxScore: number;
  evidence: string[];
  recommendation: string;
  meta?: StructuralMeta;
}

export interface AnalysisMetrics {
  cardCount: number;
  badgeCount: number;
  ctaCount: number;
  repeatedSections: number;
  genericPhrases: number;
  nestedCardInstances: number;
  testimonialCount: number;
  pricingTierCount: number;
  genericSectionCount: number;
  repeatedComponentTypes: number;
}

export interface StructuralAnalysis {
  archetype: string;
  archetypeMatchScore: number;
  templateSimilarity: number;
  layoutDiversity: 'low' | 'medium' | 'high';
  repeatedComponents: string[];
  genericSections: string[];
  sectionSequence: string[];
}

export interface CategoryScores {
  visual: { score: number; max: number };
  structural: { score: number; max: number };
  content: { score: number; max: number };
}

export type PageImportance = 'homepage' | 'product' | 'services' | 'about' | 'contact' | 'legal' | 'other';

/** Per-page result when running multi-page analysis */
export interface PageScore {
  url: string;
  pageType: string;
  importance: PageImportance;
  score: number;
  screenshot: string | null;
  patternCount: number;
  weight: number;
}

export interface PageContribution {
  url: string;
  pageType: string;
  importance: PageImportance;
  score: number;
  weight: number;
}

export interface ScoringBreakdown {
  coverageScore: number;
  strengthScore: number;
  keyPageScore: number;
  detectedCount: number;
  totalPatterns: number;
  pageContributions: PageContribution[];
}

export interface AnalysisResult {
  url: string;
  score: number;
  confidenceLevel: ConfidenceLevel;
  screenshot: string | null;
  metrics: AnalysisMetrics;
  patterns: DetectedPattern[];
  recommendations: string[];
  structural: StructuralAnalysis;
  categoryScores: CategoryScores;
  /** 'single' = one page only, 'multi' = up to 5 pages crawled */
  crawlMode: 'single' | 'multi';
  pagesAnalyzed: number;
  /** Populated in multi mode — one entry per page crawled */
  pageScores: PageScore[];
  scoringBreakdown: ScoringBreakdown;
  timestamp: string;
  analysisTime: number;
}

export interface AnalysisError {
  error: string;
  code: 'INVALID_URL' | 'CRAWL_FAILED' | 'TIMEOUT' | 'ANALYSIS_FAILED' | 'UNKNOWN';
}

export type ApiResponse = AnalysisResult | AnalysisError;

export function isAnalysisError(response: ApiResponse): response is AnalysisError {
  return 'error' in response;
}
