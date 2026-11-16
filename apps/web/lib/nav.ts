import type { CategoryDto } from '@voxzin/shared';

export const buildNavItems = (categories: CategoryDto[]) => [
  { href: '/', label: 'Home' },
  { href: '/trending', label: 'Trending' },
  { href: '/latest', label: 'Latest' },
  ...categories.map((c) => ({ href: `/${c.slug}`, label: c.name })),
];
