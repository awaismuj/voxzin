import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Voxzin | Global News, Technology & Trending Stories', template: '%s | Voxzin' },
  description: 'Stay informed with carefully sourced global news, technology, AI, business, science, culture and practical insights from Voxzin.',
  applicationName: 'Voxzin',
  openGraph: {
    type: 'website',
    siteName: 'Voxzin',
    title: "Voxzin | The voice of today's trending stories.",
    description: 'Carefully sourced global news, technology, AI, business, science and culture.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: "Voxzin | The voice of today's trending stories.",
    description: 'Carefully sourced global news, technology, AI, business, science and culture.',
  },
  alternates: {
    types: { 'application/rss+xml': '/feed.xml' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
