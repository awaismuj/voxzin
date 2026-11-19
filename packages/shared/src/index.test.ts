import { describe, expect, it } from 'vitest';
import { articleInput, canTransition, categoryInput, countryCodeSchema, getYouTubeVideoId, listArticlesQuery, mediaListQuery, mediaMetadataInput, slugSchema, slugify } from './index';

describe('slugSchema', () => {
  it('accepts normal slugs', () => expect(slugSchema.safeParse('internet-culture').success).toBe(true));
  it('rejects operators and uppercase', () => {
    expect(slugSchema.safeParse('{"$ne":""}').success).toBe(false);
    expect(slugSchema.safeParse('Tech').success).toBe(false);
  });
});

describe('listArticlesQuery', () => {
  it('applies defaults', () => {
    expect(listArticlesQuery.parse({})).toEqual({ page: 1, limit: 12 });
  });
  it('rejects object-shaped values (NoSQL operator injection)', () => {
    expect(listArticlesQuery.safeParse({ category: { $ne: 'x' } }).success).toBe(false);
  });
  it('caps limit', () => expect(listArticlesQuery.safeParse({ limit: 500 }).success).toBe(false));
});

describe('admin catalogs', () => {
  it('accepts custom category slugs but rejects routes reserved by the site', () => {
    const category = { name: 'Health', slug: 'health', description: '', order: 0, isActive: true };
    expect(categoryInput.safeParse(category).success).toBe(true);
    expect(categoryInput.safeParse({ ...category, slug: 'trending' }).success).toBe(false);
  });
  it('accepts new ISO-style country codes and rejects malformed codes', () => {
    expect(countryCodeSchema.safeParse('JP').success).toBe(true);
    expect(countryCodeSchema.safeParse('jpn').success).toBe(false);
  });
  it('limits media searches and requires useful alt text', () => {
    expect(mediaListQuery.parse({}).limit).toBe(30);
    expect(mediaListQuery.safeParse({ limit: 500 }).success).toBe(false);
    expect(mediaMetadataInput.safeParse({ alt: 'A school classroom' }).success).toBe(true);
    expect(mediaMetadataInput.safeParse({ alt: '  ' }).success).toBe(false);
  });
});


describe('workflow', () => {
  it('authors cannot approve or publish', () => {
    expect(canTransition('author', 'in_review', 'approved')).toBe(false);
    expect(canTransition('author', 'draft', 'in_review')).toBe(true);
    expect(canTransition('author', 'approved', 'published')).toBe(false);
  });
  it('publishing requires approval first', () => {
    expect(canTransition('editor', 'draft', 'published')).toBe(false);
    expect(canTransition('editor', 'in_review', 'approved')).toBe(true);
    expect(canTransition('editor', 'approved', 'published')).toBe(true);
  });
});

describe('slugify', () => {
  it('normalises', () => expect(slugify('  Héllo, World! 2026 ')).toBe('hello-world-2026'));
  it('falls back for non-latin text', () => expect(slugify('اردو')).toBe('item'));
});

describe('articleInput', () => {
  it('rejects non-https sources', () => {
    const r = articleInput.safeParse({
      title: 'A valid title', excerpt: 'A valid excerpt here', content: '<p>Some body text here ok</p>',
      categoryId: 'a'.repeat(24), sources: [{ title: 'x', url: 'http://example.com' }],
    });
    expect(r.success).toBe(false);
  });

  it('accepts supported YouTube URLs and rejects non-YouTube embeds', () => {
    const article = {
      title: 'A valid title', excerpt: 'A valid excerpt here', content: '<p>Some body text here ok</p>',
      categoryId: 'a'.repeat(24),
    };
    expect(articleInput.safeParse({ ...article, youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' }).success).toBe(true);
    expect(articleInput.safeParse({ ...article, youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }).success).toBe(true);
    expect(articleInput.safeParse({ ...article, youtubeUrl: 'https://example.com/embed/dQw4w9WgXcQ' }).success).toBe(false);
    expect(articleInput.safeParse({ ...article, youtubeUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(getYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('accepts and trims an optional focus keyword', () => {
    const article = {
      title: 'A valid title', excerpt: 'A valid excerpt here', content: '<p>Some body text here ok</p>',
      categoryId: 'a'.repeat(24),
    };
    const parsed = articleInput.safeParse({ ...article, focusKeyword: '  global technology  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.focusKeyword).toBe('global technology');
    expect(articleInput.safeParse({ ...article, focusKeyword: 'x'.repeat(81) }).success).toBe(false);
  });
});
