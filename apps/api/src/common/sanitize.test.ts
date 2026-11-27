import { describe, expect, it } from 'vitest';
import { sanitizeArticleHtml } from './sanitize';

describe('sanitizeArticleHtml', () => {
  it('removes scripts and event handlers', () => {
    const out = sanitizeArticleHtml('<p onclick="x()">Hi</p><script>alert(1)</script>');
    expect(out).toBe('<p>Hi</p>');
  });
  it('blocks javascript: links', () => {
    expect(sanitizeArticleHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript:');
  });
  it('forces rel on links and keeps https images only', () => {
    expect(sanitizeArticleHtml('<a href="https://a.com">a</a>')).toContain('rel="noopener noreferrer"');
    expect(sanitizeArticleHtml('<img src="http://a.com/x.png">')).not.toContain('src=');
  });
  it('preserves safe image layout attributes but strips inline styles', () => {
    const out = sanitizeArticleHtml('<img src="https://a.com/x.png" data-align="left" data-size="medium" style="position:fixed">');
    expect(out).toContain('data-align="left"');
    expect(out).toContain('data-size="medium"');
    expect(out).not.toContain('style=');
  });

  it('converts paragraph-wrapped markdown H2 markers into semantic headings', () => {
    expect(sanitizeArticleHtml('<p>## A section heading</p><p>### Not converted to H2</p>'))
      .toBe('<h2>A section heading</h2><p>### Not converted to H2</p>');
  });
});
