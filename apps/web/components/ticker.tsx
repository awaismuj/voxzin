import Link from 'next/link';
import type { HomeFeed } from '@voxzin/shared';

export function Ticker({ items }: { items: HomeFeed['breaking'] }) {
  if (items.length === 0) return null;
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <span className="shrink-0 rounded bg-accent px-2.5 py-1 text-xs font-semibold text-navy">Breaking</span>
        <ul className="flex gap-8 overflow-x-auto whitespace-nowrap text-sm text-ink" aria-label="Breaking stories">
          {items.map((i) => (
            <li key={i.slug}>
              <Link href={`/articles/${i.slug}`} className="hover:text-accent-ink hover:underline">
                {i.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
