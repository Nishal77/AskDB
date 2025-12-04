'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../../lib/api';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardDescription } from '@askdb/ui';
import type { User } from '@askdb/types';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await authApi.getMe();
        setUser(userData);
        setHasOpenRouterKey(!!(userData as any).openRouterApiKey);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [router]);

  const handleSaveOpenRouterKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!openRouterKey.trim()) {
        setError('OpenRouter API key is required');
        setSaving(false);
        return;
      }

      await authApi.updateOpenRouterKey(openRouterKey.trim());
      setSuccess('OpenRouter API key saved successfully!');
      setHasOpenRouterKey(true);
      setOpenRouterKey(''); // Clear input after saving
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save OpenRouter key');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOpenRouterKey = async () => {
    if (!confirm('Are you sure you want to remove your OpenRouter API key?')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await authApi.deleteOpenRouterKey();
      setSuccess('OpenRouter API key removed successfully!');
      setHasOpenRouterKey(false);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete OpenRouter key');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Settings</h2>
          <p className="text-gray-600">Manage your account and API keys</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>OpenRouter API Key</CardTitle>
            <CardDescription>
              Add your OpenRouter API key to use your own credits for LLM queries. 
              If not set, the system will use the default API key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md border border-green-200 mb-4">
                {success}
              </div>
            )}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200 mb-4">
                {error}
              </div>
            )}

            {hasOpenRouterKey && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  ✓ OpenRouter API key is configured
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteOpenRouterKey}
                  disabled={saving}
                  className="mt-2"
                >
                  Remove Key
                </Button>
              </div>
            )}

            <form onSubmit={handleSaveOpenRouterKey} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="openRouterKey" className="text-sm font-medium">
                  OpenRouter API Key
                </label>
                <Input
                  id="openRouterKey"
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  disabled={saving}
                />
                <p className="text-xs text-gray-500">
                  Get your API key from{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>
              <Button type="submit" disabled={saving || !openRouterKey.trim()}>
                {saving ? 'Saving...' : hasOpenRouterKey ? 'Update Key' : 'Save Key'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-sm mt-1">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="text-sm mt-1">{user?.name || 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
    </main>
  );
}

