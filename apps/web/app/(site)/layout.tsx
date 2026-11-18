import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getPublicSettings } from '@/lib/api';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';

async function buildJsonLd() {
  const settings = await getPublicSettings().catch(() => null);
  const sameAs = Object.values(settings?.social ?? {}).filter((u) => u.startsWith('https://'));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsMediaOrganization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        slogan: SITE_TAGLINE,
        description: `${SITE_NAME} is an online news publication covering trending stories in technology, sports, cricket, entertainment and more.`,
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/brand/mark-512.png`, width: 512, height: 512 },
        sameAs: sameAs.length > 0 ? sameAs : undefined,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: 'en',
        publisher: { '@id': `${SITE_URL}/#organization` },
        potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' },
      },
    ],
  };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = await buildJsonLd();
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
