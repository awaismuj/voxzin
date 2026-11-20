import { cn } from '@/lib/utils';
import { StoryImage } from './story-image';

type FrameImage = { url: string; alt: string; width?: number; height?: number } | null;

const WIDE = 16 / 9;

/** Story cards use a consistent 16:9 crop; natural mode retains a bounded, uncropped image shape. */
export function StoryFrame({
  image,
  sizes,
  mode,
  priority = false,
  className,
  aspectRatio,
}: {
  image: FrameImage;
  sizes: string;
  mode: 'natural' | 'card';
  priority?: boolean;
  className?: string;
  aspectRatio?: number;
}) {
  const ratio = image?.width && image?.height ? image.width / image.height : null;
  const frame = aspectRatio ?? (mode === 'natural' ? Math.min(2.4, Math.max(1, ratio ?? WIDE)) : WIDE);
  const exact = ratio !== null && Math.abs(ratio / frame - 1) <= (mode === 'natural' ? 0.02 : 0.08);
  return (
    <div className={cn('relative overflow-hidden bg-navy', className)} style={{ aspectRatio: String(frame) }}>
      <StoryImage image={image} sizes={sizes} priority={priority} fit={mode === 'card' || exact ? 'cover' : 'contain'} />
    </div>
  );
}
