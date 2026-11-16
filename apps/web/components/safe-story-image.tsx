'use client';

import Image from 'next/image';
import { useState } from 'react';

export function SafeStoryImage({
  src,
  alt,
  sizes,
  priority,
  remote,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority: boolean;
  remote: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="absolute inset-0 bg-linear-to-br from-[#101c32] to-[#1d4e7a]" aria-hidden />;
  if (!remote) {
    return <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />;
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} onError={() => setFailed(true)} className="object-cover" />;
}
