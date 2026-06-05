import type { DetectorContext, DetectorResult } from '../types';

const TESTIMONIAL_CLASS_PATTERNS = [
  'testimonial', 'review', 'quote', 'feedback',
  'customer-story', 'success-story', 'social-proof',
  'endorsement', 'client-review',
];

export function detectTestimonials(ctx: DetectorContext): DetectorResult {
  const { $, html } = ctx;
  const evidence: string[] = [];

  // Named testimonial patterns
  let namedCount = 0;
  for (const pattern of TESTIMONIAL_CLASS_PATTERNS) {
    const found = $(`[class*="${pattern}"]`).length;
    if (found > 0) {
      namedCount += found;
      evidence.push(`${found} elements with "${pattern}" class`);
    }
  }

  // Blockquotes (often used for testimonials)
  const blockquotes = $('blockquote').length;
  if (blockquotes > 0) {
    evidence.push(`${blockquotes} <blockquote> elements found`);
  }

  // Star rating patterns (common in testimonial sections)
  const starPatterns = [
    $('[class*="star"]').length,
    $('[class*="rating"]').length,
    html.split('★').length - 1,
    html.split('⭐').length - 1,
    html.split('&#9733;').length - 1,
  ];
  const starCount = Math.max(...starPatterns);
  if (starCount >= 5) {
    evidence.push(`Star rating indicators found (${starCount} instances)`);
  }

  // Avatar + quote + name pattern detection
  let testimonialCardCount = 0;
  $('[class*="card"], [class*="item"], article, [class*="testimonial"]').each((_, el) => {
    const $el = $(el);
    const hasImage = $el.find('img[class*="avatar"], img[class*="photo"], img[alt*="avatar"], [class*="avatar"]').length > 0;
    const hasQuote = $el.find('p, blockquote, [class*="quote"]').length > 0;
    const hasName = $el.find('h3, h4, strong, [class*="name"], [class*="author"]').length > 0;
    if (hasImage && hasQuote && hasName) {
      testimonialCardCount++;
    }
  });
  if (testimonialCardCount > 0) {
    evidence.push(`${testimonialCardCount} avatar+quote+name testimonial card patterns`);
  }

  // Section-level detection
  let sectionDetected = false;
  $('section, div').each((_, el) => {
    const cls = ($(el).attr('class') || '').toLowerCase();
    const id = ($(el).attr('id') || '').toLowerCase();
    if (
      TESTIMONIAL_CLASS_PATTERNS.some((p) => cls.includes(p) || id.includes(p))
    ) {
      sectionDetected = true;
    }
  });

  // Use max of namedCount and testimonialCardCount to avoid double-counting elements
  // that have both a testimonial class AND the avatar+quote+name pattern
  const totalInstances = Math.max(namedCount, testimonialCardCount) + blockquotes;
  const detected = totalInstances >= 2 || sectionDetected || starCount >= 10;

  const score = Math.min(7, totalInstances >= 6 ? 7 : totalInstances >= 3 ? 4 : detected ? 2 : 0);

  return {
    id: 'testimonial-cards',
    name: 'Testimonial Card Section',
    description: 'Generic testimonial/review section with avatar, quote, and name pattern',
    category: 'visual' as const,
    detected,
    severity: totalInstances >= 9 ? 'high' : totalInstances >= 4 ? 'medium' : detected ? 'low' : 'none',
    score: detected ? score : 0,
    maxScore: 7,
    evidence: detected ? evidence.slice(0, 5) : [],
    recommendation:
      'Testimonial sections that match standard patterns can be made more distinctive with specific outcomes, named companies, measurable results, and varied formats — short quotes carry more weight when they are clearly attributable.',
  };
}
