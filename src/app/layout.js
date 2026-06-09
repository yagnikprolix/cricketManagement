import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import BottomNav from '@/components/ui/BottomNav';
import SideNav from '@/components/ui/SideNav';
import MainLayout from '@/components/layout/MainLayout';
import { Toaster } from 'react-hot-toast';
import Script from 'next/script';

export const metadata = {
  title: 'Curius Cricket Club | Live Matches, RSVP & Payments',
  description: 'Curius Cricket Club — Track upcoming cricket matches, submit RSVPs, manage match locations, live scorecard with voice commentary, and dynamic player payment splits. Your premium cricket club management portal.',
  keywords: 'cricket, cricket club, live scoring, RSVP, match management, cricket scoreboard, Curius',
  authors: [{ name: 'Curius Cricket Club' }],
  metadataBase: new URL('https://www.curius.in'),
  openGraph: {
    title: 'Curius Cricket Club | Live Matches, RSVP & Payments',
    description: 'Track upcoming cricket matches, submit RSVPs, live scorecard with voice commentary, and dynamic player payment splits.',
    url: 'https://www.curius.in',
    siteName: 'Curius Cricket Club',
    images: [
      {
        url: '/curius-logo.png',
        width: 1024,
        height: 1024,
        alt: 'Curius Cricket Club Logo',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Curius Cricket Club | Live Matches, RSVP & Payments',
    description: 'Track upcoming cricket matches, submit RSVPs, live scorecard with voice commentary, and dynamic player payment splits.',
    images: ['/curius-logo.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/curius-logo.png',
    apple: '/curius-logo.png',
  },
  other: {
    'theme-color': '#4F46E5',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'google-adsense-account': 'ca-pub-6485931326285001',
  },
};

export default function RootLayout({ children }) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-6485931326285001';

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,300..800&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..200&display=block" />
        <meta name="theme-color" content="#4F46E5" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('curius-theme');
                  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-[var(--background)] text-[var(--on-background)] font-sans antialiased min-h-screen">
        <ThemeProvider>
          <MainLayout>
            {children}
            <Toaster position="top-right" toastOptions={{
              style: {
                background: 'var(--surface-container-high)',
                color: 'var(--on-surface)',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--on-success)' } },
              error: { iconTheme: { primary: 'var(--error)', secondary: 'var(--on-error)' } }
            }} />
          </MainLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
