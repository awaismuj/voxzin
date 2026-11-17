import { BrandLogo } from '@/components/brand-logo';
import { LoginForm } from '@/components/admin/login-form';

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <BrandLogo href={null} className="h-10 text-ink" />
      <p className="mb-8 mt-1 text-sm text-muted">Editorial sign-in</p>
      <LoginForm />
    </div>
  );
}
