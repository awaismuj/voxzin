import Link from 'next/link';
import type { ArticleSummary } from '@voxzin/shared';
import { StoryImage } from './story-image';
import { StoryMeta } from './story-meta';

export function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={`/articles/${article.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-video overflow-hidden bg-navy">
          <StoryImage image={article.image} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" fit="contain" />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">{article.category.name}</p>
          <h3 className="mt-1.5 line-clamp-3 text-lg font-bold leading-snug group-hover:text-accent-ink">{article.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{article.excerpt}</p>
          <StoryMeta publishedAt={article.publishedAt} readingTime={article.readingTime} className="mt-auto pt-3 text-muted" />
        </div>
      </Link>
    </article>
  );
}
