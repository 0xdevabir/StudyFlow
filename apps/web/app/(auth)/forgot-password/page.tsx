'use client';
import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@studyflow/shared';
import { authClient } from '@studyflow/auth/client';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setLoading(true);
    try {
      const { error } = await authClient.forgetPassword({
        email: values.email,
        redirectTo: '/reset-password',
      });
      if (error) {
        toast.error(error.message ?? 'Could not send reset email');
        return;
      }
      setSent(true);
      toast.success('Check your inbox for a reset link');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          We&apos;ll email you a secure link to reset it.
        </p>
      </div>

      {sent ? (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
          We&apos;ve sent a password reset link to your email. Check your inbox (and spam folder).
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-[var(--color-destructive)]">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        Remembered it?{' '}
        <Link href="/login" className="text-[var(--color-primary)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}