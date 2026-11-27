'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { canTransition, TRANSITIONS, type ArticleStatus, type Role } from '@voxzin/shared';
import { adminFetch } from '@/lib/admin-client';
import { td, th } from './ui';
import { formatDate } from '@/lib/utils';

interface Item {
  id: string;
  title: string;
  status: ArticleStatus;
  category: string;
  author: string;
  updatedAt: string;
}

function StatusControl({ article, role, onChanged }: { article: Item; role: Role; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const options = TRANSITIONS[article.status].filter((status) =>
    status !== 'scheduled' && canTransition(role, article.status, status),
  );
  if (!options.length) return <span className="capitalize">{article.status.replace('_', ' ')}</span>;

  async function changeStatus(status: ArticleStatus) {
    setBusy(true);
    setMessage('');
    try {
      await adminFetch(`/admin/articles/${article.id}/transition`, { method: 'POST', body: { status } });
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not change status.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label>
        <span className="sr-only">Change status for {article.title}</span>
        <select
          className="max-w-40 rounded-md border border-line bg-surface px-2 py-1 text-sm capitalize"
          value=""
          disabled={busy}
          onChange={(event) => {
            const value = event.target.value as ArticleStatus;
            if (value) void changeStatus(value);
          }}
        >
          <option value="">{busy ? 'Saving…' : article.status.replace('_', ' ')}</option>
          {options.map((status) => <option key={status} value={status}>{`Move to ${status.replace('_', ' ')}`}</option>)}
        </select>
      </label>
      {message && <p role="alert" className="mt-1 max-w-48 text-xs text-red-600">{message}</p>}
    </div>
  );
}

export function ArticleList({ items, role }: { items: Item[]; role: Role }) {
  const router = useRouter();
  return (
    <>
      <ul className="space-y-3 md:hidden">
        {items.length === 0 && <li className="rounded-lg border border-line p-4 text-sm text-muted">No articles match.</li>}
        {items.map((article) => (
          <li key={article.id} className="rounded-lg border border-line bg-surface p-4">
            <Link href={`/admin/articles/${article.id}`} className="font-medium text-accent-ink hover:underline">{article.title}</Link>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs uppercase text-muted">Status</dt><dd className="mt-1"><StatusControl article={article} role={role} onChanged={() => router.refresh()} /></dd></div>
              <div><dt className="text-xs uppercase text-muted">Category</dt><dd className="mt-1">{article.category}</dd></div>
              <div><dt className="text-xs uppercase text-muted">Author</dt><dd className="mt-1">{article.author}</dd></div>
              <div><dt className="text-xs uppercase text-muted">Updated</dt><dd className="mt-1">{formatDate(article.updatedAt)}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface md:block">
        <table className="w-full">
          <thead><tr><th className={th}>Title</th><th className={th}>Status</th><th className={th}>Category</th><th className={th}>Author</th><th className={th}>Updated</th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td className={td} colSpan={5}>No articles match.</td></tr>}
            {items.map((article) => (
              <tr key={article.id} className="border-t border-line">
                <td className={td}><Link href={`/admin/articles/${article.id}`} className="font-medium text-accent-ink hover:underline">{article.title}</Link></td>
                <td className={td}><StatusControl article={article} role={role} onChanged={() => router.refresh()} /></td>
                <td className={td}>{article.category}</td><td className={td}>{article.author}</td>
                <td className={td}>{formatDate(article.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
