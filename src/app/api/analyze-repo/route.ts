import { NextRequest, NextResponse } from 'next/server';
import { fetchRepository, parseGitHubUrl } from '@/lib/github/fetcher';
import { analyzeRepository, buildCombinedResult } from '@/lib/github/analyzer';
import { crawlWebsite, crawlMultiplePages, normalizeUrl } from '@/lib/crawler';
import { analyzeWebsite, analyzeMultiplePages } from '@/lib/analyzer';
import type { CodeAnalysisError } from '@/types/github';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: {
    githubUrl?: string;
    websiteUrl?: string;
    websiteMode?: 'single' | 'multi';
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json<CodeAnalysisError>(
      { error: 'Invalid request body', code: 'ANALYSIS_FAILED' },
      { status: 400 },
    );
  }

  const rawGithubUrl = body.githubUrl?.trim();
  const rawWebsiteUrl = body.websiteUrl?.trim();
  const websiteMode = body.websiteMode === 'multi' ? 'multi' : 'single';

  if (!rawGithubUrl) {
    return NextResponse.json<CodeAnalysisError>(
      { error: 'GitHub repository URL is required', code: 'ANALYSIS_FAILED' },
      { status: 400 },
    );
  }

  if (!parseGitHubUrl(rawGithubUrl)) {
    return NextResponse.json<CodeAnalysisError>(
      { error: 'Invalid GitHub URL — expected github.com/owner/repo', code: 'INVALID_URL' },
      { status: 400 },
    );
  }

  // ── Combined mode: website + GitHub ─────────────────────────────────────────
  if (rawWebsiteUrl) {
    let normalizedWebsiteUrl: string;
    try {
      normalizedWebsiteUrl = normalizeUrl(rawWebsiteUrl);
    } catch {
      return NextResponse.json<CodeAnalysisError>(
        { error: `Invalid website URL: ${rawWebsiteUrl}`, code: 'INVALID_URL' },
        { status: 400 },
      );
    }

    try {
      // Run both analyses concurrently
      const [repoResult, websiteResult] = await Promise.allSettled([
        (async () => {
          const repo = await fetchRepository(rawGithubUrl);
          if (repo.error) throw new Error(repo.error);
          return analyzeRepository(repo, rawGithubUrl);
        })(),
        (async () => {
          if (websiteMode === 'multi') {
            const multiResult = await crawlMultiplePages(normalizedWebsiteUrl, 5);
            if (multiResult.pages.length === 0) throw new Error('Could not load any pages from this website');
            return analyzeMultiplePages(multiResult.pages, multiResult.totalCrawlTime);
          } else {
            const crawlResult = await crawlWebsite(normalizedWebsiteUrl);
            if (crawlResult.error && !crawlResult.html) throw new Error(`Failed to crawl website: ${crawlResult.error}`);
            if (!crawlResult.html || crawlResult.html.length < 100) throw new Error('Could not extract content from the website');
            return analyzeWebsite(crawlResult.finalUrl, crawlResult.html, crawlResult.screenshot, crawlResult.crawlTime);
          }
        })(),
      ]);

      // Surface any failures
      if (repoResult.status === 'rejected') {
        return NextResponse.json<CodeAnalysisError>(
          { error: `Repository analysis failed: ${repoResult.reason instanceof Error ? repoResult.reason.message : String(repoResult.reason)}`, code: 'FETCH_FAILED' },
          { status: 422 },
        );
      }
      if (websiteResult.status === 'rejected') {
        return NextResponse.json<CodeAnalysisError>(
          { error: `Website analysis failed: ${websiteResult.reason instanceof Error ? websiteResult.reason.message : String(websiteResult.reason)}`, code: 'FETCH_FAILED' },
          { status: 422 },
        );
      }

      const combined = buildCombinedResult(websiteResult.value, repoResult.value);
      return NextResponse.json(combined);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      return NextResponse.json<CodeAnalysisError>({ error: message, code: 'ANALYSIS_FAILED' }, { status: 500 });
    }
  }

  // ── GitHub-only mode ─────────────────────────────────────────────────────────
  try {
    const repo = await fetchRepository(rawGithubUrl);

    if (repo.error) {
      const code: CodeAnalysisError['code'] =
        repo.error.includes('not found') ? 'NOT_FOUND' :
        repo.error.includes('rate limit') ? 'RATE_LIMITED' :
        repo.error.includes('too large') ? 'TOO_LARGE' :
        'FETCH_FAILED';
      return NextResponse.json<CodeAnalysisError>({ error: repo.error, code }, { status: 422 });
    }

    if (repo.files.length === 0) {
      return NextResponse.json<CodeAnalysisError>(
        { error: 'No analyzable source files found in repository', code: 'FETCH_FAILED' },
        { status: 422 },
      );
    }

    const result = analyzeRepository(repo, rawGithubUrl);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json<CodeAnalysisError>({ error: message, code: 'ANALYSIS_FAILED' }, { status: 500 });
  }
}
