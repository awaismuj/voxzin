import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NewsletterAction } from '@/components/newsletter-action';

export const metadata: Metadata = { title: 'Newsletter', robots: { index: false } };

export default async function NewsletterPage({
  params, searchParams,
}: { params: Promise<{ action: string }>; searchParams: Promise<{ email?: string; token?: string }> }) {
  const { action } = await params;
  const { email, token } = await searchParams;
  if ((action !== 'confirm' && action !== 'unsubscribe') || !email || !token) notFound();
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="font-serif text-3xl font-semibold">{action === 'confirm' ? 'Confirm your subscription' : 'Unsubscribe from the briefing'}</h1>
      <p className="mt-3 text-muted">{email}</p>
      <div className="mt-8"><NewsletterAction action={action} email={email} token={token} /></div>
    </div>
  );
}
