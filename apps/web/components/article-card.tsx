import Link from 'next/link';
import type { ArticleSummary } from '@voxzin/shared';
import { StoryImage } from './story-image';
import { StoryMeta } from './story-meta';

export function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-line bg-surface">
      <Link href={`/articles/${article.slug}`} className="block">
        <div className="relative aspect-[16/9]">
          <StoryImage image={article.image} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-accent-ink">{article.category.name}</p>
          <h3 className="mt-1 font-serif text-xl font-semibold leading-snug group-hover:underline">{article.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted">{article.excerpt}</p>
          <StoryMeta publishedAt={article.publishedAt} readingTime={article.readingTime} className="mt-3 text-muted" />
        </div>
      </Link>
    </article>
  );
}
