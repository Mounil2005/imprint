import type { AnalysisResult } from '@/types';

export interface RepoFile {
  path: string;
  content: string;
  size: number;
}

export interface RepoFetchResult {
  owner: string;
  repo: string;
  branch: string;
  files: RepoFile[];
  totalFiles: number;
  fetchTime: number;
  error?: string;
}

export interface CodeDetectedPattern {
  id: string;
  name: string;
  description: string;
  detected: boolean;
  score: number;
  maxScore: number;
  evidence: string[];
  details: Record<string, unknown>;
}

export interface CodeAnalysisResult {
  repoUrl: string;
  owner: string;
  repo: string;
  score: number;
  patterns: CodeDetectedPattern[];
  fileCount: number;
  analyzedFileCount: number;
  fetchTime: number;
  analysisTime: number;
  timestamp: string;
}

export interface CombinedAnalysisResult {
  websiteResult: AnalysisResult;
  codeResult: CodeAnalysisResult;
  websiteScore: number;
  codeScore: number;
  combinedScore: number;
  interpretation: string;
  timestamp: string;
  analysisTime: number;
}

export interface CodeAnalysisError {
  error: string;
  code: 'INVALID_URL' | 'FETCH_FAILED' | 'RATE_LIMITED' | 'TOO_LARGE' | 'NOT_FOUND' | 'ANALYSIS_FAILED';
}

export type RepoApiResponse = CodeAnalysisResult | CombinedAnalysisResult | CodeAnalysisError;

export function isCodeAnalysisError(r: unknown): r is CodeAnalysisError {
  return typeof r === 'object' && r !== null && 'error' in r && 'code' in r;
}

export function isCombinedAnalysisResult(r: unknown): r is CombinedAnalysisResult {
  return typeof r === 'object' && r !== null && 'websiteResult' in r && 'codeResult' in r;
}
