import type { RepoFetchResult, CodeAnalysisResult, CodeDetectedPattern } from '@/types/github';
import type { AnalysisResult } from '@/types';

import { detectComponentDuplication } from './detectors/componentDuplication';
import { detectGenericNaming } from './detectors/genericNaming';
import { detectJsxPatterns } from './detectors/jsxPatterns';
import { detectTailwindRepetition } from './detectors/tailwindRepetition';
import { detectShadcnUsage } from './detectors/shadcnUsage';
import { detectFolderStructure } from './detectors/folderStructure';
import { detectCommentAnalysis } from './detectors/commentAnalysis';
import { detectMapOveruse } from './detectors/mapOveruse';
import { detectSimilarityClusters } from './detectors/similarityClusters';
import { detectBoilerplateDetection } from './detectors/boilerplateDetection';

function runAllDetectors(repo: RepoFetchResult): CodeDetectedPattern[] {
  const { files } = repo;
  return [
    detectComponentDuplication(files),
    detectGenericNaming(files),
    detectJsxPatterns(files),
    detectTailwindRepetition(files),
    detectShadcnUsage(files),
    detectFolderStructure(files),
    detectCommentAnalysis(files),
    detectMapOveruse(files),
    detectSimilarityClusters(files),
    detectBoilerplateDetection(files),
  ];
}

export function analyzeRepository(repo: RepoFetchResult, repoUrl: string): CodeAnalysisResult {
  const start = Date.now();

  const patterns = runAllDetectors(repo);
  const totalScore = Math.min(100, patterns.reduce((s, p) => s + p.score, 0));

  return {
    repoUrl,
    owner: repo.owner,
    repo: repo.repo,
    score: totalScore,
    patterns,
    fileCount: repo.totalFiles,
    analyzedFileCount: repo.files.length,
    fetchTime: repo.fetchTime,
    analysisTime: Date.now() - start,
    timestamp: new Date().toISOString(),
  };
}

export function generateInterpretation(websiteScore: number, codeScore: number): string {
  const ws = websiteScore;
  const cs = codeScore;

  if (ws >= 75 && cs >= 75) {
    return 'Both the website design and codebase exhibit very strong patterns commonly found in AI-assisted development.';
  }
  if (ws >= 75 && cs < 40) {
    return 'The website shows high AI design patterns while the codebase appears more manually crafted.';
  }
  if (ws < 40 && cs >= 75) {
    return 'The website design appears more custom while the codebase exhibits strong AI-assisted code generation patterns.';
  }
  if (ws >= 60 && cs >= 60) {
    return 'Both the website and codebase show significant patterns commonly found in AI-assisted or vibe-coded projects.';
  }
  if (ws >= 50 && cs < 50) {
    return 'The website shows moderate AI design patterns while the codebase exhibits fewer code generation indicators.';
  }
  if (ws < 50 && cs >= 50) {
    return 'The website design shows low AI pattern usage while the codebase exhibits moderate code generation patterns.';
  }
  if (ws >= 50 || cs >= 50) {
    return 'The project shows mixed signals — some areas follow AI-assisted development patterns while others appear more custom.';
  }
  return 'Both the website and codebase show relatively low AI-assisted development pattern usage.';
}

export function combinedScore(websiteScore: number, codeScore: number): number {
  // Code analysis weighted slightly higher (60%) since it is more definitive
  return Math.round(websiteScore * 0.4 + codeScore * 0.6);
}

export function buildCombinedResult(
  websiteResult: AnalysisResult,
  codeResult: CodeAnalysisResult,
) {
  const ws = websiteResult.score;
  const cs = codeResult.score;
  const combined = combinedScore(ws, cs);

  return {
    websiteResult,
    codeResult,
    websiteScore: ws,
    codeScore: cs,
    combinedScore: combined,
    interpretation: generateInterpretation(ws, cs),
    timestamp: new Date().toISOString(),
    analysisTime: websiteResult.analysisTime + codeResult.analysisTime,
  };
}
