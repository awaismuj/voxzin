'use client';

import Image from 'next/image';
import { useState } from 'react';

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
  if (failed) return <div className="absolute inset-0 bg-linear-to-br from-[#101c32] to-[#1d4e7a]" aria-hidden />;
  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';
  if (!remote) {
    return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} onError={() => setFailed(true)} className={`absolute inset-0 size-full ${fitClass}`} />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} onError={() => setFailed(true)} className={fitClass} />;
}
