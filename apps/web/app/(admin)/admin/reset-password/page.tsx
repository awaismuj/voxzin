import { BrandLogo } from '@/components/brand-logo';
import { ResetPasswordForm } from '@/components/admin/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <BrandLogo href={null} className="h-10 text-ink" />
      <p className="mb-8 mt-1 text-sm text-muted">Choose a new password</p>
      <ResetPasswordForm />
    </div>
  );
}
