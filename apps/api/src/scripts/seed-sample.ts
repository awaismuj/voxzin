/*
 * DEVELOPMENT ONLY. Inserts clearly labelled "[Sample]" articles so the layout can be reviewed
 * before the CMS exists. Refuses to run in production. Never publish this content.
 */
import mongoose from 'mongoose';
import { env } from '../config/env';
import { ArticleSchema, AuthorSchema, CategorySchema } from '../schemas';

async function main() {
  if (env.NODE_ENV === 'production') throw new Error('Refusing to insert sample content in production.');
  await mongoose.connect(env.MONGODB_URI);
  const Category = mongoose.model('Category', CategorySchema);
  const Author = mongoose.model('Author', AuthorSchema);
  const Article = mongoose.model('Article', ArticleSchema);

  const author = await Author.findOneAndUpdate(
    { slug: 'sample-desk' },
    { $setOnInsert: { name: 'Sample Desk', slug: 'sample-desk', designation: 'Development sample' } },
    { upsert: true, new: true },
  );
  const cats = await Category.find({ isActive: true }).sort({ order: 1 }).lean();
  if (cats.length === 0) throw new Error('Run "pnpm db:seed" first.');

  const body = '<p>This is placeholder text for layout review only. It is not real reporting.</p><h2>A subheading</h2><p>More placeholder text so the article page shows typography, spacing and reading width.</p><blockquote>A sample quotation block.</blockquote><ul><li>First point</li><li>Second point</li></ul>';
  for (let i = 0; i < 12; i++) {
    const cat = cats[i % cats.length]!;
    await Article.updateOne(
      { slug: `sample-article-${i + 1}` },
      {
        $setOnInsert: {
          title: `[Sample] Placeholder headline ${i + 1} for ${cat.name}`,
          slug: `sample-article-${i + 1}`,
          excerpt: 'Sample excerpt used to review card layout. Replace with real, sourced content from the CMS.',
          content: body,
          category: cat._id,
          author: author._id,
          status: 'published',
          publishedAt: new Date(Date.now() - i * 3_600_000),
          readingTime: 3 + (i % 6),
          isFeatured: i === 0,
          isBreaking: i < 2,
        },
      },
      { upsert: true },
    );
  }
  console.log('Inserted sample articles (dev only).');
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
