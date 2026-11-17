import { ForgotPasswordForm } from '@/components/admin/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <p className="font-serif text-3xl font-semibold">Voxzin</p>
      <p className="mb-8 mt-1 text-sm text-muted">Reset your password</p>
      <ForgotPasswordForm />
    </div>
  );
}
