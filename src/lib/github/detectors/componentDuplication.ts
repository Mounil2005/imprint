import type { RepoFile, CodeDetectedPattern } from '@/types/github';

function extractJsxTags(content: string): string[] {
  const pattern = /<([A-Z][a-zA-Z0-9]*|[a-z]+(?:-[a-z]+)*)[\s/>]/g;
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content)) !== null) {
    tags.push(m[1]);
  }
  return tags;
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  sa.forEach((v) => { if (sb.has(v)) inter++; });
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

export function detectComponentDuplication(files: RepoFile[]): CodeDetectedPattern {
  const componentFiles = files.filter((f) => {
    const p = f.path.toLowerCase();
    return (p.includes('/components/') || p.startsWith('components/')) &&
      (p.endsWith('.tsx') || p.endsWith('.jsx'));
  });

  if (componentFiles.length < 3) {
    return noResult(componentFiles.length);
  }

  const fp = componentFiles.map((f) => ({
    name: f.path.split('/').pop()!.replace(/\.(tsx|jsx)$/, ''),
    path: f.path,
    tags: extractJsxTags(f.content),
  }));

  const pairs: Array<{ a: string; b: string; sim: number }> = [];

  for (let i = 0; i < fp.length; i++) {
    for (let j = i + 1; j < fp.length; j++) {
      const sim = jaccardSimilarity(fp[i].tags, fp[j].tags);
      if (sim >= 0.75) {
        pairs.push({ a: fp[i].name, b: fp[j].name, sim: Math.round(sim * 100) });
      }
    }
  }

  if (pairs.length === 0) return noResult(componentFiles.length);

  pairs.sort((a, b) => b.sim - a.sim);

  const duplicateComponents = new Set<string>();
  pairs.forEach((p) => { duplicateComponents.add(p.a); duplicateComponents.add(p.b); });

  const duplicationPct = Math.round((duplicateComponents.size / componentFiles.length) * 100);

  const evidence: string[] = [];
  for (const p of pairs.slice(0, 5)) {
    evidence.push(`${p.a} ↔ ${p.b} — ${p.sim}% structural similarity`);
  }
  if (duplicationPct >= 30) {
    evidence.push(`${duplicationPct}% of components exhibit near-identical structure (${duplicateComponents.size} of ${componentFiles.length})`);
  }
  if (pairs.length >= 5) {
    evidence.push(`${pairs.length} similar component pairs detected`);
  }

  const score = Math.min(15, Math.round(pairs.length * 1.5 + duplicationPct / 8));

  return {
    id: 'component-duplication',
    name: 'Component Duplication',
    description: 'Components that differ only by name or text content while sharing near-identical structure',
    detected: true,
    score,
    maxScore: 15,
    evidence: evidence.slice(0, 6),
    details: { componentCount: componentFiles.length, similarPairs: pairs.length, duplicationPct },
  };
}

function noResult(componentCount: number): CodeDetectedPattern {
  return {
    id: 'component-duplication',
    name: 'Component Duplication',
    description: 'Components that differ only by name or text content while sharing near-identical structure',
    detected: false,
    score: 0,
    maxScore: 15,
    evidence: [],
    details: { componentCount, similarPairs: 0, duplicationPct: 0 },
  };
}
