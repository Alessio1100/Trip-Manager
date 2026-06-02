import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Perù 2026 · Trip Planner',
  description: 'Pianificatore viaggio Perù – 13 giorni sulle Ande',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Perù 2026',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#171310',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{__html:`
          if('serviceWorker' in navigator){
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
          }
        `}} />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#FAF8F2', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' as const, textRendering: 'optimizeLegibility' as const }}>
        {children}
      </body>
    </html>
  )
}
