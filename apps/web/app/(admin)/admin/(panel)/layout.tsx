import { BrandLogo } from '@/components/brand-logo';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/admin/logout-button';
import { MfaSetup } from '@/components/admin/mfa-setup';
import { getMe } from '@/lib/admin-server';

export const dynamic = 'force-dynamic';

const LINKS: { href: string; label: string; roles: string[] }[] = [
  { href: '/admin', label: 'Dashboard', roles: ['super_admin', 'admin', 'editor'] },
  { href: '/admin/articles', label: 'Articles', roles: ['super_admin', 'admin', 'editor', 'author'] },
  { href: '/admin/seo', label: 'SEO', roles: ['super_admin', 'admin', 'editor'] },
  { href: '/admin/security', label: 'Security', roles: ['super_admin', 'admin'] },
  { href: '/admin/media', label: 'Media', roles: ['super_admin', 'admin', 'editor', 'author'] },
  { href: '/admin/trending', label: 'Trending', roles: ['super_admin', 'admin', 'editor'] },
  { href: '/admin/categories', label: 'Categories', roles: ['super_admin', 'admin'] },
  { href: '/admin/countries', label: 'Countries', roles: ['super_admin', 'admin'] },
  { href: '/admin/authors', label: 'Authors', roles: ['super_admin', 'admin'] },
  { href: '/admin/users', label: 'Users', roles: ['super_admin', 'admin'] },
  { href: '/admin/settings', label: 'Settings', roles: ['super_admin', 'admin'] },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect('/admin/login');
  if (me.mfaRequired && !me.mfaVerified) {
    if (me.mfaEnabled) redirect('/admin/login');
    return <MfaSetup />;
  }
  return (
    <div className="md:flex">
      <aside className="border-b border-line bg-navy p-4 text-white md:min-h-screen md:w-56 md:border-b-0">
        <BrandLogo href="/admin" className="h-8 text-white" />
        <p className="text-xs text-white/60">{me.name} · {me.role.replace('_', ' ')}</p>
        <nav aria-label="Admin" className="mt-4 flex flex-wrap gap-1 md:flex-col">
          {LINKS.filter((l) => l.roles.includes(me.role)).map((l) => (
            <Link key={l.href} href={l.href} className="rounded px-3 py-2 text-sm text-white/85 hover:bg-white/10">{l.label}</Link>
          ))}
          <Link href="/" className="rounded px-3 py-2 text-sm text-white/60 hover:bg-white/10">View site</Link>
        </nav>
        <div className="mt-4"><LogoutButton /></div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
