'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../../lib/api';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@askdb/ui';
import type { RegisterDto } from '@askdb/types';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      // Ensure all values are strings (never undefined) and trim them
      const phoneValue = (formData.phone || '').trim();
      const registerData: RegisterDto = {
        name: (formData.name || '').trim(),
        email: (formData.email || '').trim().toLowerCase(),
        phone: phoneValue || undefined, // Convert empty string to undefined (RegisterDto expects string | undefined)
        password: (formData.password || '').trim(),
      };

      // Validate required fields
      if (!registerData.name) {
        setError('Name is required');
        setLoading(false);
        return;
      }
      if (!registerData.email) {
        setError('Email is required');
        setLoading(false);
        return;
      }
      if (!registerData.password) {
        setError('Password is required');
        setLoading(false);
        return;
      }
      if (registerData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      await authApi.register(registerData);
      router.push('/login');
    } catch (err: any) {
      // Extract error message from axios error response
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Sign up for AskYourDatabase</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
            )}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name ?? ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value || '' })}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email ?? ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value || '' })}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone <span className="text-gray-400 text-xs">(optional)</span>
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone ?? ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value || '' })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password ?? ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value || '' })}
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500">Must be at least 6 characters</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </Button>
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-primary hover:underline">
                Login
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

