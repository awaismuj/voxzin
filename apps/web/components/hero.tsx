import Link from 'next/link';
import type { ArticleSummary } from '@voxzin/shared';
import { StoryImage } from './story-image';
import { StoryMeta } from './story-meta';

export function Hero({ lead, side }: { lead: ArticleSummary; side: ArticleSummary[] }) {
  return (
    <section aria-label="Top stories" className="mx-auto grid max-w-7xl gap-5 px-4 pt-6 sm:px-6 lg:grid-cols-[2fr_1fr]">
      <Link
        href={`/articles/${lead.slug}`}
        className="group relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-xl bg-navy"
      >
        <StoryImage image={lead.image} sizes="(min-width: 1024px) 66vw, 100vw" priority />
        <div className="absolute inset-0 bg-linear-to-t from-navy via-navy/60 to-transparent" aria-hidden />
        <div className="relative p-6 text-white sm:p-8">
          <span className="rounded bg-accent px-2 py-1 text-xs font-semibold text-navy">{lead.category.name}</span>
          <h1 className="mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight group-hover:underline sm:text-4xl">
            {lead.title}
          </h1>
          <p className="mt-3 line-clamp-2 max-w-xl text-white/80">{lead.excerpt}</p>
          <StoryMeta publishedAt={lead.publishedAt} readingTime={lead.readingTime} className="mt-4 text-white/70" />
        </div>
      </Link>

      {side.length > 0 && (
        <ul className="flex flex-col gap-3">
          {side.map((s) => (
            <li key={s.id} className="flex-1">
              <Link
                href={`/articles/${s.slug}`}
                className="group flex h-full overflow-hidden rounded-lg border border-line bg-surface"
              >
                <div className="relative w-28 shrink-0 sm:w-32">
                  <StoryImage image={s.image} sizes="128px" />
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-accent-ink">{s.category.name}</p>
                  <h2 className="mt-1 line-clamp-3 font-semibold leading-snug group-hover:underline">{s.title}</h2>
                  <StoryMeta publishedAt={s.publishedAt} relative className="mt-2 text-muted" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
