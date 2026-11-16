import { ArticleEditor } from '@/components/admin/article-editor';
import { adminGet, getMe } from '@/lib/admin-server';

export default async function NewArticle() {
  const [me, categories, authors] = await Promise.all([getMe(), adminGet<{ _id: string; name: string }[]>('/admin/categories'), adminGet<{ _id: string; name: string }[]>('/admin/authors')]);
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl font-semibold">New article</h1>
      <ArticleEditor role={me!.role} categories={categories} authors={authors} />
    </div>
  );
}
