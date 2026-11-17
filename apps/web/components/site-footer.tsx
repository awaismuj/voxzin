import Link from 'next/link';
import { getCategories, getPublicSettings } from '@/lib/api';
import { BrandLogo } from './brand-logo';
import { NewsletterForm } from './newsletter-form';

export async function SiteFooter() {
  const [categories, settings] = await Promise.all([getCategories(), getPublicSettings()]);
  return (
    <footer className="mt-20 bg-navy text-white/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_2fr]">
        <div>
          <BrandLogo className="h-10 text-white" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Every trend. Every voice.</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">
            Global news, technology, AI, business, science, culture and practical insights, carefully sourced.
          </p>
          {settings.contactEmail && <a className="mt-3 inline-block text-sm hover:text-white" href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}
          <NewsletterForm />
        </div>
        <nav aria-label="Sections">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <li><Link href="/trending" className="hover:text-white">Trending</Link></li>
            <li><Link href="/latest" className="hover:text-white">Latest</Link></li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/${c.slug}`} className="hover:text-white">{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 px-4 py-5 text-xs text-white/50 sm:flex-row sm:px-6">
        <p>Copyright © {new Date().getFullYear()} VoxZin. All rights reserved.</p>
        <nav aria-label="Company and legal information">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
