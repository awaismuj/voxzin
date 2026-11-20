import { describe, expect, it } from 'vitest';
import { rankTrendingTags } from './admin-articles.service';

describe('rankTrendingTags', () => {
  const now = new Date('2025-01-15T12:00:00.000Z').getTime();

  it('suggests relevant terms from recent topics and excludes unrelated topics', () => {
    const suggestions = rankTrendingTags(
      'Cyclone Akvan is approaching Odisha and the coast is preparing for landfall.',
      [
        {
          title: 'Cyclone Akvan',
          keywords: ['Odisha landfall'],
          lastUpdatedAt: '2025-01-14T12:00:00.000Z',
          isFeatured: true,
        },
        {
          title: 'Cricket final',
          keywords: ['Pakistan match'],
          lastUpdatedAt: '2025-01-14T12:00:00.000Z',
        },
      ],
      now,
    );

    expect(suggestions.map(({ tag }) => tag)).toEqual(expect.arrayContaining(['Cyclone Akvan', 'Odisha landfall']));
    expect(suggestions.map(({ tag }) => tag)).not.toContain('Cricket final');
  });

  it('deduplicates equivalent tags and ignores topics older than 30 days', () => {
    const suggestions = rankTrendingTags(
      'AI is changing tools and products across the software industry.',
      [
        { title: 'AI', keywords: ['ai'], lastUpdatedAt: '2025-01-14T12:00:00.000Z' },
        { title: 'AI software', keywords: ['software AI'], lastUpdatedAt: '2024-11-01T12:00:00.000Z' },
      ],
      now,
    );

    expect(suggestions.filter(({ tag }) => tag.toLowerCase() === 'ai')).toHaveLength(1);
    expect(suggestions.map(({ tag }) => tag)).not.toContain('AI software');
  });
});
