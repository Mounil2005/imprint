import type { RepoFile, CodeDetectedPattern } from '@/types/github';

const GENERIC_SECTION_NAMES = new Set([
  'HeroSection', 'FeaturesSection', 'BenefitsSection', 'CTASection',
  'AboutSection', 'TestimonialsSection', 'StatsSection', 'ContactSection',
  'PricingSection', 'ServicesSection', 'TeamSection', 'FAQSection',
  'FooterSection', 'HeaderSection', 'NavSection', 'NewsletterSection',
  'PartnersSection', 'LogosSection', 'SocialProofSection', 'HowItWorksSection',
]);

const GENERIC_CARD_NAMES = new Set([
  'FeatureCard', 'BenefitCard', 'ServiceCard', 'InfoCard', 'PricingCard',
  'TestimonialCard', 'TeamCard', 'BlogCard', 'ProductCard', 'StatCard',
  'ReviewCard', 'PartnerCard', 'ClientCard',
]);

const GENERIC_COMPONENT_NAMES = new Set([
  ...GENERIC_SECTION_NAMES,
  ...GENERIC_CARD_NAMES,
  'Hero', 'Features', 'Benefits', 'Testimonials', 'Pricing', 'FAQ',
  'CTA', 'Stats', 'Team', 'Contact', 'Newsletter', 'Footer', 'Header',
  'Navbar', 'HowItWorks', 'Logos', 'Partners',
]);

const EXPORT_PATTERN = /export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)/g;

function extractExportedNames(content: string): string[] {
  const names: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(EXPORT_PATTERN.source, 'g');
  while ((m = re.exec(content)) !== null) {
    names.push(m[1]);
  }
  return names;
}

export function detectGenericNaming(files: RepoFile[]): CodeDetectedPattern {
  const jsxFiles = files.filter((f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));

  const found: Array<{ name: string; path: string; type: 'filename' | 'export' }> = [];

  for (const file of jsxFiles) {
    const filename = file.path.split('/').pop()!.replace(/\.(tsx|jsx)$/, '');

    if (GENERIC_COMPONENT_NAMES.has(filename)) {
      found.push({ name: filename, path: file.path, type: 'filename' });
    }

    const exportedNames = extractExportedNames(file.content);
    for (const name of exportedNames) {
      if (GENERIC_COMPONENT_NAMES.has(name) && name !== filename) {
        found.push({ name, path: file.path, type: 'export' });
      }
    }
  }

  if (found.length === 0) {
    return {
      id: 'generic-naming',
      name: 'Generic Component Naming',
      description: 'Component names that commonly appear in AI-generated codebases',
      detected: false,
      score: 0,
      maxScore: 10,
      evidence: [],
      details: { count: 0, names: [] },
    };
  }

  const uniqueNames = [...new Set(found.map((f) => f.name))];
  const sectionMatches = uniqueNames.filter((n) => GENERIC_SECTION_NAMES.has(n));
  const cardMatches = uniqueNames.filter((n) => GENERIC_CARD_NAMES.has(n));

  const evidence: string[] = [];

  if (sectionMatches.length > 0) {
    evidence.push(`Generic section names: ${sectionMatches.join(', ')}`);
  }
  if (cardMatches.length > 0) {
    evidence.push(`Generic card names: ${cardMatches.join(', ')}`);
  }
  evidence.push(`${uniqueNames.length} generic component names detected across ${jsxFiles.length} components`);

  const score = Math.min(10, Math.round(uniqueNames.length * 1.2));

  return {
    id: 'generic-naming',
    name: 'Generic Component Naming',
    description: 'Component names that commonly appear in AI-generated codebases',
    detected: true,
    score,
    maxScore: 10,
    evidence,
    details: { count: uniqueNames.length, names: uniqueNames },
  };
}
