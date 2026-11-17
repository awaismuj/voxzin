import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'VoxZin | Global News, Technology & Trending Stories', template: '%s | VoxZin' },
  description: 'Stay informed with carefully sourced global news, technology, AI, business, science, culture and practical insights from VoxZin.',
  applicationName: 'VoxZin',
  openGraph: {
    type: 'website',
    siteName: 'VoxZin',
    title: "VoxZin | The voice of today's trending stories.",
    description: 'Carefully sourced global news, technology, AI, business, science and culture.',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: "VoxZin | The voice of today's trending stories.",
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
