import Link from 'next/link';
import type { ArticleSummary } from '@voxzin/shared';
import { StoryFrame } from './story-frame';
import { StoryMeta } from './story-meta';

export function Hero({ lead }: { lead: ArticleSummary }) {
  return (
    <section aria-label="Top story" className="mx-auto w-full px-4 pt-6 sm:px-6">
      <Link
        href={`/articles/${lead.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
      >
        <StoryFrame image={lead.image} sizes="100vw" mode="natural" priority />
        <div className="flex flex-1 flex-col p-5 sm:p-7 lg:p-8">
          <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-ink">
            {lead.category.name}
          </span>
          <h1 className="mt-3 font-serif text-2xl font-bold leading-tight tracking-tight group-hover:text-accent-ink sm:text-3xl lg:text-[2rem]">
            {lead.title}
          </h1>
          <p className="mt-3 line-clamp-3 max-w-2xl text-base leading-relaxed text-muted">{lead.excerpt}</p>
          <StoryMeta publishedAt={lead.publishedAt} readingTime={lead.readingTime} className="mt-auto pt-5 text-muted" />
        </div>
      </Link>
    </section>
  );
}
