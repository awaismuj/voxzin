interface NewsletterArticle {
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: { url?: string; alt?: string };
}

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function articleNewsletterEmail(article: NewsletterArticle, siteUrl: string, unsubscribeUrl: string) {
  const articleUrl = new URL(`/articles/${encodeURIComponent(article.slug)}`, siteUrl).toString();
  const imagePath = article.featuredImage?.url;
  const imageUrl = imagePath && (imagePath.startsWith('/api/v1/media/') || imagePath.startsWith('https://'))
    ? new URL(imagePath, `${siteUrl.replace(/\/+$/, '')}/`).toString()
    : null;
  const title = escapeHtml(article.title);
  const excerpt = escapeHtml(article.excerpt);
  const safeArticleUrl = escapeHtml(articleUrl);
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);
  const image = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(article.featuredImage?.alt ?? article.title)}" width="560" style="display:block;width:100%;height:auto;border:0;border-radius:8px;margin:20px 0">`
    : '';
  return {
    subject: `VoxZin: ${article.title}`,
    articleUrl,
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f5f5f2;font-family:Arial,Helvetica,sans-serif;color:#17233f"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f2;padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e5e5e0;border-radius:12px;padding:28px"><tr><td><p style="margin:0 0 8px;color:#98752c;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase">VoxZin Daily Briefing</p><h1 style="margin:0;font-family:Georgia,serif;font-size:28px;line-height:1.25">${title}</h1>${image}<p style="font-size:16px;line-height:1.7">${excerpt}</p><p style="margin:26px 0"><a href="${safeArticleUrl}" style="display:inline-block;background:#17233f;color:#fff;text-decoration:none;padding:13px 20px;border-radius:6px;font-weight:bold">Read the full article on VoxZin</a></p><p style="font-size:13px;line-height:1.6;color:#666">You are receiving this because you confirmed your VoxZin newsletter subscription. <a href="${safeUnsubscribeUrl}" style="color:#17233f">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`,
    text: `VoxZin Daily Briefing\n\n${article.title}\n\n${article.excerpt}\n\nRead the full article on VoxZin: ${articleUrl}\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}
