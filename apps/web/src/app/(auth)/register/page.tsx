'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';
import { Button, Input, Checkbox } from '@askdb/ui';
import type { RegisterDto } from '@askdb/types';
import { Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterDto>({
    name: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const phoneValue = (formData.phone || '').trim();
      const registerData: RegisterDto = {
        name: (formData.name || '').trim(),
        email: (formData.email || '').trim().toLowerCase(),
        phone: phoneValue || undefined,
        password: (formData.password || '').trim(),
      };

      if (!registerData.name) { setError('Name is required'); setLoading(false); return; }
      if (!registerData.email) { setError('Email is required'); setLoading(false); return; }
      if (!registerData.password) { setError('Password is required'); setLoading(false); return; }
      if (registerData.password.length < 6) { setError('Password must be at least 6 characters long'); setLoading(false); return; }

      await authApi.register(registerData);
      router.push('/login');
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Registration failed. Please check your input and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Premium Gradient Area */}
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
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
            }}
          />
        </div>

        <div className="relative z-10 mt-12">
          <p className="text-base font-medium text-blue-100/80 mb-4 opacity-90">Join thousands of teams</p>
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl max-w-xl leading-[1.1] drop-shadow-sm">
            Query your database with natural language
          </h1>
        </div>

        <div className="relative z-10 mb-8">
          <p className="text-sm font-medium text-blue-200/70 mb-6 text-center tracking-wide">Our partners</p>
          <div className="flex items-center justify-center gap-8 text-white/90 flex-wrap">
            <span className="flex items-center gap-2 font-bold text-base tracking-tight">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
              Discord
            </span>
            <span className="flex items-center gap-2 font-bold text-base tracking-tight">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              Instagram
            </span>
            <span className="flex items-center gap-2 font-bold text-base tracking-tight">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.3 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.2-1.261 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.239.54-.959.72-1.56.3z"/></svg>
              Spotify
            </span>
            <span className="flex items-center gap-2 font-bold text-base tracking-tight">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              YouTube
            </span>
            <span className="flex items-center gap-2 font-bold text-base tracking-tight">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19.589 6.686a4.793 4.793 0 01-3.77-4.245V2h-3.445v13.673c-.027 1.834-1.536 3.298-3.382 3.298-1.846 0-3.355-1.464-3.382-3.298-.027-1.833 1.436-3.344 3.282-3.38v-3.444A6.745 6.745 0 002.474 15.63c-.053 3.655 2.871 6.643 6.545 6.687 3.675.044 6.7-2.889 6.753-6.544v-5.631a8.318 8.318 0 004.817 1.54V8.228a4.831 4.831 0 01-4.004-1.542z"/></svg>
              TikTok
            </span>
          </div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Create Account</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">Sign up for AskYourDatabase — it&apos;s free.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold text-foreground">Name</label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={formData.name ?? ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value || '' })}
                required
                disabled={loading}
                className="h-12 border-input/60 rounded-[8px] bg-background px-4 text-[15px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-indigo-600 focus-visible:ring-1 focus-visible:ring-indigo-600"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">Email address</label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email ?? ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value || '' })}
                required
                disabled={loading}
                className="h-12 border-input/60 rounded-[8px] bg-background px-4 text-[15px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-indigo-600 focus-visible:ring-1 focus-visible:ring-indigo-600"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-semibold text-foreground">
                Phone <span className="text-muted-foreground/60 text-xs font-normal">(optional)</span>
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+9876543210"
                value={formData.phone ?? ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value || '' })}
                disabled={loading}
                className="h-12 border-input/60 rounded-[8px] bg-background px-4 text-[15px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-indigo-600 focus-visible:ring-1 focus-visible:ring-indigo-600"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">Password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password ?? ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value || '' })}
                  required
                  minLength={6}
                  disabled={loading}
                  className="h-12 border-input/60 rounded-[8px] bg-background pl-4 pr-11 text-[15px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-indigo-600 focus-visible:ring-1 focus-visible:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground/70">Must be at least 6 characters</p>
            </div>

            {/* Terms */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="terms"
                className="rounded h-[18px] w-[18px] border-muted-foreground/40 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
              />
              <label htmlFor="terms" className="text-[13.5px] font-medium leading-none text-muted-foreground">
                I agree to the{' '}
                <Link href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Terms &amp; Privacy
                </Link>
              </label>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-[8px] bg-[#4338ca] hover:bg-[#3730a3] text-white text-base font-semibold shadow-[0_4px_14px_0_rgba(67,56,202,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(67,56,202,0.23)] hover:-translate-y-[1px]"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>

            <div className="text-center text-[14.5px] font-medium text-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-[#4338ca] hover:text-[#3730a3] hover:underline transition-colors">
                Log in
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
