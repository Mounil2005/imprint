import type { DetectorContext, DetectorResult } from '../types';

// Tailwind hover/transform patterns that AI tools apply uniformly to every card
const AI_HOVER_SCALE = ['hover:scale-105', 'hover:scale-110', 'hover:scale-[1.05]'];
const AI_HOVER_LIFT = ['hover:-translate-y-1', 'hover:-translate-y-2', 'hover:-translate-y-0.5'];

// Transition utility combos that appear as the AI default rather than a deliberate choice
const AI_TRANSITION_COMBOS = [
  'transition-all duration-300',
  'transition-all duration-500',
  'transition-all duration-200',
  'transition duration-300 ease-in-out',
  'transition duration-500 ease-in-out',
  'transition-all ease-in-out',
];

// CSS animation names AI tools generate
const AI_KEYFRAME_NAMES = [
  'fadeInUp', 'FadeInUp',
  'slideInUp', 'SlideInUp',
  'fadeIn', 'FadeIn',
  'slideUp', 'SlideUp',
  'zoomIn', 'ZoomIn',
  'bounceIn', 'BounceIn',
  'fadeInDown', 'slideInDown',
  'revealUp', 'enterFromBottom',
];

// AI-generated CSS scroll-reveal class naming conventions
const AI_SCROLL_CLASSES = [
  'animate-fade-in', 'animate-slide-up', 'animate-slide-in',
  'animate-zoom-in', 'animate-reveal', 'animate-in',
  'is-visible', 'in-view', 'scroll-animate',
  'reveal-on-scroll', 'fade-up-element', 'js-reveal',
];

function countOccurrences(source: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = source.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

export function detectTransitionPatterns(ctx: DetectorContext): DetectorResult {
  const { html, $ } = ctx;
  const evidence: string[] = [];
  let score = 0;

  // ── 1. AOS (Animate on Scroll) library ──────────────────────────────────────
  // Extremely common in AI-generated sites (bolt, lovable, etc. scaffold AOS)
  const aosElements = $('[data-aos]');
  const aosCount = aosElements.length;
  if (aosCount > 0) {
    const types = new Set<string>();
    aosElements.each((_, el) => {
      const t = $(el).attr('data-aos');
      if (t) types.add(t);
    });
    const pts = aosCount >= 10 ? 3 : aosCount >= 4 ? 2 : 1;
    score += pts;
    evidence.push(`AOS library: ${aosCount} animated elements with data-aos attributes (${[...types].slice(0, 4).join(', ')})`);
  }

  // ── 2. Framer Motion entry animations ─────────────────────────────────────
  // v0.dev outputs whileInView extensively with the same opacity/y pattern
  const hasWhileInView = html.includes('whileInView');
  const hasFramerEntry =
    html.includes('initial={{') ||
    html.includes('"initial":{') ||
    html.includes("initial={{ opacity: 0") ||
    html.includes('opacity:0') && html.includes('translateY');
  if (hasWhileInView) {
    const pts = hasFramerEntry ? 2 : 1;
    score += pts;
    evidence.push(
      hasFramerEntry
        ? 'Framer Motion whileInView with opacity-0 + translateY entry — standard AI scroll reveal pattern'
        : 'Framer Motion whileInView scroll animations detected',
    );
  }

  // ── 3. hover:scale on many elements — identical lift on every card ─────────
  let hoverScaleCount = 0;
  for (const p of AI_HOVER_SCALE) {
    hoverScaleCount += countOccurrences(html, p);
  }
  let hoverLiftCount = 0;
  for (const p of AI_HOVER_LIFT) {
    hoverLiftCount += countOccurrences(html, p);
  }
  const totalHover = hoverScaleCount + hoverLiftCount;
  if (totalHover >= 3) {
    const pts = totalHover >= 10 ? 2 : 1;
    score += pts;
    const parts: string[] = [];
    if (hoverScaleCount >= 2) parts.push(`hover:scale (×${hoverScaleCount})`);
    if (hoverLiftCount >= 2) parts.push(`hover:-translate-y (×${hoverLiftCount})`);
    evidence.push(`Same hover animation applied uniformly: ${parts.join(', ')} — identical effect on every interactive element`);
  }

  // ── 4. Generic transition-all + duration applied to many elements ──────────
  let transAllCount = 0;
  for (const combo of AI_TRANSITION_COMBOS) {
    transAllCount += countOccurrences(html, combo);
  }
  if (transAllCount >= 5) {
    const pts = transAllCount >= 12 ? 2 : 1;
    score += pts;
    evidence.push(`"transition-all duration-X" on ${transAllCount} elements — uniform generic timing, not a design decision`);
  }

  // ── 5. Generic @keyframes names ───────────────────────────────────────────
  const foundKeyframes = AI_KEYFRAME_NAMES.filter((name) => html.includes(name));
  if (foundKeyframes.length >= 2) {
    score += 1;
    evidence.push(`Generic animation names: ${foundKeyframes.slice(0, 5).join(', ')} — stock CSS keyframes common in AI-generated code`);
  }

  // ── 6. AI-generated scroll-reveal class names ────────────────────────────
  const foundScrollClasses = AI_SCROLL_CLASSES.filter((cls) =>
    html.includes(cls) || $(`[class*="${cls.replace('animate-', '')}"]`).length > 0,
  );
  if (foundScrollClasses.length >= 2) {
    score += 1;
    evidence.push(`Scroll-reveal class naming: ${foundScrollClasses.slice(0, 4).join(', ')} — common in AI scaffolded projects`);
  }

  // ── 7. GSAP ScrollTrigger ─────────────────────────────────────────────────
  if (html.includes('ScrollTrigger') && html.includes('gsap')) {
    score += 1;
    evidence.push('GSAP ScrollTrigger detected — often added wholesale by AI tools');
  }

  score = Math.min(10, score);
  const detected = score >= 2;

  return {
    id: 'transition-patterns',
    name: 'Generic Transition Patterns',
    description: 'Uniform hover, scroll-reveal, and entry animations applied identically across the page',
    category: 'visual' as const,
    detected,
    severity: score >= 7 ? 'high' : score >= 4 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 10,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'Replace identical hover:scale-105 and generic fadeInUp animations with purposeful, brand-specific transitions. Great animation has intention — not just opacity-0 → opacity-100 on every element with the same 300ms ease-in-out.',
  };
}
