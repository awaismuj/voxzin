export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://voxzin.com').replace(/\/+$/, '');
export const SITE_NAME = 'VoxZin';
export const SITE_TAGLINE = "The Voice of What's Trending.";

/** Turns /path or an uploaded-image path into a full https://... address (search engines need absolute URLs). */
export const absoluteUrl = (pathOrUrl: string) => new URL(pathOrUrl, `${SITE_URL}/`).toString();

export function isCanonicalArticle(article: { slug: string; canonicalUrl: string | null }): boolean {
  if (!article.canonicalUrl) return true;
  const canonical = new URL(article.canonicalUrl);
  const articleUrl = new URL(`/articles/${article.slug}`, SITE_URL);
  canonical.hash = '';
  articleUrl.hash = '';
  canonical.pathname = canonical.pathname.replace(/\/+$/, '') || '/';
  articleUrl.pathname = articleUrl.pathname.replace(/\/+$/, '') || '/';
  return canonical.href === articleUrl.href;
}
