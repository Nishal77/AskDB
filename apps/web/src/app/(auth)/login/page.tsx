'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';
import { Button, Input, Checkbox } from '@askdb/ui';
import type { LoginDto } from '@askdb/types';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginDto>({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const loginData: LoginDto = {
        email: (formData.email || '').trim().toLowerCase(),
        password: (formData.password || '').trim(),
      };

      if (!loginData.email) {
        setError('Email is required');
        setLoading(false);
        return;
      }
      if (!loginData.password) {
        setError('Password is required');
        setLoading(false);
        return;
      }

      await authApi.login(loginData);
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Login failed. Please check your credentials and try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Premium Gradient Area */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex flex-col justify-between p-16">
        {/* Abstract shapes for premium glassmorphism/gradient effect */}
        <div className="absolute inset-0 bg-[#0A1A44] pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-blue-500/70 via-indigo-600/60 to-purple-600/40 blur-[100px] animate-pulse duration-[8000ms]" />
          <div className="absolute bottom-[0%] right-[-10%] w-[90%] h-[90%] rounded-full bg-gradient-to-tl from-cyan-400/60 via-blue-500/50 to-indigo-700/40 blur-[120px]" />
          <div className="absolute top-[20%] right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-400/30 blur-[90px]" />
          
          <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]" />
          {/* Subtle noise texture */}
          <div 
            className="absolute inset-0 opacity-[0.15] mix-blend-overlay" 
            style={{ 
              backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' 
            }} 
          />
        </div>

        <div className="relative z-10 mt-12">
          <p className="text-base font-medium text-blue-100/80 mb-4 opacity-90">You can easily</p>
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl max-w-xl leading-[1.1] drop-shadow-sm">
            Speed up your work with our Web App
          </h1>
        </div>

        <div className="relative z-10 mb-8">
          <p className="text-sm font-medium text-blue-200/70 mb-6 text-center tracking-wide">Our partners</p>
          <div className="flex items-center justify-center gap-10 text-white/90">
            <span className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
              Discord
            </span>
            <span className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              Instagram
            </span>
            <span className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.3 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.2-1.261 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.239.54-.959.72-1.56.3z"/></svg>
              Spotify
            </span>
            <span className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              YouTube
            </span>
            <span className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M19.589 6.686a4.793 4.793 0 01-3.77-4.245V2h-3.445v13.673c-.027 1.834-1.536 3.298-3.382 3.298-1.846 0-3.355-1.464-3.382-3.298-.027-1.833 1.436-3.344 3.282-3.38v-3.444A6.745 6.745 0 002.474 15.63c-.053 3.655 2.871 6.643 6.545 6.687 3.675.044 6.7-2.889 6.753-6.544v-5.631a8.318 8.318 0 004.817 1.54V8.228a4.831 4.831 0 01-4.004-1.542z"/></svg>
              TikTok
            </span>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Get Started Now</h2>
            <p className="mt-2 text-[15px] text-muted-foreground">Please log in to your account to continue.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="workmail@gmail.com"
                value={formData.email ?? ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value || '' })}
                required
                disabled={loading}
                className="h-12 border-input/60 rounded-[8px] bg-background px-4 text-[15px] shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:border-indigo-600 focus-visible:ring-1 focus-visible:ring-indigo-600"
              />
            </div>

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
                  onChange={(e) => setFormData({ ...formData, password: e.target.value || '' })}
                  required
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
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox 
                id="terms" 
                className="rounded text-indigo-600 focus:ring-indigo-600 h-[18px] w-[18px] border-muted-foreground/40 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" 
              />
              <label 
                htmlFor="terms" 
                className="text-[13.5px] font-medium leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the <Link href="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">Terms & Privacy</Link>
              </label>
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 rounded-[8px] bg-[#4338ca] hover:bg-[#3730a3] text-white text-base font-semibold shadow-[0_4px_14px_0_rgba(67,56,202,0.39)] transition-all hover:shadow-[0_6px_20px_rgba(67,56,202,0.23)] hover:-translate-y-[1px]" 
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Log in'}
              </Button>
            </div>

            <div className="text-center text-[14.5px] font-medium text-foreground">
              Have an account?{' '}
              <Link
                href="/register"
                className="text-[#4338ca] hover:text-[#3730a3] hover:underline transition-colors"
              >
                Sign up
              </Link>
            </div>

            <div className="relative my-8 pb-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/80" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground/80 font-medium">Or</span>
              </div>
            </div>

            <div className="grid grid-flow-col gap-3">
              <Button 
                variant="outline" 
                type="button" 
                className="w-full h-11 rounded-[8px] border-border bg-background hover:bg-muted/50 text-foreground font-semibold text-[14.5px] shadow-sm transition-all"
              >
                <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Login with Google
              </Button>
              <Button 
                variant="outline" 
                type="button" 
                className="w-full h-11 rounded-[8px] border-border bg-background hover:bg-muted/50 text-foreground font-semibold text-[14.5px] shadow-sm transition-all"
              >
                <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.365 7.022c.983-1.185 1.644-2.83 1.464-4.522-1.455.058-3.218.966-4.237 2.188-.897.98-1.684 2.665-1.468 4.316 1.63.125 3.255-.794 4.241-1.982zM17.078 20.316c-1.157 1.666-2.353 3.33-4.148 3.364-1.761.03-2.332-1.04-4.341-1.04-2.012 0-2.64 1.002-4.345 1.07-1.76.069-3.136-1.802-4.301-3.484-2.361-3.414-4.17-9.61-1.751-13.82 1.2-2.086 3.284-3.411 5.568-3.447 1.706-.03 3.303 1.144 4.342 1.144 1.036 0 2.981-1.411 5.034-1.205 1.341.058 3.864.542 5.485 2.923-4.298 2.62-3.642 8.791.667 10.59-1.01 2.502-2.898 5.61-2.906 5.626h-.002z" />
                </svg>
                Login with Apple
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
