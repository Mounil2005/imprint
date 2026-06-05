import type { RepoFile, CodeDetectedPattern } from '@/types/github';

// Patterns matching array.map() in JSX rendering context
const SECTION_DATA_NAMES = [
  'features', 'benefits', 'services', 'stats', 'testimonials', 'pricing',
  'plans', 'team', 'faq', 'items', 'steps', 'reasons', 'products',
  'categories', 'links', 'navItems', 'menuItems', 'cards', 'posts',
  'projects', 'clients', 'partners', 'icons', 'perks', 'highlights',
  'tabs', 'sections', 'options', 'packages', 'tiers',
];

function detectMapUsages(content: string): Array<{ name: string; context: string }> {
  const found: Array<{ name: string; context: string }> = [];

  for (const name of SECTION_DATA_NAMES) {
    // Match: name.map(, NAME.map(, name?.map(
    const pattern = new RegExp(`\\b${name}[?!]?\\.map\\(`, 'gi');
    const matches = content.match(pattern);
    if (matches) {
      found.push({ name, context: 'JSX rendering' });
    }
  }

  // Also catch generic data.map( or list.map( patterns in JSX return blocks
  const genericPattern = /(?:const|let|var)\s+\[([a-zA-Z]+)\]\s*=.*;\s*[\s\S]{0,200}?\1\.map\(/g;
  let m: RegExpExecArray | null;
  while ((m = genericPattern.exec(content)) !== null) {
    const name = m[1];
    if (!SECTION_DATA_NAMES.includes(name.toLowerCase())) {
      found.push({ name, context: 'destructured state' });
    }
  }

  return found;
}

function countTotalMapCalls(content: string): number {
  return (content.match(/\.map\s*\(/g) ?? []).length;
}

export function detectMapOveruse(files: RepoFile[]): CodeDetectedPattern {
  const jsxFiles = files.filter((f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));

  const sectionMapsByFile = new Map<string, string[]>();
  let totalMapCalls = 0;
  let totalSectionMaps = 0;
  const sectionNameCounts = new Map<string, number>();

  for (const file of jsxFiles) {
    const allMaps = countTotalMapCalls(file.content);
    totalMapCalls += allMaps;

    const sectionMaps = detectMapUsages(file.content);
    if (sectionMaps.length > 0) {
      const filename = file.path.split('/').pop()!.replace(/\.(tsx|jsx)$/, '');
      sectionMapsByFile.set(filename, sectionMaps.map((m) => m.name));
      totalSectionMaps += sectionMaps.length;

      for (const m of sectionMaps) {
        sectionNameCounts.set(m.name.toLowerCase(), (sectionNameCounts.get(m.name.toLowerCase()) ?? 0) + 1);
      }
    }
  }

  const filesWithSectionMaps = sectionMapsByFile.size;
  const detected = totalSectionMaps >= 4 || filesWithSectionMaps >= 3;

  if (!detected) {
    return {
      id: 'map-overuse',
      name: 'Map-Based Rendering Overuse',
      description: 'Excessive use of array.map() to generate sections, replacing diverse layouts with data-driven repetition',
      detected: false,
      score: 0,
      maxScore: 10,
      evidence: [],
      details: { totalSectionMaps: 0, filesWithSectionMaps: 0 },
    };
  }

  const evidence: string[] = [];

  evidence.push(`${totalSectionMaps} section-data map() calls detected across ${filesWithSectionMaps} components`);

  const topNames = [...sectionNameCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, count]) => `${name}.map() ×${count}`);
  if (topNames.length > 0) {
    evidence.push(`Most common: ${topNames.join(', ')}`);
  }

  // Show files with highest map usage
  const topFiles = [...sectionMapsByFile.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 3);
  for (const [filename, names] of topFiles) {
    if (names.length >= 2) {
      evidence.push(`${filename}: ${names.join(', ')} — ${names.length} section arrays mapped`);
    }
  }

  if (totalMapCalls > 0) {
    const ratio = Math.round((totalSectionMaps / totalMapCalls) * 100);
    if (ratio >= 30) {
      evidence.push(`${ratio}% of all .map() calls are section-data renders`);
    }
  }

  const score = Math.min(10, Math.round(totalSectionMaps * 0.8 + filesWithSectionMaps * 0.5));

  return {
    id: 'map-overuse',
    name: 'Map-Based Rendering Overuse',
    description: 'Excessive use of array.map() to generate sections, replacing diverse layouts with data-driven repetition',
    detected: true,
    score,
    maxScore: 10,
    evidence,
    details: { totalSectionMaps, filesWithSectionMaps, totalMapCalls, topDataNames: [...sectionNameCounts.keys()].slice(0, 8) },
  };
}
