import Link from 'next/link';
import { useId } from 'react';

/** Vector speech-bubble "V" mark. Scales crisply at any size and needs no image request. */
export function BrandMark({ className = 'size-9' }: { className?: string }) {
  const gradientId = `vz-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradientId} x1="4" y1="38" x2="36" y2="2" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ec4899" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      <path
        d="M10 2h20a8 8 0 0 1 8 8v15a8 8 0 0 1-8 8H20l-8.5 6v-6H10a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8Z"
        fill={`url(#${gradientId})`}
      />
      <path d="M11.5 12 20 26.5 28.5 12" fill="none" stroke="#fff" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Standard news-site lockup: compact mark + a single-weight wordmark. */
export function BrandLogo() {
  return (
    <Link href="/" aria-label="Voxzin home" className="inline-flex shrink-0 items-center gap-2.5">
      <BrandMark className="size-9 sm:size-10" />
      <span className="font-sans text-[1.65rem] font-extrabold leading-none tracking-tight text-white sm:text-[1.85rem]">
        Voxzin
      </span>
    </Link>
  );
}
