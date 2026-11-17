import type { CategoryDto } from '@voxzin/shared';

export const buildNavItems = (categories: CategoryDto[]) => {
  const seen = new Set<string>();
  const unique = categories.filter((c) => {
    const key = c.slug.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [
    { href: '/', label: 'Home' },
    { href: '/trending', label: 'Trending' },
    { href: '/latest', label: 'Latest' },
    ...unique.map((c) => ({ href: `/${c.slug}`, label: c.name })),
  ];
};
