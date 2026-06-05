import type { RepoFile, CodeDetectedPattern } from '@/types/github';

function extractClassStrings(content: string): string[] {
  const results: string[] = [];
  // Match className="..." and className={`...`} and cn("...") patterns
  const patterns = [
    /className=["']([^"']+)["']/g,
    /className=\{`([^`]+)`\}/g,
    /cn\(["']([^"']+)["']\)/g,
    /clsx\(["']([^"']+)["']\)/g,
  ];
  for (const p of patterns) {
    let m: RegExpExecArray | null;
    while ((m = p.exec(content)) !== null) {
      results.push(m[1]);
    }
  }
  return results;
}

function normalizeClasses(raw: string): string {
  return raw.trim().split(/\s+/).sort().join(' ');
}

function extractTailwindCombinations(classStr: string, minTokens = 4): string[] {
  const tokens = classStr.trim().split(/\s+/).filter((t) => !t.includes('${'));
  if (tokens.length < minTokens) return [];
  // Create overlapping windows of 4-6 tokens
  const combos: string[] = [];
  for (let w = 4; w <= Math.min(6, tokens.length); w++) {
    for (let i = 0; i + w <= tokens.length; i++) {
      combos.push(tokens.slice(i, i + w).sort().join(' '));
    }
  }
  return combos;
}

const COMMON_LAYOUT_COMBOS = [
  'bg-background border rounded-xl shadow-sm',
  'flex items-center justify-between',
  'flex flex-col gap-4',
  'flex flex-col items-center text-center',
  'grid gap-6',
  'grid grid-cols-3 gap-6',
  'rounded-lg border p-6',
  'text-muted-foreground text-sm',
  'font-semibold text-lg tracking-tight',
  'text-4xl font-bold tracking-tighter',
];

export function detectTailwindRepetition(files: RepoFile[]): CodeDetectedPattern {
  const jsxFiles = files.filter((f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx') || f.path.endsWith('.ts') || f.path.endsWith('.js'));

  const comboFreq = new Map<string, number>();
  const exactFreq = new Map<string, number>();
  let totalClassStrings = 0;

  for (const file of jsxFiles) {
    const classStrings = extractClassStrings(file.content);
    totalClassStrings += classStrings.length;

    for (const raw of classStrings) {
      // Track exact normalized class strings
      const normalized = normalizeClasses(raw);
      if (normalized.split(' ').length >= 4) {
        exactFreq.set(normalized, (exactFreq.get(normalized) ?? 0) + 1);
      }
      // Track combinations
      for (const combo of extractTailwindCombinations(raw)) {
        comboFreq.set(combo, (comboFreq.get(combo) ?? 0) + 1);
      }
    }
  }

  // Find exact class strings repeated 3+ times
  const repeatedExact = [...exactFreq.entries()]
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a);

  // Find high-frequency combos (5+ occurrences)
  const highFreqCombos = [...comboFreq.entries()]
    .filter(([, count]) => count >= 5)
    .sort(([, a], [, b]) => b - a);

  const detected = repeatedExact.length > 0 || highFreqCombos.length >= 5;
  if (!detected) {
    return {
      id: 'tailwind-repetition',
      name: 'Tailwind Utility Repetition',
      description: 'Excessive reuse of identical Tailwind utility class combinations',
      detected: false,
      score: 0,
      maxScore: 10,
      evidence: [],
      details: { repeatedCombos: 0, totalClassStrings },
    };
  }

  const evidence: string[] = [];

  for (const [cls, count] of repeatedExact.slice(0, 4)) {
    const short = cls.length > 60 ? cls.slice(0, 57) + '…' : cls;
    evidence.push(`"${short}" repeated ${count}× across files`);
  }

  if (highFreqCombos.length >= 5) {
    evidence.push(`${highFreqCombos.length} Tailwind class combinations appear 5+ times each`);
  }

  // Check against known AI boilerplate combos
  let boilerplateHits = 0;
  for (const known of COMMON_LAYOUT_COMBOS) {
    const norm = normalizeClasses(known);
    if ((comboFreq.get(norm) ?? 0) >= 3) boilerplateHits++;
  }
  if (boilerplateHits > 0) {
    evidence.push(`${boilerplateHits} commonly-generated Tailwind patterns detected (e.g. rounded-xl border bg-background shadow-sm)`);
  }

  const score = Math.min(10, Math.round(
    repeatedExact.length * 1.5 + highFreqCombos.length * 0.4 + boilerplateHits * 1.5,
  ));

  return {
    id: 'tailwind-repetition',
    name: 'Tailwind Utility Repetition',
    description: 'Excessive reuse of identical Tailwind utility class combinations',
    detected: true,
    score,
    maxScore: 10,
    evidence,
    details: { repeatedCombos: repeatedExact.length, highFreqCombos: highFreqCombos.length, boilerplateHits, totalClassStrings },
  };
}
