'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { authApi } from '../../../lib/api';
import { Button, Input, Checkbox } from '@askdb/ui';
import type { LoginDto } from '@askdb/types';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginDto>({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = (formData.email || '').trim().toLowerCase();
    const password = (formData.password || '').trim();

    if (!email) { toast.error('Email is required'); return; }
    if (!password) { toast.error('Password is required'); return; }

    setLoading(true);

    const loadingToast = toast.loading('Signing you in…');

    try {
      await authApi.login({ email, password });
      toast.dismiss(loadingToast);
      toast.success('Welcome back! Redirecting…');
      router.push('/dashboard');
    } catch (err: any) {
      toast.dismiss(loadingToast);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Invalid email or password. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left — gradient panel */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex flex-col justify-between p-16">
        <div className="absolute inset-0 bg-[#0A1A44] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-blue-500/70 via-indigo-600/60 to-purple-600/40 blur-[100px] animate-pulse duration-[8000ms]" />
          <div className="absolute bottom-[0%] right-[-10%] w-[90%] h-[90%] rounded-full bg-gradient-to-tl from-cyan-400/60 via-blue-500/50 to-indigo-700/40 blur-[120px]" />
          <div className="absolute top-[20%] right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-400/30 blur-[90px]" />
          <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]" />
          <div
            className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
            }}
          />
        </div>

        <div className="relative z-10 mt-12">
          <p className="text-base font-medium text-blue-100/80 mb-4 opacity-90">You can easily</p>
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl max-w-xl leading-[1.1] drop-shadow-sm">
            Talk to your database,{'\n'}get answers instantly.
          </h1>
        </div>

        <div className="relative z-10 mb-8">
          <p className="text-sm font-medium text-blue-200/70 mb-6 text-center tracking-wide">Our partners</p>
          <div className="flex items-center justify-center gap-10 text-white/90">
            {[
              { name: 'Discord', icon: <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" /> },
            ].map(() => null)}
            <span className="font-bold text-lg">Discord</span>
            <span className="font-bold text-lg">Instagram</span>
            <span className="font-bold text-lg">Spotify</span>
            <span className="font-bold text-lg">YouTube</span>
            <span className="font-bold text-lg">TikTok</span>
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Welcome back</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">Sign in to your AskYourDatabase account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email ?? ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
                className="h-12 border-input/60 rounded-[8px] bg-background px-4 text-[15px] shadow-sm placeholder:text-muted-foreground/60 focus-visible:border-indigo-600 focus-visible:ring-1 focus-visible:ring-indigo-600"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password ?? ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  className="h-12 border-input/60 rounded-[8px] bg-background pl-4 pr-11 text-[15px] shadow-sm placeholder:text-muted-foreground/60 focus-visible:border-indigo-600 focus-visible:ring-1 focus-visible:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="terms"
                className="rounded h-[18px] w-[18px] border-muted-foreground/40 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
              />
              <label htmlFor="terms" className="text-[13.5px] font-medium text-muted-foreground">
                I agree to the{' '}
                <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
                  Terms &amp; Privacy
                </Link>
              </label>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[8px] bg-[#4338ca] hover:bg-[#3730a3] text-white text-base font-semibold shadow-[0_4px_14px_0_rgba(67,56,202,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(67,56,202,0.23)] hover:-translate-y-[1px]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Log in'
                )}
              </Button>
            </div>

            <p className="text-center text-[14.5px] font-medium text-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[#4338ca] hover:text-[#3730a3] hover:underline">
                Sign up
              </Link>
            </p>

            {/* OAuth divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/80" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground/80 font-medium">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                type="button"
                className="w-full h-11 rounded-[8px] border-border bg-background hover:bg-muted/50 font-semibold text-[14px] shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </Button>
              <Button
                variant="outline"
                type="button"
                className="w-full h-11 rounded-[8px] border-border bg-background hover:bg-muted/50 font-semibold text-[14px] shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="currentColor">
                  <path d="M16.365 7.022c.983-1.185 1.644-2.83 1.464-4.522-1.455.058-3.218.966-4.237 2.188-.897.98-1.684 2.665-1.468 4.316 1.63.125 3.255-.794 4.241-1.982zM17.078 20.316c-1.157 1.666-2.353 3.33-4.148 3.364-1.761.03-2.332-1.04-4.341-1.04-2.012 0-2.64 1.002-4.345 1.07-1.76.069-3.136-1.802-4.301-3.484-2.361-3.414-4.17-9.61-1.751-13.82 1.2-2.086 3.284-3.411 5.568-3.447 1.706-.03 3.303 1.144 4.342 1.144 1.036 0 2.981-1.411 5.034-1.205 1.341.058 3.864.542 5.485 2.923-4.298 2.62-3.642 8.791.667 10.59-1.01 2.502-2.898 5.61-2.906 5.626h-.002z" />
                </svg>
                Apple
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
