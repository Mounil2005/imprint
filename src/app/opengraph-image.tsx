import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Imprint — Is Your Site Vibe-Coded?';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0a0a0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        <div style={{ color: '#6b7280', fontSize: 20, fontWeight: 600, letterSpacing: 4, marginBottom: 32 }}>
          IMPRINT
        </div>
        <div style={{ color: '#ffffff', fontSize: 72, fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
          Is your site
        </div>
        <div style={{ color: '#d4f84a', fontSize: 72, fontWeight: 800, lineHeight: 1.1, marginBottom: 40 }}>
          vibe-coded?
        </div>
        <div style={{ color: '#9ca3af', fontSize: 24, maxWidth: 700 }}>
          Analyze any website for AI-generated design patterns. Get a 0–100 score across 28 detectors.
        </div>
      </div>
    ),
    { ...size },
  );
}
