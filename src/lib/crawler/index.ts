import * as cheerio from 'cheerio';

export interface CrawlResult {
  html: string;
  screenshot: string | null;
  finalUrl: string;
  crawlTime: number;
  httpStatus: number;
  error?: string;
}

export interface MultiPageCrawlResult {
  pages: Array<{
    url: string;
    pageType: string;
    html: string;
    screenshot: string | null;
    crawlTime: number;
  }>;
  totalCrawlTime: number;
}

// ─── URL helpers ─────────────────────────────────────────────────────────────

export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  try {
    return new URL(url).href;
  } catch {
    throw new Error(`Invalid URL: ${input}`);
  }
}

function cleanUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    u.hash = '';
    // Drop query strings — most landing pages don't need them
    u.search = '';
    // Normalize trailing slash
    if (u.pathname !== '/' && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href;
  } catch {
    return null;
  }
}

// ─── Page-type detection from URL path ───────────────────────────────────────

export function detectPageType(url: string): string {
  const path = new URL(url).pathname.toLowerCase();
  if (path === '/' || path === '') return 'home';
  if (/\/(about|who-we-are|our-story|company|team)/.test(path)) return 'about';
  if (/\/(services|solutions|offerings|what-we-do)/.test(path)) return 'services';
  if (/\/(features|product|platform|how-it-works|capabilities)/.test(path)) return 'features';
  if (/\/(pricing|plans|packages|subscription)/.test(path)) return 'pricing';
  if (/\/(industries|sectors|verticals|use-cases)/.test(path)) return 'industries';
  if (/\/(contact|get-started|get-in-touch|book|demo)/.test(path)) return 'contact';
  if (/\/(customers|clients|case-studies|portfolio|work)/.test(path)) return 'case studies';
  if (/\/(why|why-us|why-choose)/.test(path)) return 'why us';
  // Fallback: last meaningful path segment
  const segment = path.split('/').filter(Boolean).pop() || 'page';
  return segment.replace(/-/g, ' ');
}

// ─── Internal link extraction & ranking ──────────────────────────────────────

const SKIP_PATTERNS = [
  /\/(blog|news|press|articles?|posts?|updates?|changelog|resources?|docs?|documentation|api|legal|privacy|terms|cookies|careers?|jobs?|sitemap|rss|feed|login|signin|signup|register|dashboard|admin|account|cdn-cgi)/i,
  /\.(pdf|zip|png|jpg|jpeg|gif|svg|ico|webp|mp4|mp3|csv|xlsx?|docx?)$/i,
];

// Pages we actively want — checked in order, first match wins the priority rank
const PRIORITY_PATHS = [
  /\/(about|who-we-are|our-story)/i,
  /\/(services|solutions|offerings)/i,
  /\/(features|product|platform|how-it-works)/i,
  /\/(pricing|plans)/i,
  /\/(industries|use-cases)/i,
  /\/(why|why-us)/i,
  /\/(customers|case-studies|portfolio)/i,
  /\/(contact|get-started|book)/i,
];

function priorityScore(url: string): number {
  const path = new URL(url).pathname;
  const idx = PRIORITY_PATHS.findIndex((p) => p.test(path));
  return idx === -1 ? PRIORITY_PATHS.length : idx; // lower = higher priority
}

export function extractInternalLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const $ = cheerio.load(html);
  const seen = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    const cleaned = cleanUrl(href, baseUrl);
    if (!cleaned) return;

    const u = new URL(cleaned);
    if (u.hostname !== base.hostname) return; // external
    if (u.pathname === base.pathname) return;  // same page
    if (SKIP_PATTERNS.some((p) => p.test(cleaned))) return;
    seen.add(cleaned);
  });

  return Array.from(seen).sort((a, b) => priorityScore(a) - priorityScore(b));
}

// ─── Single-page crawl (reused internally) ───────────────────────────────────

interface CrawlPageOptions {
  takeScreenshot?: boolean;
  settleMs?: number;
  networkIdleMs?: number;
  gotoTimeoutMs?: number;
}

async function crawlPage(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof import('playwright')['chromium']['launch']>>['newContext']>>['newPage'] extends (...a: never[]) => Promise<infer P> ? P : never,
  url: string,
  options: CrawlPageOptions = {},
): Promise<{ html: string; screenshot: string | null; crawlTime: number; httpStatus: number }> {
  const {
    takeScreenshot = true,
    settleMs = 800,
    networkIdleMs = 3000,
    gotoTimeoutMs = 30000,
  } = options;

  const t = Date.now();
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: gotoTimeoutMs });
  const httpStatus = response?.status() ?? 200;
  await page.waitForTimeout(settleMs);
  try { await page.waitForLoadState('networkidle', { timeout: networkIdleMs }); } catch { /* ok */ }

  let screenshot: string | null = null;
  if (takeScreenshot) {
    try {
      const buf = await page.screenshot({
        type: 'jpeg',
        quality: 50,
        clip: { x: 0, y: 0, width: 800, height: 600 },
      });
      screenshot = `data:image/jpeg;base64,${buf.toString('base64')}`;
    } catch { /* continue without screenshot */ }
  }

  const html = await page.content();
  return { html, screenshot, crawlTime: Date.now() - t, httpStatus };
}

