import Link from 'next/link';
import { Search } from 'lucide-react';
import { getCategories } from '@/lib/api';
import { buildNavItems } from '@/lib/nav';
import { BrandLogo } from './brand-logo';
import { Nav } from './nav';
import { ThemeToggle } from './theme-toggle';

export async function SiteHeader() {
  const categories = await getCategories();
  const items = buildNavItems(categories);
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 text-white backdrop-blur supports-[backdrop-filter]:bg-navy/85">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLogo tagline className="text-white" />
        <div className="flex items-center gap-1">
          <Nav items={items} />
          <Link href="/search" aria-label="Search" className="grid size-10 place-items-center rounded-full text-white/90 hover:bg-white/10">
            <Search className="size-5" aria-hidden />
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
