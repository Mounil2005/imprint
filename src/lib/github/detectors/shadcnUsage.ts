import type { RepoFile, CodeDetectedPattern } from '@/types/github';

const SHADCN_COMPONENTS = [
  'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent', 'CardFooter',
  'Button',
  'Badge',
  'Accordion', 'AccordionItem', 'AccordionTrigger', 'AccordionContent',
  'Dialog', 'DialogTrigger', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription',
  'Tabs', 'TabsList', 'TabsTrigger', 'TabsContent',
  'Sheet', 'SheetTrigger', 'SheetContent',
  'Input', 'Textarea', 'Label',
  'Select', 'SelectTrigger', 'SelectContent', 'SelectItem',
  'Separator',
  'Avatar', 'AvatarImage', 'AvatarFallback',
  'Tooltip', 'TooltipTrigger', 'TooltipContent', 'TooltipProvider',
  'DropdownMenu', 'DropdownMenuTrigger', 'DropdownMenuContent', 'DropdownMenuItem',
  'Alert', 'AlertTitle', 'AlertDescription',
  'Progress',
  'Skeleton',
];

const UI_IMPORT_PATTERNS = [
  /from ['"]@\/components\/ui\/([^'"]+)['"]/g,
  /from ['"]~\/components\/ui\/([^'"]+)['"]/g,
  /from ['"]components\/ui\/([^'"]+)['"]/g,
  /from ['"]..\/ui\/([^'"]+)['"]/g,
];

function detectShadcnImports(content: string): string[] {
  const found = new Set<string>();
  for (const pattern of UI_IMPORT_PATTERNS) {
    let m: RegExpExecArray | null;
    const re = new RegExp(pattern.source, 'g');
    while ((m = re.exec(content)) !== null) {
      found.add(m[1]);
    }
  }
  return [...found];
}

function countComponentUsages(content: string, names: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const name of names) {
    const re = new RegExp(`<${name}[\\s/>]`, 'g');
    const matches = content.match(re);
    if (matches && matches.length > 0) {
      counts.set(name, matches.length);
    }
  }
  return counts;
}

function isCustomized(content: string): boolean {
  // A file is considered "customized" if it has more than a few className overrides
  const customizations = (content.match(/className=/g) ?? []).length;
  const variants = (content.match(/variant=/g) ?? []).length;
  const size = (content.match(/size=/g) ?? []).length;
  return customizations + variants + size > 5;
}

export function detectShadcnUsage(files: RepoFile[]): CodeDetectedPattern {
  const jsxFiles = files.filter((f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));

  // Check for shadcn UI components folder
  const hasUiFolder = files.some((f) => f.path.includes('/components/ui/') || f.path.startsWith('components/ui/'));

  const componentUsageTotals = new Map<string, number>();
  let filesWithShadcn = 0;
  let filesWithShadcnAndCustomization = 0;

  for (const file of jsxFiles) {
    const imports = detectShadcnImports(file.content);
    const hasImports = imports.length > 0;

    const usages = countComponentUsages(file.content, SHADCN_COMPONENTS);
    const hasShadcnUsage = hasImports || usages.size > 0;

    if (hasShadcnUsage) {
      filesWithShadcn++;
      usages.forEach((count, name) => {
        componentUsageTotals.set(name, (componentUsageTotals.get(name) ?? 0) + count);
      });

      const customized = isCustomized(file.content);
      if (hasShadcnUsage && customized) filesWithShadcnAndCustomization++;
    }
  }

  const totalUsages = [...componentUsageTotals.values()].reduce((s, v) => s + v, 0);
  const topUsed = [...componentUsageTotals.entries()].sort(([, a], [, b]) => b - a);

  const defaultUsagePct = filesWithShadcn > 0
    ? Math.round(((filesWithShadcn - filesWithShadcnAndCustomization) / filesWithShadcn) * 100)
    : 0;

  const detected = hasUiFolder || filesWithShadcn >= 3 || totalUsages >= 10;

  if (!detected) {
    return {
      id: 'shadcn-usage',
      name: 'Default shadcn/ui Usage',
      description: 'Heavy use of default shadcn/ui components with minimal customization',
      detected: false,
      score: 0,
      maxScore: 10,
      evidence: [],
      details: { filesWithShadcn: 0, totalUsages: 0, defaultUsagePct: 0 },
    };
  }

  const evidence: string[] = [];

  if (hasUiFolder) {
    const uiFiles = files.filter((f) => f.path.includes('/components/ui/'));
    evidence.push(`shadcn/ui component library present (${uiFiles.length} UI component files)`);
  }

  if (topUsed.length > 0) {
    const top5 = topUsed.slice(0, 5).map(([name, count]) => `${name}(${count})`).join(', ');
    evidence.push(`Most-used components: ${top5}`);
  }

  if (defaultUsagePct >= 50) {
    evidence.push(`${defaultUsagePct}% of components using shadcn have minimal customization`);
  }

  if (filesWithShadcn > 0) {
    evidence.push(`${filesWithShadcn} source files import or use shadcn/ui components`);
  }

  const score = Math.min(10, Math.round(
    (hasUiFolder ? 2 : 0) +
    Math.min(4, filesWithShadcn / 3) +
    (defaultUsagePct / 25) +
    (totalUsages >= 30 ? 2 : totalUsages >= 15 ? 1 : 0),
  ));

  return {
    id: 'shadcn-usage',
    name: 'Default shadcn/ui Usage',
    description: 'Heavy use of default shadcn/ui components with minimal customization',
    detected: true,
    score,
    maxScore: 10,
    evidence,
    details: { filesWithShadcn, totalUsages, defaultUsagePct, hasUiFolder },
  };
}
