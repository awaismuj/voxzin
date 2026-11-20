import type {
  AdminNewsletterArticle,
  AdminNewsletterCampaign,
  AdminNewsletterSubscriber,
  Paginated,
} from '@voxzin/shared';
import { NewsletterManager } from '@/components/admin/newsletter-manager';
import { adminGet, requireRole } from '@/lib/admin-server';

interface Status {
  ready: boolean;
  sender: string | null;
  dailyLimit: number;
  dailyUsed: number;
}

export default async function NewsletterAdmin() {
  await requireRole('super_admin', 'admin', 'editor');
  const [articles, subscribers, campaigns, status] = await Promise.all([
    adminGet<AdminNewsletterArticle[]>('/admin/newsletter/articles'),
    adminGet<Paginated<AdminNewsletterSubscriber>>('/admin/newsletter/subscribers'),
    adminGet<{ items: AdminNewsletterCampaign[] }>('/admin/newsletter/campaigns'),
    adminGet<Status>('/admin/newsletter/status'),
  ]);
  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl font-semibold">Newsletter</h1>
      <p className="mb-6 text-sm text-muted">Send a featured article link to readers who confirmed their VoxZin newsletter subscription.</p>
      <NewsletterManager
        articles={articles}
        initialSubscribers={subscribers}
        initialCampaigns={campaigns.items}
        status={status}
      />
    </div>
  );
}
