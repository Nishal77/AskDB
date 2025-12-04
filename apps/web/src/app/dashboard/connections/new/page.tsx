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
  const [connectionType, setConnectionType] = useState<'connectionString' | 'supabase'>('connectionString');
  const [connectionString, setConnectionString] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [databasePassword, setDatabasePassword] = useState('');
  const [accessMode, setAccessMode] = useState<'read' | 'write' | 'update' | 'full'>('read');
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

    // Validate based on connection type
    if (connectionType === 'connectionString') {
      if (!connectionString.trim()) {
        setError('Connection string is required');
        setLoading(false);
        return;
      }
    } else if (connectionType === 'supabase') {
      if (!supabaseUrl.trim()) {
        setError('Supabase URL is required');
        setLoading(false);
        return;
      }
      if (!anonKey.trim()) {
        setError('Anon key is required for Supabase');
        setLoading(false);
        return;
      }
    }

    try {
      const formData: CreateConnectionDto = {
        name: name.trim(),
        // For Supabase, construct connection string from URL and anon key
        connectionString: connectionType === 'supabase' 
          ? `${supabaseUrl.trim()}` 
          : connectionString.trim(),
        anonKey: connectionType === 'supabase' ? anonKey.trim() : undefined,
        // Include database password if provided (for full Supabase features)
        password: connectionType === 'supabase' && databasePassword.trim() 
          ? databasePassword.trim() 
          : undefined,
        // Include access mode
        accessMode: accessMode,
      };

      const connection = await connectionsApi.create(formData);
      router.push(`/dashboard/connections/${connection.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen ">
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
                <label className="text-sm font-medium">Connection Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="connectionType"
                      value="connectionString"
                      checked={connectionType === 'connectionString'}
                      onChange={(e) => setConnectionType(e.target.value as 'connectionString' | 'supabase')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Connection String</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="connectionType"
                      value="supabase"
                      checked={connectionType === 'supabase'}
                      onChange={(e) => setConnectionType(e.target.value as 'connectionString' | 'supabase')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Supabase (URL + Anon Key)</span>
                  </label>
                </div>
              </div>

              {connectionType === 'connectionString' ? (
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
                    Supported formats: PostgreSQL, MySQL, MongoDB, NeonDB
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="supabaseUrl" className="text-sm font-medium">
                      Supabase URL
                    </label>
                    <Input
                      id="supabaseUrl"
                      type="url"
                      placeholder="https://xxxxx.supabase.co"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Your Supabase project URL (found in Project Settings → API)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="anonKey" className="text-sm font-medium">
                      Anon Key
                    </label>
                    <Input
                      id="anonKey"
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={anonKey}
                      onChange={(e) => setAnonKey(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Your Supabase anon/public key (found in Project Settings → API)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="databasePassword" className="text-sm font-medium">
                      Database Password <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <Input
                      id="databasePassword"
                      type="password"
                      placeholder="Your database password (for full features)"
                      value={databasePassword}
                      onChange={(e) => setDatabasePassword(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">
                      Your Supabase database password (found in Settings → Database). 
                      <br />
                      <span className="text-blue-600">Optional:</span> Required for full features like listing all tables, complex queries, and better performance.
                      <br />
                      <span className="text-green-600">Without it:</span> Basic SELECT queries will work via REST API.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="accessMode" className="text-sm font-medium">
                      Access Mode
                    </label>
                    <select
                      id="accessMode"
                      value={accessMode}
                      onChange={(e) => setAccessMode(e.target.value as 'read' | 'write' | 'update' | 'full')}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="read">Read Only - SELECT queries only</option>
                      <option value="write">Write - INSERT operations</option>
                      <option value="update">Update - UPDATE operations</option>
                      <option value="full">Full Access - All operations (SELECT, INSERT, UPDATE, DELETE)</option>
                    </select>
                    <p className="text-xs text-gray-500">
                      Select the access level for this connection. This helps enforce security and prevents accidental data modifications.
                    </p>
                  </div>
                </>
              )}

              {connectionType === 'connectionString' && (
                <div className="space-y-2">
                  <label htmlFor="accessMode" className="text-sm font-medium">
                    Access Mode
                  </label>
                  <select
                    id="accessMode"
                    value={accessMode}
                    onChange={(e) => setAccessMode(e.target.value as 'read' | 'write' | 'update' | 'full')}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="read">Read Only - SELECT queries only</option>
                    <option value="write">Write - INSERT operations</option>
                    <option value="update">Update - UPDATE operations</option>
                    <option value="full">Full Access - All operations (SELECT, INSERT, UPDATE, DELETE)</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Select the access level for this connection. This helps enforce security and prevents accidental data modifications.
                  </p>
                </div>
              )}

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

