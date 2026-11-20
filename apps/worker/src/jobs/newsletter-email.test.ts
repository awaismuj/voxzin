import { describe, expect, it } from 'vitest';
import { articleNewsletterEmail } from './newsletter-email';

describe('article newsletter email', () => {
  it('creates a linked, escaped summary with an unsubscribe link', () => {
    const email = articleNewsletterEmail({
      title: 'News <today>',
      slug: 'news-today',
      excerpt: 'A & B',
      featuredImage: { url: '/api/v1/media/cover.webp', alt: '"Cover"' },
    }, 'https://voxzin.com', 'https://voxzin.com/api/v1/newsletter/unsubscribe-one-click?token=abc');

    expect(email.subject).toBe('VoxZin: News <today>');
    expect(email.articleUrl).toBe('https://voxzin.com/articles/news-today');
    expect(email.html).toContain('News &lt;today&gt;');
    expect(email.html).toContain('A &amp; B');
    expect(email.html).toContain('https://voxzin.com/api/v1/media/cover.webp');
    expect(email.html).toContain('href="https://voxzin.com/articles/news-today"');
    expect(email.text).toContain('Unsubscribe: https://voxzin.com/api/v1/newsletter/unsubscribe-one-click?token=abc');
  });
});
