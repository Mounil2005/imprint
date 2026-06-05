import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Imprint',
  description: 'Privacy policy for Imprint, the AI pattern scoring tool.',
};

export default function PrivacyPage() {
  return (
    <article className="py-16 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
        Privacy Policy
      </h1>
      <p className="text-xs text-[var(--muted)] mb-10">Effective date: January 1, 2026</p>

      <div className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary,var(--text))]">

        <section>
          <h2 className="font-semibold text-base mb-2">What Imprint does</h2>
          <p>
            Imprint crawls publicly accessible websites and GitHub repositories that you submit,
            analyzes their design and code patterns, and returns a score. No user accounts are
            required and no results are stored on our servers after the request completes.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Data we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>URLs you submit</strong> — used solely to perform the requested analysis and
              discarded immediately after.
            </li>
            <li>
              <strong>Standard server logs</strong> — IP address, timestamp, and HTTP status code,
              retained for up to 30 days for security and debugging purposes.
            </li>
          </ul>
          <p className="mt-3">
            We do not collect names, email addresses, or any other personal information.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Third-party services</h2>
          <p>
            Imprint is hosted on Railway. Their infrastructure may collect standard network
            telemetry. See{' '}
            <a
              href="https://railway.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70 transition-opacity"
            >
              Railway&apos;s Privacy Policy
            </a>{' '}
            for details.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Cookies</h2>
          <p>
            Imprint does not use cookies, tracking pixels, or any form of analytics.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Third-party websites</h2>
          <p>
            When you submit a URL, Imprint fetches that page on your behalf. We are not
            responsible for the privacy practices of the websites you choose to analyze.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Changes to this policy</h2>
          <p>
            We may update this policy occasionally. The effective date above will reflect the
            most recent revision.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-base mb-2">Contact</h2>
          <p>
            Questions? Reach out at{' '}
            <a
              href="mailto:weresearchcv@gmail.com"
              className="underline hover:opacity-70 transition-opacity"
            >
              weresearchcv@gmail.com
            </a>
            .
          </p>
        </section>

      </div>
    </article>
  );
}
