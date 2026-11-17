import { cn } from '@/lib/utils';
import { StoryImage } from './story-image';

type FrameImage = { url: string; alt: string; width?: number; height?: number } | null;

const WIDE = 16 / 9;

/**
 * One frame for every story picture, so uploads always sit fully inside it.
 * - mode="natural" (lead story, article page): the frame takes the picture's own shape, so nothing is cropped
 *   and there are no side bars. Very tall or very wide pictures are limited to 1:1 – 2.4:1 and filled with a blurred copy.
 * - mode="card" (thumbnails, grids): a fixed 16:9 frame keeps rows tidy. Pictures within ~8% of 16:9 fill it;
 *   anything else is shown whole over a blurred copy instead of being cropped.
 */
export function StoryFrame({
  image,
  sizes,
  mode,
  priority = false,
  className,
}: {
  image: FrameImage;
  sizes: string;
  mode: 'natural' | 'card';
  priority?: boolean;
  className?: string;
}) {
  const ratio = image?.width && image?.height ? image.width / image.height : null;
  const frame = mode === 'natural' ? Math.min(2.4, Math.max(1, ratio ?? WIDE)) : WIDE;
  const exact = ratio !== null && Math.abs(ratio / frame - 1) <= (mode === 'natural' ? 0.02 : 0.08);
  return (
    <div className={cn('relative overflow-hidden bg-navy', className)} style={{ aspectRatio: String(frame) }}>
      <StoryImage image={image} sizes={sizes} priority={priority} fit={exact ? 'cover' : 'contain'} />
    </div>
  );
}
