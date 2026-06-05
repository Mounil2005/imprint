import type { RepoFile, CodeDetectedPattern } from '@/types/github';

interface FolderCheck {
  pattern: string;
  label: string;
  points: number;
}

const AI_FOLDER_PATTERNS: FolderCheck[] = [
  { pattern: '/app/', label: 'app/ (Next.js App Router)', points: 1 },
  { pattern: '/components/', label: 'components/', points: 1 },
  { pattern: '/components/ui/', label: 'components/ui/ (shadcn)', points: 2 },
  { pattern: '/hooks/', label: 'hooks/', points: 1 },
  { pattern: '/lib/', label: 'lib/', points: 1 },
  { pattern: '/utils/', label: 'utils/', points: 1 },
  { pattern: '/constants/', label: 'constants/', points: 1 },
  { pattern: '/types/', label: 'types/', points: 1 },
  { pattern: '/public/', label: 'public/', points: 0 }, // neutral
  { pattern: '/styles/', label: 'styles/', points: 1 },
];

// Patterns very common in AI-scaffolded projects
const HIGH_CONFIDENCE_COMBO = [
  '/components/ui/',
  '/hooks/',
  '/lib/',
];

export function detectFolderStructure(files: RepoFile[]): CodeDetectedPattern {
  const allPaths = files.map((f) => '/' + f.path);

  const presentFolders: string[] = [];
  let points = 0;

  for (const check of AI_FOLDER_PATTERNS) {
    const present = allPaths.some((p) => p.includes(check.pattern));
    if (present) {
      presentFolders.push(check.label);
      points += check.points;
    }
  }

  const highConfidenceMatch = HIGH_CONFIDENCE_COMBO.every((pattern) =>
    allPaths.some((p) => p.includes(pattern)),
  );

  if (highConfidenceMatch) points += 2;

  // Normalize to 0-5
  const score = Math.min(5, Math.round(points * 5 / 9));
  const detected = score >= 2;

  if (!detected) {
    return {
      id: 'folder-structure',
      name: 'AI-Template Folder Structure',
      description: 'Project layout matching common AI-scaffolded Next.js templates',
      detected: false,
      score: 0,
      maxScore: 5,
      evidence: [],
      details: { matchedFolders: presentFolders.length, highConfidenceMatch },
    };
  }

  const evidence: string[] = [];
  evidence.push(`Detected ${presentFolders.length} template-standard folders: ${presentFolders.join(', ')}`);

  if (highConfidenceMatch) {
    evidence.push('components/ui/ + hooks/ + lib/ combination matches common AI project scaffolding (e.g. create-next-app with shadcn)');
  }

  return {
    id: 'folder-structure',
    name: 'AI-Template Folder Structure',
    description: 'Project layout matching common AI-scaffolded Next.js templates',
    detected: true,
    score,
    maxScore: 5,
    evidence,
    details: { matchedFolders: presentFolders.length, folders: presentFolders, highConfidenceMatch },
  };
}
