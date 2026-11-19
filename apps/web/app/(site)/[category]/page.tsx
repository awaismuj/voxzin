import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleList } from '@/components/article-list';
import { getArticles, getCategories } from '@/lib/api';
import { parsePage } from '@/lib/page';
import { SITE_NAME, SITE_URL } from '@/lib/site';

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export const revalidate = 300;

async function findCategory(slug: string) {
  return (await getCategories()).find((category) => category.slug === slug);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const cat = await findCategory((await params).category);
  if (!cat) return {};
  const page = parsePage((await searchParams).page);
  const canonical = page > 1 ? `/${cat.slug}/page/${page}` : `/${cat.slug}`;
  const title = page > 1 ? `${cat.name} - Page ${page}` : cat.name;
  return {
    title,
    description: cat.description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: `${SITE_URL}${canonical}`,
      title: `${title} | ${SITE_NAME}`,
      description: cat.description,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const cat = await findCategory((await params).category);
  if (!cat) notFound();
  const page = parsePage((await searchParams).page);
  const data = await getArticles({ category: cat.slug, page });
  return (
    <div className="mx-auto w-full px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl font-semibold">{cat.name}</h1>
      <p className="mt-2 max-w-2xl text-muted">{cat.description}</p>
      <div className="mt-8"><ArticleList data={data} basePath={`/${cat.slug}`} /></div>
    </div>
  );
}
