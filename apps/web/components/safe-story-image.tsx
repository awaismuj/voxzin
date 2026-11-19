'use client';

import Image from 'next/image';
import { useState } from 'react';

const PLACEHOLDER = 'absolute inset-0 bg-linear-to-br from-[#101c32] to-[#1d4e7a]';

/** Story images are resized responsively by Next.js; the parent frame supplies the background and aspect ratio. */
export function SafeStoryImage({
  src,
  alt,
  sizes,
  priority,
  fit,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority: boolean;
  fit: 'cover' | 'contain';
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={PLACEHOLDER} aria-hidden />;
  const contain = fit === 'contain';
  const fitClass = contain ? 'object-contain' : 'object-cover';
  const uploadedMedia = /^\/api\/v1\/media\/[a-f0-9]{32}\.webp$/.test(src);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={uploadedMedia}
      decoding="async"
      onError={() => setFailed(true)}
      className={`${PLACEHOLDER} ${fitClass}`}
    />
  );
}
