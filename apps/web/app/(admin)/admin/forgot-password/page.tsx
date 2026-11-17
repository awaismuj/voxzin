import { BrandLogo } from '@/components/brand-logo';
import { ForgotPasswordForm } from '@/components/admin/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <BrandLogo href={null} className="h-10 text-ink" />
      <p className="mb-8 mt-1 text-sm text-muted">Reset your password</p>
      <ForgotPasswordForm />
    </div>
  );
}
