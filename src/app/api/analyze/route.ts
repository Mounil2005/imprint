import { NextRequest, NextResponse } from 'next/server';
import { crawlWebsite, crawlMultiplePages, normalizeUrl } from '@/lib/crawler';
import { analyzeWebsite, analyzeMultiplePages } from '@/lib/analyzer';
import type { AnalysisError } from '@/types';

export const maxDuration = 120;

// ─── Map raw Playwright / network errors to friendly messages ─────────────────

function humanizeError(raw: string): string {
  const r = raw.toLowerCase();
  if (/err_name_not_resolved|getaddrinfo|ns_error_unknown_host|no such host|could not resolve/.test(r))
    return 'Domain not found — check the URL is spelled correctly';
  if (/err_connection_refused|econnrefused/.test(r))
    return 'Connection refused — the site may be down or blocking automated requests';
  if (/err_connection_timed_out|timed out|timeout|err_timed_out/.test(r))
    return 'Connection timed out — the site took too long to respond';
  if (/err_too_many_redirects/.test(r))
    return 'Redirect loop detected — the URL keeps redirecting to itself';
  if (/err_ssl|ssl_error|certificate|ssl_protocol/.test(r))
    return 'SSL certificate error — the site has an HTTPS configuration problem';
  if (/err_blocked_by_client|err_blocked_by_response/.test(r))
    return 'Request blocked — this site is blocking automated access';
  if (/err_internet_disconnected/.test(r))
    return 'No internet connection available on the server';
  if (/context.*destroyed|browser.*closed|target.*closed/.test(r))
    return 'Browser session interrupted — please try again';
  if (/net::err/.test(r))
    return 'Network error loading the site — check the URL and try again';
  return 'Could not reach the website — check the URL and try again';
}

function httpStatusError(status: number): string | null {
  if (status === 404) return 'Page not found (404) — the URL may be incorrect or the page may have been removed';
  if (status === 403) return 'Access denied (403) — this site is blocking automated requests';
  if (status === 401) return 'Authentication required (401) — this page requires a login';
  if (status === 410) return 'Page permanently removed (410) — this URL no longer exists';
  if (status >= 500) return `Server error on the target site (${status}) — try again later`;
  if (status === 0) return null; // 0 = crawl threw before getting a response, error field has the message
  return null;
}

// ─── Soft 404 detection ───────────────────────────────────────────────────────
// Some sites return 200 but serve a "not found" page. Check title/h1 for common
// 404-page patterns before running the full analysis.

function isSoft404(html: string): boolean {
  const lower = html.toLowerCase();
  // Check <title>
  const titleMatch = lower.match(/<title[^>]*>([^<]{0,120})<\/title>/);
  const title = titleMatch?.[1] ?? '';
  if (/\b(404|not found|page not found|doesn.t exist|no longer exists)\b/.test(title)) return true;
  // Check first h1
  const h1Match = lower.match(/<h1[^>]*>([^<]{0,120})<\/h1>/);
  const h1 = h1Match?.[1] ?? '';
  if (/\b(404|page not found|not found|oops|uh.?oh|something went wrong)\b/.test(h1)) return true;
  return false;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { url?: string; mode?: 'single' | 'multi' };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<AnalysisError>({ error: 'Invalid request body', code: 'INVALID_URL' }, { status: 400 });
  }

  const rawUrl = body.url?.trim();
  const mode = body.mode === 'multi' ? 'multi' : 'single';

  if (!rawUrl) {
    return NextResponse.json<AnalysisError>({ error: 'URL is required', code: 'INVALID_URL' }, { status: 400 });
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeUrl(rawUrl);
  } catch {
    return NextResponse.json<AnalysisError>({ error: `Invalid URL: ${rawUrl}`, code: 'INVALID_URL' }, { status: 400 });
  }

  const TIMEOUT_MS = mode === 'multi' ? 110_000 : 60_000;
  const timeoutSignal = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Analysis timed out — the site took too long to respond')), TIMEOUT_MS),
  );

  try {
    if (mode === 'multi') {
      const multiResult = await Promise.race([crawlMultiplePages(normalizedUrl, 5), timeoutSignal]);

      if (multiResult.pages.length === 0) {
        return NextResponse.json<AnalysisError>(
          { error: 'Could not load any pages from this website', code: 'CRAWL_FAILED' },
          { status: 422 },
        );
      }

      const result = await analyzeMultiplePages(multiResult.pages, multiResult.totalCrawlTime);
      return NextResponse.json(result);
    } else {
      const crawlResult = await Promise.race([crawlWebsite(normalizedUrl), timeoutSignal]);

      // ── Classify the failure type ────────────────────────────────────────
      if (crawlResult.error && !crawlResult.html) {
        return NextResponse.json<AnalysisError>(
          { error: humanizeError(crawlResult.error), code: 'CRAWL_FAILED' },
          { status: 422 },
        );
      }

      const statusError = httpStatusError(crawlResult.httpStatus);
      if (statusError) {
        return NextResponse.json<AnalysisError>(
          { error: statusError, code: 'CRAWL_FAILED' },
          { status: 422 },
        );
      }

      if (!crawlResult.html || crawlResult.html.length < 100) {
        return NextResponse.json<AnalysisError>(
          { error: 'Could not extract content from the website — the page may be empty or require JavaScript', code: 'CRAWL_FAILED' },
          { status: 422 },
        );
      }

      if (isSoft404(crawlResult.html)) {
        return NextResponse.json<AnalysisError>(
          { error: 'The page appears to be a "not found" error page — check the URL is correct', code: 'CRAWL_FAILED' },
          { status: 422 },
        );
      }

      const result = await analyzeWebsite(
        crawlResult.finalUrl,
        crawlResult.html,
        crawlResult.screenshot,
        crawlResult.crawlTime,
      );
      return NextResponse.json(result);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return NextResponse.json<AnalysisError>({ error: humanizeError(message), code: 'ANALYSIS_FAILED' }, { status: 500 });
  }
}
