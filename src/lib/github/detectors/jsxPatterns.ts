import type { RepoFile, CodeDetectedPattern } from '@/types/github';

// Extract top-level children of each JSX element block
function extractChildSequences(content: string): string[][] {
  const sequences: string[][] = [];

  // Find sections: look for top-level divs/sections with multiple children
  // Strategy: find patterns of 3+ consecutive JSX elements at the same indentation
  const lines = content.split('\n');
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Match opening JSX tags (component or element)
    const tagMatch = trimmed.match(/^<([A-Z][a-zA-Z0-9]*|div|section|article|span|p|h[1-6]|ul|li|img|svg)[\s/>]/);
    if (tagMatch) {
      current.push(tagMatch[1]);
      if (current.length >= 3) {
        sequences.push([...current]);
      }
    } else if (trimmed.startsWith('</') || trimmed === '{') {
      if (current.length >= 3) {
        sequences.push([...current]);
      }
      current = [];
    }
  }

  return sequences;
}

function sequenceKey(seq: string[]): string {
  return seq.slice(0, 5).join(' → ');
}

const ICON_NAMES = new Set(['Icon', 'svg', 'img', 'CheckIcon', 'ArrowIcon', 'StarIcon', 'LucideIcon', 'Check', 'Star', 'Arrow', 'ChevronRight']);
const HEADING_NAMES = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'Title', 'Heading', 'CardTitle']);
const DESC_NAMES = new Set(['p', 'span', 'Description', 'CardDescription', 'Text', 'Paragraph', 'Body']);
const BUTTON_NAMES = new Set(['Button', 'button', 'Link', 'a', 'CTA', 'CallToAction']);

function isIconLike(tag: string) { return ICON_NAMES.has(tag) || tag.toLowerCase().includes('icon'); }
function isHeadingLike(tag: string) { return HEADING_NAMES.has(tag); }
function isDescLike(tag: string) { return DESC_NAMES.has(tag); }
function isButtonLike(tag: string) { return BUTTON_NAMES.has(tag); }

function detectPatternInSequence(seq: string[]): string | null {
  // Icon → Heading → Description
  for (let i = 0; i + 2 < seq.length; i++) {
    if (isIconLike(seq[i]) && isHeadingLike(seq[i + 1]) && isDescLike(seq[i + 2])) {
      return 'Icon → Heading → Description';
    }
    if (isHeadingLike(seq[i]) && isDescLike(seq[i + 1]) && isButtonLike(seq[i + 2])) {
      return 'Heading → Description → Button';
    }
    if (isIconLike(seq[i]) && isHeadingLike(seq[i + 1]) && isButtonLike(seq[i + 2])) {
      return 'Icon → Heading → Button';
    }
  }
  for (let i = 0; i + 3 < seq.length; i++) {
    if (isIconLike(seq[i]) && isHeadingLike(seq[i + 1]) && isDescLike(seq[i + 2]) && isButtonLike(seq[i + 3])) {
      return 'Icon → Heading → Description → Button';
    }
  }
  return null;
}

export function detectJsxPatterns(files: RepoFile[]): CodeDetectedPattern {
  const jsxFiles = files.filter((f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));

  const patternCounts = new Map<string, number>();
  const patternFiles = new Map<string, string[]>();

  for (const file of jsxFiles) {
    const sequences = extractChildSequences(file.content);
    const seenInFile = new Set<string>();

    for (const seq of sequences) {
      // Check named patterns
      const named = detectPatternInSequence(seq);
      if (named && !seenInFile.has(named)) {
        seenInFile.add(named);
        patternCounts.set(named, (patternCounts.get(named) ?? 0) + 1);
        const existing = patternFiles.get(named) ?? [];
        existing.push(file.path.split('/').pop()!.replace(/\.(tsx|jsx)$/, ''));
        patternFiles.set(named, existing);
      }

      // Check frequency of repeated child sequences
      if (seq.length >= 3) {
        const key = sequenceKey(seq);
        patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1);
      }
    }
  }

  // Filter to patterns repeated 3+ times
  const repeated = [...patternCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a);

  if (repeated.length === 0) {
    return {
      id: 'jsx-patterns',
      name: 'Repeated JSX Patterns',
      description: 'Recurring JSX tree structures reused across multiple components',
      detected: false,
      score: 0,
      maxScore: 15,
      evidence: [],
      details: { patternCount: 0, topPattern: null },
    };
  }

  const evidence: string[] = [];
  for (const [pattern, count] of repeated.slice(0, 5)) {
    const inFiles = patternFiles.get(pattern);
    if (inFiles && inFiles.length > 0) {
      evidence.push(`"${pattern}" pattern reused in ${inFiles.length} components: ${inFiles.slice(0, 3).join(', ')}`);
    } else {
      evidence.push(`"${pattern}" element sequence appears ${count} times across components`);
    }
  }

  const topPattern = repeated[0][0];
  const totalRepetitions = repeated.reduce((s, [, c]) => s + c, 0);

  const score = Math.min(15, Math.round(repeated.length * 2 + totalRepetitions / 4));

  return {
    id: 'jsx-patterns',
    name: 'Repeated JSX Patterns',
    description: 'Recurring JSX tree structures reused across multiple components',
    detected: true,
    score,
    maxScore: 15,
    evidence,
    details: { patternCount: repeated.length, topPattern, totalRepetitions },
  };
}
