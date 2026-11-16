/* Seeds the default categories and syncs indexes. Safe to re-run. No articles are created. */
import mongoose from 'mongoose';
import { DEFAULT_CATEGORIES, DEFAULT_TREND_COUNTRIES } from '@voxzin/shared';
import { env } from '../config/env';
import { ArticleSchema, AuthorSchema, CategorySchema, CountrySchema } from '../schemas';

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  const Category = mongoose.model('Category', CategorySchema);
  const Article = mongoose.model('Article', ArticleSchema);
  const Author = mongoose.model('Author', AuthorSchema);
  const Country = mongoose.model('Country', CountrySchema);

  for (const [order, c] of DEFAULT_CATEGORIES.entries()) {
    await Category.updateOne({ slug: c.slug }, { $setOnInsert: { ...c, order, isActive: true } }, { upsert: true });
  }
  for (const c of DEFAULT_TREND_COUNTRIES) {
    await Country.updateOne({ code: c.code }, { $setOnInsert: c }, { upsert: true });
  }
  await Promise.all([Category.syncIndexes(), Country.syncIndexes(), Article.syncIndexes(), Author.syncIndexes()]);
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories, ${DEFAULT_TREND_COUNTRIES.length} countries and synced indexes.`);
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
