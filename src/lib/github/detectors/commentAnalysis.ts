import type { RepoFile, CodeDetectedPattern } from '@/types/github';

const GENERIC_COMMENT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\/\/\s*Main component/gi, label: '// Main component' },
  { pattern: /\/\/\s*Handle form submission/gi, label: '// Handle form submission' },
  { pattern: /\/\/\s*Render (the )?(content|section|page|component|layout)/gi, label: '// Render content section' },
  { pattern: /\/\/\s*Feature card component/gi, label: '// Feature card component' },
  { pattern: /\/\/\s*TODO:\s*Add (error handling|loading|validation|types)/gi, label: '// TODO: Add error handling' },
  { pattern: /\/\/\s*Returns? (the |a )?[A-Z]/gi, label: '// Returns the ...' },
  { pattern: /\/\/\s*This (component|function|hook|file) /gi, label: '// This component ...' },
  { pattern: /\/\/\s*Component (that |for |to )/gi, label: '// Component that ...' },
  { pattern: /\/\/\s*Helper (function|to|for)/gi, label: '// Helper function' },
  { pattern: /\/\/\s*Custom hook/gi, label: '// Custom hook' },
  { pattern: /\/\/\s*Fetch (the |all )?data/gi, label: '// Fetch data' },
  { pattern: /\/\/\s*Initialize (state|the|a)/gi, label: '// Initialize state' },
  { pattern: /\/\/\s*Handle (click|submit|change|error|loading)/gi, label: '// Handle click/submit' },
  { pattern: /\/\/\s*Update (state|the)/gi, label: '// Update state' },
  { pattern: /\/\/\s*Export (default )?(the )?/gi, label: '// Export the component' },
  { pattern: /\/\*\*\s*\n\s*\*\s*@(param|returns|description)/gm, label: 'Generic JSDoc block' },
  { pattern: /\/\/\s*Add your/gi, label: '// Add your ...' },
  { pattern: /\/\/\s*Replace (with|this)/gi, label: '// Replace with ...' },
  { pattern: /\/\/\s*Insert (your|here)/gi, label: '// Insert here' },
];

export function detectCommentAnalysis(files: RepoFile[]): CodeDetectedPattern {
  const sourceFiles = files.filter((f) =>
    f.path.endsWith('.ts') || f.path.endsWith('.tsx') ||
    f.path.endsWith('.js') || f.path.endsWith('.jsx'),
  );

  const matchCounts = new Map<string, number>();
  let totalGenericComments = 0;
  let totalComments = 0;
  const affectedFiles: string[] = [];

  for (const file of sourceFiles) {
    // Count total comments
    const commentLines = file.content.split('\n').filter(
      (line) => line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*'),
    );
    totalComments += commentLines.length;

    let fileGenericCount = 0;
    for (const { pattern, label } of GENERIC_COMMENT_PATTERNS) {
      const matches = file.content.match(pattern);
      if (matches) {
        matchCounts.set(label, (matchCounts.get(label) ?? 0) + matches.length);
        fileGenericCount += matches.length;
      }
    }

    if (fileGenericCount > 0) {
      totalGenericComments += fileGenericCount;
      affectedFiles.push(file.path.split('/').pop()!);
    }
  }

  const detected = totalGenericComments >= 3;

  if (!detected) {
    return {
      id: 'comment-analysis',
      name: 'Generic Comment Detection',
      description: 'Generic, unhelpful comments that commonly appear in AI-generated code',
      detected: false,
      score: 0,
      maxScore: 5,
      evidence: [],
      details: { totalGenericComments: 0, totalComments, affectedFiles: 0 },
    };
  }

  const evidence: string[] = [];
  evidence.push(`${totalGenericComments} generic comments detected across ${affectedFiles.length} files`);

  const top = [...matchCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);
  for (const [label, count] of top) {
    evidence.push(`"${label}" pattern found ${count} time${count > 1 ? 's' : ''}`);
  }

  const genericRatio = totalComments > 0 ? totalGenericComments / totalComments : 0;
  if (genericRatio > 0.4) {
    evidence.push(`${Math.round(genericRatio * 100)}% of comments are generic/uninformative`);
  }

  const score = Math.min(5, Math.round(totalGenericComments / 3));

  return {
    id: 'comment-analysis',
    name: 'Generic Comment Detection',
    description: 'Generic, unhelpful comments that commonly appear in AI-generated code',
    detected: true,
    score,
    maxScore: 5,
    evidence,
    details: { totalGenericComments, totalComments, affectedFiles: affectedFiles.length, genericRatio: Math.round(genericRatio * 100) },
  };
}
