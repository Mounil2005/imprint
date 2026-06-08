import type { Metadata } from 'next';
import { Syne, DM_Sans, DM_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
  display: 'swap',
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://imprint-production-a862.up.railway.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Imprint — Is Your Site Vibe-Coded?',
    template: '%s | Imprint',
  },
  description:
    'Analyze any website or GitHub repo for AI-generated design and code patterns. Get a 0–100 vibe-coded score across 28 detectors. No ML, instant results.',
  keywords: ['vibe coded', 'AI design detector', 'website analyzer', 'AI patterns', 'shadcn detector', 'vibe coding score'],
  authors: [{ name: 'Imprint' }],
  openGraph: {
    title: 'Imprint — Is Your Site Vibe-Coded?',
    description: 'Analyze any website for AI-generated design and code patterns. Get a 0–100 score across 28 detectors.',
    url: BASE_URL,
    siteName: 'Imprint',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Imprint — Vibe-Coded Score' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Imprint — Is Your Site Vibe-Coded?',
    description: 'Analyze any website for AI-generated design and code patterns. Get a 0–100 score across 28 detectors.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: BASE_URL },
  verification: { google: 'l1vkx54phLAgKPVSykWXBELM8itFjl4ZpWKQJRvEDH4' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}
      style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}
    >
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Imprint',
              url: BASE_URL,
              description: 'Analyze any website or GitHub repo for AI-generated design and code patterns. Get a 0–100 vibe-coded score.',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Any',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            }),
          }}
        />
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)/90] backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-5 sm:px-8 h-12 flex items-center">
            <Link
              href="/"
              className="text-sm font-bold tracking-tight text-[var(--text)] hover:opacity-70 transition-opacity"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              IMPRINT
            </Link>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          {children}
        </div>

        <footer className="max-w-5xl mx-auto px-5 sm:px-8 mt-24 pb-10 border-t border-[var(--border)]">
          <div className="pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-[var(--muted)]">
            <p>
              Imprint measures <em>design pattern frequency</em> — not AI authorship.
            </p>
            <div className="flex items-center gap-4" style={{ fontFamily: 'var(--font-mono)' }}>
              <Link href="/privacy" className="hover:text-[var(--text)] transition-colors">
                Privacy Policy
              </Link>
              <span>© 2026 Imprint</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
