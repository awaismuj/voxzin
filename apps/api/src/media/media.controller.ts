import {
  BadRequestException, Body, Controller, Get, Header, NotFoundException, Param, Patch, Post, Query, Req, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import sharp from 'sharp';
import { mediaListQuery, mediaMetadataInput } from '@voxzin/shared';
import { z } from 'zod';
import { AuditService } from '../auth/audit.service';
import { Roles, RolesGuard, SessionGuard } from '../auth/guards';
import { escapeRegex, type AuthedRequest, type M } from '../common/types';
import { ZodPipe } from '../common/zod.pipe';
import { env } from '../config/env';

const MAX_BYTES = 5 * 1024 * 1024;

/** Detect the real type from magic bytes. The client-supplied MIME type and extension are never trusted. SVG is not accepted. */
function sniff(b: Buffer): { ext: 'png' | 'jpg' | 'webp' | 'gif'; mime: string } | null {
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  if (b.length > 6 && ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('ascii'))) return { ext: 'gif', mime: 'image/gif' };
  return null;
}

@Controller('media')
export class MediaController {
  constructor(
    @InjectModel('Media') private readonly media: M,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'editor', 'author')
  async list(@Query(new ZodPipe(mediaListQuery)) query: z.infer<typeof mediaListQuery>) {
    const filter = query.q ? { originalName: { $regex: escapeRegex(query.q), $options: 'i' } } : {};
    const [items, total] = await Promise.all([
      this.media.find(filter).select('filename originalName mime size alt createdAt')
        .sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit)
        .lean<{ filename: string; originalName?: string; mime?: string; size?: number; alt?: string; createdAt: Date }[]>(),
      this.media.countDocuments(filter),
    ]);
    return {
      items: items.map((item) => ({
        filename: item.filename,
        originalName: item.originalName ?? item.filename,
        mime: item.mime ?? 'application/octet-stream',
        size: item.size ?? 0,
        alt: item.alt ?? '',
        createdAt: item.createdAt.toISOString(),
        url: `/api/v1/media/${item.filename}`,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    };
  }

  @Post()
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'editor', 'author')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('alt') alt: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    if (!file) throw new BadRequestException('Choose an image to upload');
    const type = sniff(file.buffer);
    if (!type) throw new BadRequestException('Only PNG, JPEG, WebP and GIF images are allowed');
    if (alt !== undefined && (typeof alt !== 'string' || alt.trim().length > 300)) {
      throw new BadRequestException('Image description must be 300 characters or fewer');
    }
    let content = file.buffer;
    const ext = 'webp';
    const mime = 'image/webp';
    try {
      const image = sharp(file.buffer, { limitInputPixels: 40_000_000, animated: type.ext === 'gif' });
      const metadata = await image.metadata();
      const isPreparedWebp = type.ext === 'webp'
        && metadata.width !== undefined
        && metadata.height !== undefined
        && metadata.width <= 1280
        && metadata.height <= 1280
        && metadata.orientation === undefined;
      if (isPreparedWebp) {
        content = file.buffer;
      } else {
        content = await image
          .rotate()
          .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 76, effort: 1 })
          .toBuffer();
      }
    } catch {
      throw new BadRequestException('Image could not be processed. Choose a valid PNG, JPEG, WebP or GIF image.');
    }
    const filename = `${randomBytes(16).toString('hex')}.${ext}`;
    const dir = resolve(env.UPLOAD_DIR);
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, filename), content, { flag: 'wx' });
    await this.media.create({
      filename,
      originalName: file.originalname.slice(0, 200),
      mime,
      size: content.length,
      alt: alt?.trim() ?? '',
      uploadedBy: req.auth.user._id,
    });
    await this.audit.log(req.auth.user._id.toString(), 'media.upload', { type: 'media', id: filename }, { size: content.length }, req.ip);
    return { url: `/api/v1/media/${filename}` };
  }

  @Patch(':file')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('super_admin', 'admin', 'editor', 'author')
  async updateMetadata(
    @Param('file', new ZodPipe(z.string().regex(/^[a-f0-9]{32}\.(png|jpg|webp|gif)$/))) filename: string,
    @Body(new ZodPipe(mediaMetadataInput)) input: z.infer<typeof mediaMetadataInput>,
    @Req() req: AuthedRequest,
  ) {
    const result = await this.media.updateOne({ filename }, { $set: { alt: input.alt } });
    if (result.matchedCount === 0) throw new NotFoundException('Image not found');
    await this.audit.log(req.auth.user._id.toString(), 'media.update', { type: 'media', id: filename }, { fields: ['alt'] }, req.ip);
    return { ok: true };
  }

  @Get(':file')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; sandbox")
  serve(@Param('file') file: string, @Res() res: Response) {
    if (!/^[a-f0-9]{32}\.(png|jpg|webp|gif)$/.test(file)) throw new NotFoundException();
    res.sendFile(
      resolve(env.UPLOAD_DIR, file),
      { maxAge: '1y', immutable: true },
      (err) => {
        if (err && !res.headersSent) res.status(404).end();
      },
    );
  }
}
