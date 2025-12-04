'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../../../lib/api';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardDescription, Badge, Spinner } from '@askdb/ui';
import type { User } from '@askdb/types';
import Link from 'next/link';
import { Settings, Key, User as UserIcon, Mail, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 text-foreground mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Section */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center">
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-muted-foreground text-lg mt-1">
              Manage your account and API keys
            </p>
          </div>
        </div>
      </div>

      {/* OpenRouter API Key Section */}
      <Card className="mb-6 border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
              <Key className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold">OpenRouter API Key</CardTitle>
              <CardDescription className="mt-1 text-base">
                Add your OpenRouter API key to use your own credits for LLM queries. 
                If not set, the system will use the default API key.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {success && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-muted">
              <CheckCircle2 className="h-5 w-5 text-foreground flex-shrink-0" />
              <p className="text-sm font-medium text-foreground">{success}</p>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          {hasOpenRouterKey && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-muted">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    OpenRouter API key is configured
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your API key is securely stored
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteOpenRouterKey}
                disabled={saving}
                className="gap-2"
              >
                Remove Key
              </Button>
            </div>
          )}

          <form onSubmit={handleSaveOpenRouterKey} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="openRouterKey" className="text-sm font-semibold text-foreground">
                OpenRouter API Key
              </label>
              <Input
                id="openRouterKey"
                type="password"
                placeholder="sk-or-v1-..."
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                disabled={saving}
                className="h-11 border"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                Get your API key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:underline font-medium inline-flex items-center gap-1"
                >
                  openrouter.ai/keys
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
            <Button 
              type="submit" 
              disabled={saving || !openRouterKey.trim()}
              size="lg"
              className="gap-2"
            >
              {saving ? 'Saving...' : hasOpenRouterKey ? 'Update Key' : 'Save Key'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Information Section */}
      <Card className="border-2 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold">Account Information</CardTitle>
              <CardDescription className="mt-1 text-base">
                Your account details and profile information
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Email
                </label>
              </div>
              <p className="text-base font-medium text-foreground ml-6">{user?.email}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Name
                </label>
              </div>
              <p className="text-base font-medium text-foreground ml-6">
                {user?.name || (
                  <span className="text-muted-foreground italic">Not set</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

