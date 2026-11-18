import type { CategoryDto } from '@voxzin/shared';

export function uniqueCategories(categories: CategoryDto[]) {
  const slugs = new Set<string>();
  const names = new Set<string>();
  return categories.filter((category) => {
    const slug = category.slug.trim().toLowerCase();
    const name = category.name.trim().toLowerCase();
    if (slugs.has(slug) || names.has(name)) return false;
    slugs.add(slug);
    names.add(name);
    return true;
  });
}

export const buildNavItems = (categories: CategoryDto[]) => {
  return [
    { href: '/', label: 'Home' },
    { href: '/trending', label: 'Trending' },
    { href: '/latest', label: 'Latest' },
    ...uniqueCategories(categories).map((c) => ({ href: `/${c.slug}`, label: c.name })),
  ];
};
