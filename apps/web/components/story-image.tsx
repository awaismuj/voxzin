import { SafeStoryImage } from './safe-story-image';

/** Renders an image only from the configured media hostname; otherwise a neutral placeholder. Parent must be `relative`. */
export function StoryImage({
  image,
  sizes,
  priority = false,
  fit = 'cover',
}: {
  image: { url: string; alt: string } | null;
  sizes: string;
  priority?: boolean;
  fit?: 'cover' | 'contain';
}) {
  const host = process.env.MEDIA_HOSTNAME;
  let allowed = false;
  // Images uploaded through the CMS are served by our own API via /api/v1/media/*.
  if (!image) return <div className="absolute inset-0 bg-linear-to-br from-[#101c32] to-[#1d4e7a]" aria-hidden />;
  if (/^\/api\/v1\/media\/[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(image.url)) {
    return <SafeStoryImage src={image.url} alt={image.alt} sizes={sizes} priority={priority} fit={fit} />;
  }
  if (image && host) {
    try {
      const u = new URL(image.url);
      allowed = u.protocol === 'https:' && u.hostname === host;
    } catch {
      allowed = false;
    }
  }
  if (!allowed) {
    return <div className="absolute inset-0 bg-linear-to-br from-[#101c32] to-[#1d4e7a]" aria-hidden />;
  }
  return <SafeStoryImage src={image.url} alt={image.alt} sizes={sizes} priority={priority} fit={fit} />;
}
