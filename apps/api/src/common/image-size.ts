export interface ImageSize {
  width: number;
  height: number;
}

/** Reads width/height from the header of a PNG, JPEG, WebP or GIF buffer. Returns null if unknown. */
export function readImageSize(b: Buffer): ImageSize | null {
  const ok = (width: number, height: number) => (width > 0 && height > 0 ? { width, height } : null);

  // PNG
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47) return ok(b.readUInt32BE(16), b.readUInt32BE(20));
  // GIF
  if (b.length >= 10 && b.subarray(0, 3).toString('ascii') === 'GIF') return ok(b.readUInt16LE(6), b.readUInt16LE(8));
  // WebP
  if (b.length >= 30 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') {
    const kind = b.subarray(12, 16).toString('ascii');
    if (kind === 'VP8 ') return ok(b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff);
    if (kind === 'VP8L') {
      return ok(1 + (((b[22]! & 0x3f) << 8) | b[21]!), 1 + (((b[24]! & 0x0f) << 10) | (b[23]! << 2) | ((b[22]! & 0xc0) >> 6)));
    }
    if (kind === 'VP8X') return ok(1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3));
    return null;
  }
  // JPEG: walk the segments until a start-of-frame marker
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i += 1; continue; }
      const marker = b[i + 1]!;
      if (marker === 0xff) { i += 1; continue; } // fill byte
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; } // no length field
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return ok(b.readUInt16BE(i + 7), b.readUInt16BE(i + 5));
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}
