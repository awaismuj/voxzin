import Link from 'next/link';
import type { ArticleSummary } from '@voxzin/shared';
import { StoryFrame } from './story-frame';
import { StoryMeta } from './story-meta';

export function Hero({ lead, side }: { lead: ArticleSummary; side: ArticleSummary[] }) {
  return (
    <section aria-label="Top stories" className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-[1.9fr_1fr]">
      <Link
        href={`/articles/${lead.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-lg"
      >
        <StoryFrame image={lead.image} sizes="(min-width: 1024px) 62vw, 100vw" mode="natural" priority />
        <div className="flex flex-1 flex-col p-5 sm:p-7">
          <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-ink">
            {lead.category.name}
          </span>
          <h1 className="mt-3 font-serif text-2xl font-bold leading-tight tracking-tight group-hover:text-accent-ink sm:text-[2rem]">
            {lead.title}
          </h1>
          <p className="mt-3 line-clamp-3 max-w-2xl text-base leading-relaxed text-muted">{lead.excerpt}</p>
          <StoryMeta publishedAt={lead.publishedAt} readingTime={lead.readingTime} className="mt-auto pt-5 text-muted" />
        </div>
      </Link>

      {side.length > 0 && (
        <ul className="flex flex-col gap-4">
          {side.map((s) => (
            <li key={s.id} className="flex-1">
              <Link
                href={`/articles/${s.slug}`}
                className="group flex h-full overflow-hidden rounded-xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-md"
              >
                <StoryFrame image={s.image} sizes="180px" mode="card" className="w-36 shrink-0 self-center sm:w-44 lg:w-40 xl:w-44" />
                <div className="flex min-w-0 flex-col justify-center p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">{s.category.name}</p>
                  <h2 className="mt-1 line-clamp-3 text-[0.95rem] font-semibold leading-snug group-hover:text-accent-ink">{s.title}</h2>
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
