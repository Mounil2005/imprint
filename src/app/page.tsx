import AnalyzerClient from '@/components/AnalyzerClient';

export default function HomePage() {
  return (
    <>
      <AnalyzerClient />

      {/* ── SEO content — server-rendered, fully readable by Google ── */}
      <div className="sr-only">
        <h2>What is vibe coding?</h2>
        <p>
          Vibe coding is a term for websites and apps built almost entirely with AI tools like
          ChatGPT, Claude, Cursor, or v0. These sites share recognizable patterns: shadcn UI
          components, gradient blob backgrounds, generic hero sections, badge-heavy layouts,
          and copy that reads like a GPT prompt response.
        </p>

        <h2>Is my website vibe coded?</h2>
        <p>
          Imprint analyzes your website for 28 AI-generated design and code patterns and gives
          you a score from 0 to 100. A score above 75 means your site is heavily vibe-coded.
          Enter your URL above to check if your site is vibe coded.
        </p>

        <h2>How does Imprint detect AI-generated websites?</h2>
        <p>
          Imprint crawls your website with a real browser, captures the HTML and a screenshot,
          then runs 28 pattern detectors covering design patterns, copy patterns, and structural
          patterns. Detectors include: shadcn component usage, gradient blob backgrounds,
          generic hero sections, social proof patterns, pricing table templates, footer
          boilerplate, icon grids, testimonial carousels, CTA button patterns, and more.
        </p>

        <h2>What patterns does Imprint detect?</h2>
        <p>
          Imprint detects vibe coding patterns including: shadcn UI components, Tailwind CSS
          utility class repetition, generic marketing copy, AI-generated testimonials, gradient
          mesh backgrounds, badge and tag overuse, hero section templates, pricing table
          boilerplate, footer link patterns, icon grid layouts, CTA button patterns, card grid
          layouts, social proof sections, and more across 28 total detectors.
        </p>

        <h2>Can I check a GitHub repository for AI code patterns?</h2>
        <p>
          Yes. Add a GitHub repository URL to analyze source code for AI generation patterns
          including: component duplication, generic naming conventions, excessive map usage,
          boilerplate detection, shadcn component usage, Tailwind class repetition, and JSX
          structural patterns.
        </p>

        <h2>How is the vibe-coded score calculated?</h2>
        <p>
          The score is a weighted average across 28 pattern detectors. Each detector has a
          weight based on how strongly it signals AI-generated design. The final score ranges
          from 0 (unique, hand-crafted design) to 100 (fully vibe-coded, AI-generated patterns
          throughout). No machine learning is used — all detection is rule-based.
        </p>

        <h2>Is Imprint free to use?</h2>
        <p>
          Yes, Imprint is completely free. No account required. Enter any website URL and get
          an instant AI pattern score.
        </p>
      </div>
    </>
  );
}
