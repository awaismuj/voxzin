import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SITE_URL } from '@/lib/site';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', name: 'VoxZin', url: SITE_URL },
    { '@type': 'WebSite', name: 'VoxZin', url: SITE_URL,
      potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' } },
  ],
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-navy">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
