import { BrandLogo } from '@/components/brand-logo';
import { AcceptInviteForm } from '@/components/admin/accept-invite-form';

export default function AcceptInvitePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <BrandLogo href={null} className="h-10 text-ink" />
      <p className="mb-8 mt-1 text-sm text-muted">Set up your editorial account</p>
      <AcceptInviteForm />
    </div>
  );
}
