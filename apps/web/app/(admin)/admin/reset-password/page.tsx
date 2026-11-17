import { ResetPasswordForm } from '@/components/admin/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="font-serif text-3xl font-semibold">Voxzin</p>
      <p className="mb-8 mt-1 text-sm text-muted">Choose a new password</p>
      <ResetPasswordForm />
    </div>
  );
}
