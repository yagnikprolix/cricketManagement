import './globals.css';

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
    'theme-color': '#10b981',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
