'use client';

import type { SyntheticEvent } from 'react';

function showImageFallback(event: SyntheticEvent<HTMLDivElement>) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  const fallback = document.createElement('div');
  fallback.className = 'article-image-placeholder';
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', image.alt || 'Article image unavailable');
  fallback.dataset.align = image.dataset.align ?? 'center';
  fallback.dataset.size = image.dataset.size ?? 'large';
  fallback.textContent = 'Image unavailable';
  image.replaceWith(fallback);
}

export function ArticleBody({ html }: { html: string }) {
  return (
    <div
      className="article-body"
      onErrorCapture={showImageFallback}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
