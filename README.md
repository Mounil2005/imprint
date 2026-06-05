# Imprint

Detect AI-generated design and code patterns on any website or GitHub repository. Get a 0–100 score across 28 pattern detectors — no machine learning, no guesswork.

![Imprint](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Playwright](https://img.shields.io/badge/Playwright-1.50-green)

---

## What it does

Imprint analyzes websites and codebases for patterns that commonly appear in AI-assisted or "vibe-coded" projects — not to claim something was made by AI, but to measure how strongly it exhibits those patterns.

**Website analysis** — crawl any public URL with a headless browser, extract HTML, and run 28 structural, visual, and content detectors.

**GitHub repository analysis** — fetch source files via the GitHub API and analyze code patterns: component duplication, generic naming, JSX repetition, shadcn usage, map-based rendering, and more.

**Combined mode** — provide both a website URL and a GitHub repo to get a Website Score, a Code Score, and a Combined AI Pattern Score.

---

## Scoring

Each analysis produces a score from **0 to 100**.

| Range | Label |
|---|---|
| 0–25 | Low pattern usage |
| 26–50 | Moderate patterns |
| 51–75 | High pattern usage |
| 76–100 | Very high pattern usage |

A high score means the site or codebase follows patterns that frequently appear in AI-generated or template-built projects. It does **not** prove AI authorship — experienced developers sometimes use these patterns intentionally.

### Multi-page scoring

When crawling multiple pages, the final score uses three components rather than a simple average:

- **Pattern Coverage** — how many of the 28 detectors fired across all pages
- **Pattern Strength** — average intensity of detected patterns
- **Key Page Score** — weighted average prioritising homepage and product pages over contact/legal pages

---

## Website detectors (28)

**Visual** — Card Overload, Nested Cards, Badge Heavy, Dot-Grid Background, Testimonial Cards, Generic Pricing, Repeated CTAs, Icon Grid, Transition Patterns, Font Stack, Gradient Blobs

**Structural** — Website Archetype, Generic Section Naming, Layout Diversity, Component Reuse, Template Similarity, Generic Navigation, Tech Stack Fingerprint, Footer Template

**Content** — Generic Hero, Marketing Genericity, Content Framework, Uncited Statistical Claims, AI Prose Patterns, Thin Content, Meta Quality, Compound Signals, Social Proof Quality

## Code detectors (10)

Component Duplication · Generic Naming · JSX Patterns · Tailwind Repetition · shadcn Usage · Map-Based Rendering · Similarity Clusters · Boilerplate Detection · Comment Analysis · Folder Structure

---

## Tech stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Playwright** — headless Chrome crawling
- **Cheerio** — HTML parsing
- **Tailwind CSS v4**
- **Radix UI** primitives

---

## Running locally

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
git clone https://github.com/Mounil2005/imprint.git
cd imprint
npm install
```

Playwright installs Chromium automatically via the `postinstall` script.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

---

## Project structure

```
src/
  app/
    api/
      analyze/          # Website analysis endpoint
      analyze-repo/     # GitHub + combined analysis endpoint
    page.tsx            # Homepage
    layout.tsx          # Shell, nav, footer
  components/           # UI components
  lib/
    analyzer/           # Website pattern detectors + scoring
      detectors/        # 28 individual detectors
    crawler/            # Playwright crawler
    github/             # GitHub API fetcher + code detectors
  types/                # TypeScript types
```

---

## Notes

- Public repositories only for GitHub analysis
- Maximum repository size: 50MB
- Maximum files analyzed: 800
- Single-page analysis: ~15–40s
- Full-site analysis (5 pages): ~60–90s
- GitHub analysis: ~30–60s
