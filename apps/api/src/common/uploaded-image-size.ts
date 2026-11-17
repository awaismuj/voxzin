import { closeSync, openSync, readSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/env';
import { readImageSize, type ImageSize } from './image-size';

const MEDIA_URL = /^\/api\/v1\/media\/([a-f0-9]{32}\.(?:png|jpg|webp|gif))$/;
const cache = new Map<string, ImageSize>(); // uploaded files never change (the name is a hash), so cache forever

/** Size of an image uploaded through the CMS, or null for any other URL / unreadable file. */
export function uploadedImageSize(url: string): ImageSize | null {
  const file = MEDIA_URL.exec(url)?.[1];
  if (!file) return null;
  const hit = cache.get(file);
  if (hit) return hit;
  let fd: number | undefined;
  try {
    fd = openSync(resolve(env.UPLOAD_DIR, file), 'r');
    const buf = Buffer.alloc(256 * 1024);
    const read = readSync(fd, buf, 0, buf.length, 0);
    const size = readImageSize(buf.subarray(0, read));
    if (size) cache.set(file, size);
    return size;
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
