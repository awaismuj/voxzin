import { AcceptInviteForm } from '@/components/admin/accept-invite-form';

export default function AcceptInvitePage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="font-serif text-3xl font-semibold">Voxzin</p>
      <p className="mb-8 mt-1 text-sm text-muted">Set up your editorial account</p>
      <AcceptInviteForm />
    </div>
  );
}
