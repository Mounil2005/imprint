import type { RepoFile, RepoFetchResult } from '@/types/github';

const IGNORE_PATHS = [
  'node_modules/',
  '.next/',
  'dist/',
  'build/',
  'coverage/',
  '.git/',
  'out/',
  '.cache/',
  '.turbo/',
  'vendor/',
  '__pycache__/',
  '.venv/',
];

const IGNORE_FILENAMES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  '.DS_Store',
  'bun.lockb',
  'bun.lock',
  'composer.lock',
  'Gemfile.lock',
]);

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.css', '.scss', '.sass', '.less',
  '.json',
  '.html', '.svelte', '.vue',
]);

const MAX_FILE_SIZE_BYTES = 150_000;
const MAX_FILES = 800;
const MAX_REPO_SIZE_KB = 50_000;
const FETCH_BATCH_SIZE = 25;
const FETCH_TIMEOUT_MS = 8_000;

function isIgnoredPath(path: string): boolean {
  for (const prefix of IGNORE_PATHS) {
    if (path.includes(prefix)) return true;
  }
  const filename = path.split('/').pop() ?? '';
  return IGNORE_FILENAMES.has(filename);
}

function isSourceFile(path: string): boolean {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return false;
  return SOURCE_EXTENSIONS.has(path.slice(dot).toLowerCase());
}

function fileScore(path: string): number {
  if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 10;
  if (path.endsWith('.ts') || path.endsWith('.js')) return 8;
  if (path.endsWith('.css') || path.endsWith('.scss')) return 4;
  if (path.endsWith('.json')) return 2;
  return 1;
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const trimmed = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    const withProto = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProto);
    if (!parsed.hostname.includes('github.com')) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRepository(githubUrl: string): Promise<RepoFetchResult> {
  const start = Date.now();
  const parsed = parseGitHubUrl(githubUrl);

  if (!parsed) {
    return { owner: '', repo: '', branch: '', files: [], totalFiles: 0, fetchTime: 0, error: 'Invalid GitHub URL — must be github.com/owner/repo' };
  }

  const { owner, repo } = parsed;
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Imprint-CodeAnalyzer/1.0',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };

  // ── Step 1: repo metadata ───────────────────────────────────────────────────
  let repoRes: Response;
  try {
    repoRes = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  } catch {
    return { owner, repo, branch: '', files: [], totalFiles: 0, fetchTime: Date.now() - start, error: 'Could not reach GitHub API' };
  }

  if (repoRes.status === 404) {
    return { owner, repo, branch: '', files: [], totalFiles: 0, fetchTime: Date.now() - start, error: 'Repository not found or is private' };
  }
  if (repoRes.status === 403 || repoRes.status === 429) {
    return { owner, repo, branch: '', files: [], totalFiles: 0, fetchTime: Date.now() - start, error: 'GitHub API rate limit exceeded — please try again later' };
  }
  if (!repoRes.ok) {
    return { owner, repo, branch: '', files: [], totalFiles: 0, fetchTime: Date.now() - start, error: `GitHub API error: ${repoRes.status}` };
  }

  const repoInfo = await repoRes.json() as { default_branch?: string; size?: number };
  const branch = repoInfo.default_branch ?? 'main';
  const sizeKB = repoInfo.size ?? 0;

  if (sizeKB > MAX_REPO_SIZE_KB) {
    return { owner, repo, branch, files: [], totalFiles: 0, fetchTime: Date.now() - start, error: `Repository too large (${Math.round(sizeKB / 1024)}MB exceeds 50MB limit)` };
  }

  // ── Step 2: file tree ───────────────────────────────────────────────────────
  let treeRes: Response;
  try {
    treeRes = await fetchWithTimeout(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers },
    );
  } catch {
    return { owner, repo, branch, files: [], totalFiles: 0, fetchTime: Date.now() - start, error: 'Could not fetch repository file tree' };
  }

  if (!treeRes.ok) {
    return { owner, repo, branch, files: [], totalFiles: 0, fetchTime: Date.now() - start, error: `Failed to fetch file tree: ${treeRes.status}` };
  }

  const treeData = await treeRes.json() as {
    tree?: Array<{ type: string; path: string; size?: number }>;
  };

  // ── Step 3: filter and prioritize source files ──────────────────────────────
  const allBlobs = (treeData.tree ?? []).filter(
    (item) => item.type === 'blob' && !isIgnoredPath(item.path) && isSourceFile(item.path) && (item.size ?? 0) < MAX_FILE_SIZE_BYTES,
  );

  // Sort by relevance — tsx/jsx first, then ts/js, then others
  allBlobs.sort((a, b) => fileScore(b.path) - fileScore(a.path));

  const selectedBlobs = allBlobs.slice(0, MAX_FILES);
  const totalFiles = selectedBlobs.length;

  if (totalFiles === 0) {
    return { owner, repo, branch, files: [], totalFiles: 0, fetchTime: Date.now() - start, error: 'No source files found in repository' };
  }

  // ── Step 4: fetch file contents in batches ───────────────────────────────────
  const files: RepoFile[] = [];

  for (let i = 0; i < selectedBlobs.length; i += FETCH_BATCH_SIZE) {
    const batch = selectedBlobs.slice(i, i + FETCH_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;
        const res = await fetchWithTimeout(rawUrl);
        if (!res.ok) return null;
        const content = await res.text();
        return { path: item.path, content, size: item.size ?? content.length } satisfies RepoFile;
      }),
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        files.push(result.value);
      }
    }
  }

  return { owner, repo, branch, files, totalFiles, fetchTime: Date.now() - start };
}
