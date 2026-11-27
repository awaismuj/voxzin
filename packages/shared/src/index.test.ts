import { describe, expect, it } from 'vitest';
import {
  articleFeedbackInput,
  articleFeedbackListQuery,
  articleFeedbackPatchInput,
  articleInput,
  adminArticleSeoAssistantQuery,
  adminArticleTagSuggestionsQuery,
  adminNewsletterCampaignInput,
  adminNewsletterSubscribersQuery,
  auditArticleHeadings,
  canTransition,
  categoryInput,
  countryCodeSchema,
  getYouTubeVideoId,
  hasIndexableTrendDescription,
  listArticlesQuery,
  mediaListQuery,
  mediaMetadataInput,
  newsletterOneClickInput,
  slugSchema,
  slugify,
} from './index';

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

describe('hasIndexableTrendDescription', () => {
  it('only treats non-empty descriptions as indexable', () => {
    expect(hasIndexableTrendDescription('A researched topic description.')).toBe(true);
    expect(hasIndexableTrendDescription('  ')).toBe(false);
    expect(hasIndexableTrendDescription(undefined)).toBe(false);
  });
});

describe('auditArticleHeadings', () => {
  it('accepts a single page title with an ordered section outline', () => {
    expect(auditArticleHeadings('<h2>Section</h2><h3>Detail</h3><h4>Nested</h4><h5>Deeper</h5><h6>Deepest</h6><h2>Next section</h2>')).toEqual({
      h1Count: 0,
      sectionHeadingCount: 6,
      skipsLevel: false,
    });
  });

  it('flags extra H1s, missing section headings, and skipped levels', () => {
    expect(auditArticleHeadings('<h1>Another title</h1><h4>Section</h4>')).toEqual({
      h1Count: 1,
      sectionHeadingCount: 1,
      skipsLevel: true,
    });
    expect(auditArticleHeadings('<p>Body</p>')).toEqual({
      h1Count: 0,
      sectionHeadingCount: 0,
      skipsLevel: false,
    });
  });
});

describe('article feedback validation', () => {
  it('trims and bounds public submissions', () => {
    expect(articleFeedbackInput.parse({ name: '  Sam  ', message: '  This article was useful.  ' })).toEqual({
      name: 'Sam',
      message: 'This article was useful.',
    });
    expect(articleFeedbackInput.safeParse({ name: 'S', message: 'short' }).success).toBe(false);
    expect(articleFeedbackInput.safeParse({ name: 'Sam', message: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('defaults public pagination and rejects empty moderation changes', () => {
    expect(articleFeedbackListQuery.parse({})).toEqual({ page: 1, limit: 10 });
    expect(articleFeedbackPatchInput.safeParse({}).success).toBe(false);
    expect(articleFeedbackPatchInput.safeParse({ isActive: false }).success).toBe(true);
  });
});

describe('admin newsletter input', () => {
  it('limits recipient selections to unique valid subscriber IDs', () => {
    const articleId = 'a'.repeat(24);
    const subscriberId = 'b'.repeat(24);
    expect(adminNewsletterCampaignInput.safeParse({ articleId, subscriberIds: [subscriberId] }).success).toBe(true);
    expect(adminNewsletterCampaignInput.safeParse({ articleId, subscriberIds: [subscriberId, subscriberId] }).success).toBe(false);
    expect(adminNewsletterCampaignInput.safeParse({ articleId, subscriberIds: ['someone@example.com'] }).success).toBe(false);
  });

  it('validates subscriber search and pagination', () => {
    expect(adminNewsletterSubscribersQuery.parse({}).limit).toBe(20);
    expect(adminNewsletterSubscribersQuery.safeParse({ q: { $ne: '' } }).success).toBe(false);
    expect(adminNewsletterSubscribersQuery.safeParse({ limit: 500 }).success).toBe(false);
    expect(newsletterOneClickInput.safeParse({ 'List-Unsubscribe': 'One-Click' }).success).toBe(true);
    expect(newsletterOneClickInput.safeParse({ 'List-Unsubscribe': 'subscribe' }).success).toBe(false);
  });
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
  it('allows editorial roles to publish drafts directly while authors still require review', () => {
    expect(canTransition('editor', 'draft', 'published')).toBe(true);
    expect(canTransition('editor', 'research', 'published')).toBe(true);
    expect(canTransition('admin', 'in_review', 'published')).toBe(true);
    expect(canTransition('editor', 'in_review', 'approved')).toBe(true);
    expect(canTransition('editor', 'approved', 'published')).toBe(true);
    expect(canTransition('author', 'draft', 'published')).toBe(false);
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

  it('accepts valid editable slugs and bounds SEO assistant queries', () => {
    const article = {
      title: 'A valid title', excerpt: 'A valid excerpt here', content: '<p>Some body text here ok</p>',
      categoryId: 'a'.repeat(24),
    };
    expect(articleInput.safeParse({ ...article, slug: 'custom-article-url' }).success).toBe(true);
    expect(articleInput.safeParse({ ...article, slug: 'Custom URL' }).success).toBe(false);
    expect(adminArticleSeoAssistantQuery.safeParse({
      slug: 'custom-article-url',
      title: 'A useful headline',
      excludeId: 'b'.repeat(24),
    }).success).toBe(true);
    expect(adminArticleSeoAssistantQuery.safeParse({ slug: { $ne: '' } }).success).toBe(false);
  });

  it('accepts bounded social sharing overrides and rejects overlong values', () => {
    const article = {
      title: 'A valid title', excerpt: 'A valid excerpt here', content: '<p>Some body text here ok</p>',
      categoryId: 'a'.repeat(24),
    };
    const parsed = articleInput.safeParse({
      ...article,
      socialTitle: '  Story for sharing  ',
      socialDescription: '  A separate description for social previews.  ',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.socialTitle).toBe('Story for sharing');
      expect(parsed.data.socialDescription).toBe('A separate description for social previews.');
    }
    expect(articleInput.safeParse({ ...article, socialTitle: 'x'.repeat(71) }).success).toBe(false);
    expect(articleInput.safeParse({ ...article, socialDescription: 'x'.repeat(201) }).success).toBe(false);
  });
});

describe('admin article tag suggestion query', () => {
  it('requires bounded article text for matching suggestions', () => {
    expect(adminArticleTagSuggestionsQuery.safeParse({ q: 'A detailed draft about a topic.' }).success).toBe(true);
    expect(adminArticleTagSuggestionsQuery.safeParse({ q: 'short' }).success).toBe(false);
    expect(adminArticleTagSuggestionsQuery.safeParse({ q: 'x'.repeat(2001) }).success).toBe(false);
  });
});
