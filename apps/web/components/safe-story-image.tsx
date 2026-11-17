'use client';

import Image from 'next/image';
import { useState } from 'react';

const PLACEHOLDER = 'absolute inset-0 bg-linear-to-br from-[#101c32] to-[#1d4e7a]';

/**
 * `contain` shows the whole uploaded image (nothing is cropped). Any leftover space is filled with a
 * blurred copy of the same picture, so mixed aspect ratios still look finished instead of letter-boxed.
 */
export function SafeStoryImage({
  src,
  alt,
  sizes,
  priority,
  remote,
  fit,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority: boolean;
  remote: boolean;
  fit: 'cover' | 'contain';
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={PLACEHOLDER} aria-hidden />;
  const contain = fit === 'contain';
  const fitClass = contain ? 'object-contain' : 'object-cover';
  const onError = () => setFailed(true);

  if (!remote) {
    return (
      <>
        {contain && (
          <img src={src} alt="" aria-hidden loading="lazy" className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl" />
        )}
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} onError={onError} className={`absolute inset-0 size-full ${fitClass}`} />
      </>
    );
  }
  return (
    <>
      {contain && (
        <Image src={src} alt="" aria-hidden fill sizes="64px" className="scale-110 object-cover opacity-60 blur-2xl" />
      )}
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} onError={onError} className={fitClass} />
    </>
  );
}
