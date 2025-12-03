'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { connectionsApi } from '../../../../lib/api';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@askdb/ui';
import type { CreateConnectionDto } from '@askdb/types';

export default function NewConnectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [connectionString, setConnectionString] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const detectConnectionType = (connString: string): string | null => {
    if (!connString || !connString.trim()) {
      return null;
    }
    const trimmed = connString.trim().toLowerCase();
    if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
      if (trimmed.includes('supabase.co')) return 'Supabase (PostgreSQL)';
      if (trimmed.includes('neon.tech') || trimmed.includes('neon')) return 'NeonDB (PostgreSQL)';
      return 'PostgreSQL';
    }
    if (trimmed.startsWith('mysql://') || trimmed.startsWith('mysql2://')) {
      return 'MySQL';
    }
    if (trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://')) {
      return 'MongoDB';
    }
    return null;
  };

  const handleConnectionStringChange = (value: string) => {
    setConnectionString(value);
    const detected = detectConnectionType(value);
    setDetectedType(detected);
  };

  const handleAnalyze = async () => {
    if (!connectionString.trim()) {
      setError('Please enter a connection string');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      const response = await fetch(`${apiBaseUrl}/admin/connections/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ connectionString }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to parse connection string');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setDetectedType(`${data.data.type.toUpperCase()} - ${data.data.host}:${data.data.port}/${data.data.database}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze connection string');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError('Connection name is required');
      setLoading(false);
      return;
    }

    if (!connectionString.trim()) {
      setError('Connection string is required');
      setLoading(false);
      return;
    }

    try {
      const formData: CreateConnectionDto = {
        name: name.trim(),
        connectionString: connectionString.trim(),
        anonKey: anonKey.trim() || undefined, // Only include if provided
      };

      await connectionsApi.create(formData);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => router.push('/dashboard')} className="text-xl font-bold">
                AskYourDatabase
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>New Database Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Connection Name
                </label>
                <Input
                  id="name"
                  placeholder="My Database Connection"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="connectionString" className="text-sm font-medium">
                    Connection String
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !connectionString.trim()}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
                <textarea
                  id="connectionString"
                  className="w-full min-h-[120px] px-3 py-2 border border-input rounded-md bg-background text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="postgresql://user:password@host:port/database?sslmode=require"
                  value={connectionString}
                  onChange={(e) => handleConnectionStringChange(e.target.value)}
                  required
                />
                {detectedType && (
                  <p className="text-xs text-green-600 bg-green-50 p-2 rounded-md border border-green-200">
                    ✓ Detected: {detectedType}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Supported formats: PostgreSQL, MySQL, MongoDB, Supabase, NeonDB
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="anonKey" className="text-sm font-medium">
                  Anon Key <span className="text-gray-400 text-xs font-normal">(optional - for Supabase and similar services)</span>
                </label>
                <Input
                  id="anonKey"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Required for Supabase REST API access. Leave empty if not using Supabase.
                </p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading || isAnalyzing} className="flex-1">
                  {loading ? 'Creating...' : 'Create Connection'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1"
                  disabled={loading || isAnalyzing}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

