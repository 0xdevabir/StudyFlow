'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@studyflow/shared';
import { authClient } from '@studyflow/auth/client';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: RegisterInput) {
    setLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });
      if (error) {
        toast.error(error.message ?? 'Could not create account');
        return;
      }
      toast.success('Welcome to StudyFlow!');
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    try {
      await authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-in failed');
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Start organising every learning journey.
        </p>
      </div>

      <Button variant="outline" className="w-full" disabled={googleLoading} onClick={onGoogle} type="button">
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <div className="relative text-center">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-[var(--color-border)]" />
        <span className="relative bg-[var(--color-background)] px-2 text-xs text-[var(--color-muted-foreground)]">
          OR
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" placeholder="Ada Lovelace" {...register('name')} />
          {errors.name && <p className="text-xs text-[var(--color-destructive)]">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
          {errors.email && <p className="text-xs text-[var(--color-destructive)]">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password && <p className="text-xs text-[var(--color-destructive)]">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          {errors.confirmPassword && (
            <p className="text-xs text-[var(--color-destructive)]">{errors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--color-primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 11v3.2h7.6c-.3 1.7-2 5-7.6 5A8.2 8.2 0 1 1 12 3.8a7.5 7.5 0 0 1 5.3 2l-2.2 2.2A5.4 5.4 0 0 0 12 6.2a5.8 5.8 0 1 0 0 11.6c3.3 0 4.9-2.4 5.3-3.6H12z"/>
    </svg>
  );
}