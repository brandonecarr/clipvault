'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError('App is not yet configured. Please check back soon.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
      } else {
        setDone(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FA] px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6C5CE7]/10">
            <span className="text-3xl">✉️</span>
          </div>
          <h2 className="mb-2 text-xl font-bold text-[#2D3436]">Check your email</h2>
          <p className="mb-6 text-sm text-[#636E72]">
            If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset
            link shortly.
          </p>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-xl bg-[#6C5CE7] px-6 text-sm font-semibold text-white transition hover:bg-[#5849C8]"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FA] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6C5CE7]">
            <span className="text-3xl">📼</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D3436]">Reset your password</h1>
          <p className="mt-1 text-sm text-[#636E72]">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[#636E72]">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E0E0E0] bg-[#F8F9FA] px-4 py-3 text-sm text-[#2D3436] outline-none transition focus:border-[#6C5CE7] focus:ring-2 focus:ring-[#6C5CE7]/20"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-2.5 text-xs text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#6C5CE7] py-3 text-sm font-semibold text-white transition hover:bg-[#5849C8] disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[#636E72]">
          Remember it?{' '}
          <Link href="/login" className="font-semibold text-[#6C5CE7] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
