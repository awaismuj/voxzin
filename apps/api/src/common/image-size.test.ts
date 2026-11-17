import { describe, expect, it } from 'vitest';
import { readImageSize } from './image-size';

describe('readImageSize', () => {
  it('reads PNG', () => {
    const b = Buffer.alloc(32);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b);
    b.writeUInt32BE(1280, 16);
    b.writeUInt32BE(720, 20);
    expect(readImageSize(b)).toEqual({ width: 1280, height: 720 });
  });

  it('reads GIF', () => {
    const b = Buffer.alloc(16);
    b.write('GIF89a', 0, 'ascii');
    b.writeUInt16LE(640, 6);
    b.writeUInt16LE(480, 8);
    expect(readImageSize(b)).toEqual({ width: 640, height: 480 });
  });

  it('reads JPEG after other segments', () => {
    const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0)]);
    const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, 0x02, 0xd0, 0x05, 0x00, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const b = Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.alloc(8)]);
    expect(readImageSize(b)).toEqual({ width: 1280, height: 720 });
  });

  it('reads WebP (VP8X)', () => {
    const b = Buffer.alloc(32);
    b.write('RIFF', 0, 'ascii');
    b.write('WEBP', 8, 'ascii');
    b.write('VP8X', 12, 'ascii');
    b.writeUIntLE(1199, 24, 3); // width - 1
    b.writeUIntLE(629, 27, 3); // height - 1
    expect(readImageSize(b)).toEqual({ width: 1200, height: 630 });
  });

  it('returns null for unknown data', () => {
    expect(readImageSize(Buffer.from('not an image at all, just text'))).toBeNull();
  });
});