// ─── Browser launcher ────────────────────────────────────────────────────────
// On Vercel, Playwright's bundled browser isn't available at runtime.
// @sparticuz/chromium ships a serverless-compatible binary inside the package
// itself, so it gets traced and deployed with the function.

async function launchBrowser() {
  // Serverless platforms (Vercel, Netlify) have no installed browser — use bundled binary
  if (process.env.VERCEL || process.env.NETLIFY) {
    const { default: chromium } = await import('@sparticuz/chromium');
    const { chromium: pw } = await import('playwright-core');
    return pw.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  // Railway / local: full container, browsers installed via playwright install
  const { chromium } = await import('playwright');
  return chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--disable-extensions',
      '--disable-background-networking',
    ],
  });
}

// ─── Public API: single page ──────────────────────────────────────────────────

export async function crawlWebsite(url: string): Promise<CrawlResult> {
  const startTime = Date.now();
  let browser;
  try {
    browser = await launchBrowser();
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    await page.route('**/*.{woff,woff2,ttf,otf,eot}', (r) => r.abort());

    const result = await crawlPage(page as never, url);
    return { ...result, finalUrl: page.url(), crawlTime: Date.now() - startTime };
  } catch (err) {
    return { html: '', screenshot: null, finalUrl: url, crawlTime: Date.now() - startTime, httpStatus: 0, error: err instanceof Error ? err.message : 'Crawl failed' };
  } finally {
    await browser?.close();
  }
}

// ─── Public API: multi-page ───────────────────────────────────────────────────

export async function crawlMultiplePages(
  rootUrl: string,
  maxPages = 5,
): Promise<MultiPageCrawlResult> {
  const startTime = Date.now();
  let browser;

  try {
    browser = await launchBrowser();
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
    });

    // Block fonts site-wide for speed
    await ctx.route('**/*.{woff,woff2,ttf,otf,eot}', (r) => r.abort());

    // ── Step 1: crawl the root page ─────────────────────────────────────────
    const homePage = await ctx.newPage();
    const homeResult = await crawlPage(homePage as never, rootUrl);
    const finalHomeUrl = homePage.url();
    await homePage.close();

    // ── Step 2: extract and rank internal links ──────────────────────────────
    const links = extractInternalLinks(homeResult.html, finalHomeUrl);
    const selectedLinks = links.slice(0, maxPages - 1);

    // ── Step 3: crawl sub-pages 2 at a time ──────────────────────────────────
    // Concurrency=2 halves wall-clock time vs sequential while keeping peak
    // memory at ~350MB (browser + 2 tabs), safe under Render's 512MB limit.
    // Sub-pages use fast options: no screenshot (detectors only need HTML),
    // shorter settle/networkidle waits.
    const SUB_PAGE_OPTS: CrawlPageOptions = {
      takeScreenshot: true,   // keep for page-score thumbnails in the UI
      settleMs: 300,
      networkIdleMs: 1000,
      gotoTimeoutMs: 20000,
    };
    const CONCURRENCY = 2;
    const otherResults: Array<{ url: string; pageType: string; html: string; screenshot: string | null; crawlTime: number; httpStatus: number }> = [];
    for (let i = 0; i < selectedLinks.length; i += CONCURRENCY) {
      const batch = selectedLinks.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (link) => {
          const p = await ctx.newPage();
          try {
            const r = await crawlPage(p as never, link, SUB_PAGE_OPTS);
            return { url: link, pageType: detectPageType(link), ...r };
          } catch {
            return { url: link, pageType: detectPageType(link), html: '', screenshot: null, crawlTime: 0, httpStatus: 0 };
          } finally {
            await p.close();
          }
        }),
      );
      otherResults.push(...batchResults);
    }

    const pages = [
      { url: finalHomeUrl, pageType: 'home', ...homeResult },
      ...otherResults,
    ].filter((p) => p.html.length > 500); // drop pages that failed to load

    return { pages, totalCrawlTime: Date.now() - startTime };
  } catch {
    // Fallback: return empty so caller can decide
    return { pages: [], totalCrawlTime: Date.now() - startTime };
  } finally {
    await browser?.close();
  }
}
