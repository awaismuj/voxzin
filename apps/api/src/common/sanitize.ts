import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'em', 'b', 'i', 'u', 's',
  'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'pre', 'code',
];

export function normalizeMarkdownHeadings(html: string): string {
  return html.replace(/<p\b[^>]*>\s*##\s+([\s\S]*?)\s*<\/p>/gi, (_match, heading: string) => `<h2>${heading.trim()}</h2>`);
}

/** Sanitizes rich-text article HTML before it is sent to a browser. */
export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(normalizeMarkdownHeadings(html), {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'title', 'rel', 'target'],
      img: ['src', 'alt', 'title', 'width', 'height', 'data-align', 'data-size'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['https'] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: 'noopener noreferrer' },
      }),
    },
  });
}
