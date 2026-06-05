import type { RepoFile, CodeDetectedPattern } from '@/types/github';

function tokenize(content: string): string[] {
  // Remove string literals and comments, then tokenize code structure
  const cleaned = content
    .replace(/\/\/[^\n]*/g, '')  // remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
    .replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""') // normalize strings
    .replace(/\s+/g, ' ')
    .trim();

  // Split on boundaries preserving structure-relevant tokens
  return cleaned
    .split(/[\s,;{}()\[\]<>=/]+/)
    .filter((t) => t.length > 1 && !/^\d+$/.test(t));
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  a.forEach((va, token) => {
    dot += va * (b.get(token) ?? 0);
    magA += va * va;
  });
  b.forEach((vb) => { magB += vb * vb; });

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function buildFreqMap(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return freq;
}

interface ComponentSignature {
  name: string;
  path: string;
  tokens: string[];
  freq: Map<string, number>;
  lineCount: number;
}

export function detectSimilarityClusters(files: RepoFile[]): CodeDetectedPattern {
  const componentFiles = files.filter((f) => {
    const p = f.path.toLowerCase();
    return (p.includes('/components/') || p.startsWith('components/')) &&
      (p.endsWith('.tsx') || p.endsWith('.jsx')) &&
      f.content.length > 100; // skip trivial files
  });

  if (componentFiles.length < 4) {
    return noResult(componentFiles.length);
  }

  const signatures: ComponentSignature[] = componentFiles.map((f) => {
    const tokens = tokenize(f.content);
    return {
      name: f.path.split('/').pop()!.replace(/\.(tsx|jsx)$/, ''),
      path: f.path,
      tokens,
      freq: buildFreqMap(tokens),
      lineCount: f.content.split('\n').length,
    };
  });

  const pairs: Array<{ a: string; b: string; sim: number }> = [];

  for (let i = 0; i < signatures.length; i++) {
    for (let j = i + 1; j < signatures.length; j++) {
      const sim = cosineSimilarity(signatures[i].freq, signatures[j].freq);
      if (sim >= 0.72) {
        pairs.push({
          a: signatures[i].name,
          b: signatures[j].name,
          sim: Math.round(sim * 100),
        });
      }
    }
  }

  if (pairs.length === 0) return noResult(componentFiles.length);

  pairs.sort((a, b) => b.sim - a.sim);

  // Build clusters using union-find
  const parent = new Map<string, string>();
  const getRoot = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x)!;
    if (p !== x) { const r = getRoot(p); parent.set(x, r); return r; }
    return x;
  };
  const union = (x: string, y: string) => parent.set(getRoot(x), getRoot(y));

  for (const p of pairs) { union(p.a, p.b); }

  const clusterMap = new Map<string, string[]>();
  for (const sig of signatures) {
    const root = getRoot(sig.name);
    const cluster = clusterMap.get(root) ?? [];
    cluster.push(sig.name);
    clusterMap.set(root, cluster);
  }

  const clusters = [...clusterMap.values()].filter((c) => c.length > 1);
  const clusterSizes = clusters.map((c) => c.length);
  const totalClustered = clusterSizes.reduce((s, v) => s + v, 0);

  const evidence: string[] = [];

  for (const pair of pairs.slice(0, 5)) {
    evidence.push(`${pair.a} ↔ ${pair.b} — ${pair.sim}% similarity`);
  }

  if (clusters.length > 0) {
    for (const cluster of clusters.slice(0, 3)) {
      evidence.push(`Cluster: ${cluster.join(' / ')} (${cluster.length} similar components)`);
    }
  }

  if (totalClustered > 0) {
    const pct = Math.round((totalClustered / componentFiles.length) * 100);
    evidence.push(`${pct}% of components (${totalClustered}/${componentFiles.length}) belong to similarity clusters`);
  }

  const score = Math.min(10, Math.round(pairs.length * 1.2 + clusters.length * 1.5));

  return {
    id: 'similarity-clusters',
    name: 'Code Similarity Clusters',
    description: 'Groups of components with highly similar token structure — suggesting copy-and-adapt patterns',
    detected: true,
    score,
    maxScore: 10,
    evidence: evidence.slice(0, 6),
    details: { componentCount: componentFiles.length, similarPairs: pairs.length, clusters: clusters.length, clusteredComponents: totalClustered },
  };
}

function noResult(componentCount: number): CodeDetectedPattern {
  return {
    id: 'similarity-clusters',
    name: 'Code Similarity Clusters',
    description: 'Groups of components with highly similar token structure — suggesting copy-and-adapt patterns',
    detected: false,
    score: 0,
    maxScore: 10,
    evidence: [],
    details: { componentCount, similarPairs: 0, clusters: 0 },
  };
}
