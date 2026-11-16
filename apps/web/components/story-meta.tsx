import { formatDate, timeAgo } from '@/lib/utils';

export function StoryMeta({
  publishedAt,
  readingTime,
  relative = false,
  className = '',
}: {
  publishedAt: string;
  readingTime?: number;
  relative?: boolean;
  className?: string;
}) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 text-xs ${className}`}>
      <time dateTime={publishedAt}>{relative ? timeAgo(publishedAt) : formatDate(publishedAt)}</time>
      {readingTime ? <span>{readingTime} min read</span> : null}
    </p>
  );
}
