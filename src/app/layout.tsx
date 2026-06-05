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

export const metadata: Metadata = {
  title: 'Imprint — AI Pattern Score',
  description:
    'Detect AI-generated design and code patterns on any website or GitHub repository. Get a 0–100 score across 28 pattern detectors. No machine learning.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${dmMono.variable}`}
      style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}
    >
      <body className="min-h-screen antialiased">
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
            <p style={{ fontFamily: 'var(--font-mono)' }}>
              Next.js · Playwright · Cheerio
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
