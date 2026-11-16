import Link from 'next/link';
import type { ArticleSummary, Paginated } from '@voxzin/shared';
import { ArticleCard } from './article-card';
import { EmptyState } from './empty-state';

export function ArticleList({ data, basePath }: { data: Paginated<ArticleSummary>; basePath: string }) {
  if (data.items.length === 0) {
    return <EmptyState title="Nothing here yet" body="Stories in this section will appear once they are published." />;
  }
  const joiner = basePath.includes('?') ? '&' : '?';
  const href = (p: number) => {
    if (p <= 1) return basePath;
    return basePath.includes('?') ? `${basePath}${joiner}page=${p}` : `${basePath}/page/${p}`;
  };
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
      {data.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-between text-sm">
          {data.page > 1 ? (
            <Link href={href(data.page - 1)} rel="prev" className="rounded-md border border-line bg-surface px-4 py-2 font-medium hover:bg-bg">
              Newer stories
            </Link>
          ) : <span />}
          <span className="text-muted">Page {data.page} of {data.totalPages}</span>
          {data.page < data.totalPages ? (
            <Link href={href(data.page + 1)} rel="next" className="rounded-md border border-line bg-surface px-4 py-2 font-medium hover:bg-bg">
              Older stories
            </Link>
          ) : <span />}
        </nav>
      )}
    </>
  );
}
