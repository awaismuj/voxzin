import Image from 'next/image';
import Link from 'next/link';

export function BrandLogo({ priority = false }: { priority?: boolean }) {
  return (
    <Link href="/" aria-label="Voxzin home" className="inline-flex shrink-0 items-center gap-2">
      <span aria-hidden="true" className="relative block size-10 overflow-hidden sm:size-12">
        <Image
          src="/voxzin-logo.png"
          alt=""
          width={356}
          height={84}
          priority={priority}
          className="absolute left-0 top-0 h-full w-auto max-w-none"
        />
      </span>
      <span className="font-sans text-2xl font-bold tracking-tight sm:text-[1.7rem]">
        Vox<span className="bg-gradient-to-r from-pink-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">Zin</span>
        <span className="text-amber-300">.</span>
      </span>
    </Link>
  );
}
