import { describe, expect, it, vi } from 'vitest';
import type { M } from '../common/types';
import type { AuditService } from '../auth/audit.service';
import { FeedbackService } from './feedback.service';

const publishedArticle = { _id: { toString: () => 'article-id' } };

function setup(article = publishedArticle) {
  const articleModel = {
    collection: { name: 'articles' },
    findOne: vi.fn(() => ({ select: () => ({ lean: async () => article }) })),
  };
  const feedbackModel = {
    aggregate: vi.fn(async () => [{
      _id: { toString: () => 'feedback-id' },
      name: 'Sam',
      message: 'A helpful article.',
      status: 'approved' as const,
      isActive: true,
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
      article: { title: 'Published story', slug: 'published-story' },
    }]),
    find: vi.fn(() => {
      const query = {
        sort: () => query,
        skip: () => query,
        limit: () => query,
        lean: async () => [{
          _id: { toString: () => 'feedback-id' },
          name: 'Sam',
          message: 'A helpful article.',
          createdAt: new Date('2026-01-02T03:04:05.000Z'),
        }],
      };
      return query;
    }),
    countDocuments: vi.fn(async () => 1),
    create: vi.fn(async () => ({ _id: { toString: () => 'feedback-id' } })),
  };
  const audit = { log: vi.fn(async () => undefined) };
  const service = new FeedbackService(
    feedbackModel as unknown as M,
    articleModel as unknown as M,
    audit as unknown as AuditService,
  );
  return { service, articleModel, feedbackModel };
}

describe('article feedback', () => {
  it('only includes feedback for published articles on the homepage', async () => {
    const { service, feedbackModel } = setup();
    const result = await service.homepage();
    const pipeline = feedbackModel.aggregate.mock.calls[0]?.[0];

    expect(pipeline).toContainEqual({ $match: { status: 'approved', isActive: true } });
    expect(pipeline).toContainEqual({
      $match: {
        'article.status': 'published',
        'article.publishedAt': expect.objectContaining({ $lte: expect.any(Date) }),
      },
    });
    expect(result.items[0]?.article).toEqual({ title: 'Published story', slug: 'published-story' });
  });

  it('only lists approved and active feedback for live articles', async () => {
    const { service, articleModel, feedbackModel } = setup();
    const result = await service.forArticle('published-story', { page: 1, limit: 10 });

    expect(articleModel.findOne).toHaveBeenCalledWith(expect.objectContaining({ slug: 'published-story', status: 'published' }));
    expect(feedbackModel.find).toHaveBeenCalledWith({ article: publishedArticle._id, status: 'approved', isActive: true });
    expect(result.items).toEqual([{
      id: 'feedback-id',
      name: 'Sam',
      message: 'A helpful article.',
      createdAt: '2026-01-02T03:04:05.000Z',
    }]);
  });

  it('accepts submissions only when the article is published and returns pending status', async () => {
    const { service, feedbackModel } = setup();
    await expect(service.submit('published-story', { name: 'Sam', message: 'A helpful article.' })).resolves.toEqual({
      id: 'feedback-id',
      status: 'pending',
    });
    expect(feedbackModel.create).toHaveBeenCalledWith({
      article: publishedArticle._id,
      name: 'Sam',
      message: 'A helpful article.',
    });

    const unpublished = setup(null);
    await expect(unpublished.service.submit('draft-story', { name: 'Sam', message: 'A helpful article.' })).rejects.toThrow('Article not found');
    expect(unpublished.feedbackModel.create).not.toHaveBeenCalled();
  });
});
