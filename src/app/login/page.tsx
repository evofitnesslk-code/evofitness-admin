'use client';

import { useState, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('redirectTo', redirectTo);

      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('NEXT_REDIRECT')) {
        return;
      }
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#09090B] relative overflow-hidden">
      {/* Subtle gold luxury ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E5B842]/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative w-36 h-20 mb-3 drop-shadow-[0_8px_16px_rgba(229,184,66,0.15)]">
            <Image
              src="/evofitness-logo.webp"
              alt="EVO Fitness Logo"
              fill
              sizes="144px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-[#F4F4F5] uppercase">
            Membership Portal
          </h1>
          <p className="text-xs text-[#A1A1AA] tracking-wide mt-1">
            Balapokuna Road, Colombo 5
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-0.5 rounded-full bg-[#18181B] border border-[#27272A] text-[11px] text-[#A1A1AA]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#E5B842]" />
            <span>Internal Staff & Admin Access</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="card-luxury rounded-2xl p-6 sm:p-8 backdrop-blur-xl bg-[#121214]/90">
          <h2 className="text-lg font-semibold text-[#F4F4F5] mb-1">
            Sign In
          </h2>
          <p className="text-xs text-[#A1A1AA] mb-6">
            Enter your credentials to access the gym platform.
          </p>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#D4D4D8] mb-1.5"
              >
                Staff Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A1A1AA]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@evofitness.lk"
                  className="w-full h-11 pl-10 pr-4 bg-[#18181B] border border-[#27272A] rounded-xl text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] transition-colors"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#D4D4D8] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A1A1AA]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-11 bg-[#18181B] border border-[#27272A] rounded-xl text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-sm hover:brightness-105 active:brightness-95 transition-all shadow-[0_4px_16px_rgba(229,184,66,0.25)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#09090B] border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In to Dashboard</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-[#71717A] mt-8">
          STRONGER PEOPLE HAPPIER LIVES &bull; FITNESS FOR A BETTER YOU
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B]">
          <div className="w-8 h-8 border-2 border-[#E5B842] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

