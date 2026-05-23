import './globals.css';

export const metadata = {
  title: 'Cricket Club Manager | Live Matches, RSVP & Payments',
  description: 'Track upcoming cricket matches, submit Yes/No RSVPs, manage match locations and player payments instantly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
