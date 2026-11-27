import { notFound } from 'next/navigation';
import { ArticleEditor, type ArticleDoc } from '@/components/admin/article-editor';
import { adminGet, getMe } from '@/lib/admin-server';
import { ApiError } from '@/lib/api';

export default async function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  try {
    const [me, article, categories, authors, navigation] = await Promise.all([
      getMe(), adminGet<ArticleDoc & { id: string }>(`/admin/articles/${id}`),
      adminGet<{ _id: string; name: string }[]>('/admin/categories'), adminGet<{ _id: string; name: string; slug: string }[]>('/admin/authors'),
      adminGet<{ previous: { id: string; title: string } | null; next: { id: string; title: string } | null }>(`/admin/articles/${id}/navigation`),
    ]);
    return (
      <div>
        <h1 className="mb-6 font-serif text-3xl font-semibold">Edit article</h1>
        <ArticleEditor key={`${id}-${article.status}`} role={me!.role} categories={categories} authors={authors} initial={article} navigation={navigation} />
      </div>
    );
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) notFound();
    throw e;
  }
}
