import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/article-list';
import { getArticles, getCategories } from '@/lib/api';

export const revalidate = 300;

type Props = { params: Promise<{ category: string; page: string }> };

function parsePageParam(raw: string) {
  const page = Number(raw);
  if (!Number.isInteger(page) || page < 2 || page > 1000) notFound();
  return page;
}

async function loadCategory(slug: string) {
  const category = (await getCategories()).find((item) => item.slug === slug);
  if (!category) notFound();
  return category;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug, page: rawPage } = await params;
  const category = await loadCategory(slug);
  const page = parsePageParam(rawPage);
  return {
    title: `${category.name} - Page ${page}`,
    description: category.description,
    alternates: { canonical: `/${category.slug}/page/${page}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug, page: rawPage } = await params;
  const category = await loadCategory(slug);
  const page = parsePageParam(rawPage);
  const data = await getArticles({ category: category.slug, page });
  return (
    <div className="w-full px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl font-semibold">{category.name} - Page {page}</h1>
      <p className="mt-2 max-w-2xl text-muted">{category.description}</p>
      <div className="mt-8"><ArticleList data={data} basePath={`/${category.slug}`} /></div>
    </div>
  );
}
