import Link from 'next/link';
import type { HomeFeed } from '@voxzin/shared';

export function Ticker({ items }: { items: HomeFeed['breaking'] }) {
  if (items.length === 0) return null;
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded bg-linear-to-r from-[#ff3d85] to-[#ff7a45] px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
          <span className="size-1.5 rounded-full bg-white" aria-hidden />
          Breaking
        </span>
        <ul className="flex gap-8 overflow-x-auto whitespace-nowrap text-sm font-medium text-ink" aria-label="Breaking stories">
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
