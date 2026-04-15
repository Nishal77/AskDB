'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@askdb/ui';
import type { CreateConnectionDto } from '@askdb/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionMethod = 'connectionString' | 'supabase';
type AccessMode = 'read' | 'write' | 'update' | 'full';
type TestStatus = 'idle' | 'testing' | 'success' | 'failed';

interface ParseResult {
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the Supabase project reference from a Supabase project URL.
 * e.g. "https://abcdefgh.supabase.co" → "abcdefgh"
 */
function extractSupabaseRef(url: string): string | null {
  try {
    const hostname = new URL(url.trim()).hostname; // "abcdefgh.supabase.co"
    const ref = hostname.split('.')[0];
    return ref && ref.length > 0 ? ref : null;
  } catch {
    return null;
  }
}

/**
 * Build a direct PostgreSQL connection string for a Supabase project.
 * Uses the direct (non-pooler) connection so channel_binding is not required.
 */
function buildSupabaseConnectionString(projectRef: string, password: string): string {
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
}

function detectDatabaseType(connString: string): string | null {
  if (!connString.trim()) return null;
  const s = connString.trim().toLowerCase();
  if (s.startsWith('postgresql://') || s.startsWith('postgres://')) {
    if (s.includes('supabase.co') || s.includes('supabase.com')) return 'Supabase (PostgreSQL)';
    if (s.includes('neon.tech') || s.includes('.neon.')) return 'NeonDB (PostgreSQL)';
    return 'PostgreSQL';
  }
  if (s.startsWith('mysql://') || s.startsWith('mysql2://')) return 'MySQL';
  if (s.startsWith('mongodb://') || s.startsWith('mongodb+srv://')) return 'MongoDB';
  return null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

function getAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : ''}`,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewConnectionPage() {
  const router = useRouter();

  // Form state
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>('connectionString');
  const [name, setName] = useState('');
  const [accessMode, setAccessMode] = useState<AccessMode>('read');

  // Standard URL mode
  const [connectionString, setConnectionString] = useState('');
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Supabase mode
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabasePassword, setSupabasePassword] = useState('');
  const [anonKey, setAnonKey] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleConnectionStringChange = (value: string) => {
    setConnectionString(value);
    setDetectedType(detectDatabaseType(value));
    setParseResult(null);
    setTestStatus('idle');
    setError(null);
  };

  const handleSupabaseUrlChange = (value: string) => {
    setSupabaseUrl(value);
    setTestStatus('idle');
    setError(null);
  };

  const handleAnalyze = async () => {
    const raw = connectionString.trim();
    if (!raw) {
      setError('Please enter a connection string first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setParseResult(null);

    try {
      const res = await fetch(`${API_BASE}/admin/connections/parse`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ connectionString: raw }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to parse connection string');
      }

      const parsed: ParseResult = data.data;
      setParseResult(parsed);
      setDetectedType(`${parsed.type.toUpperCase()} · ${parsed.host}:${parsed.port}/${parsed.database}`);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze connection string');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Optional pre-save live test. Never blocks saving — users can save regardless.
   */
  const handleTestConnection = async () => {
    const dto = buildConnectionDto();
    if (!dto) return;

    setTestStatus('testing');
    setTestMessage('');
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/admin/connections/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(dto),
      });

      const data = await res.json();
      // The /test endpoint always returns 200 with success:true and a result object
      const result = data.data;

      if (result?.success) {
        setTestStatus('success');
        setTestMessage(
          `Connected successfully${result.latencyMs != null ? ` in ${result.latencyMs}ms` : ''}`,
        );
      } else {
        setTestStatus('failed');
        setTestMessage(result?.message || 'Connection test failed');
      }
    } catch (err: any) {
      setTestStatus('failed');
      setTestMessage(err.message || 'Could not reach the API');
    }
  };

  /** Build the DTO that will be sent to POST /admin/connections */
  const buildConnectionDto = (): CreateConnectionDto | null => {
    if (!name.trim()) {
      setError('Connection name is required');
      return null;
    }

    if (connectionMethod === 'connectionString') {
      if (!connectionString.trim()) {
        setError('Connection string is required');
        return null;
      }
      return {
        name: name.trim(),
        connectionString: connectionString.trim(),
        accessMode,
      };
    }

    // Supabase mode
    if (!supabaseUrl.trim()) {
      setError('Supabase project URL is required');
      return null;
    }
    if (!supabasePassword.trim()) {
      setError('Database password is required to connect to Supabase');
      return null;
    }

    const projectRef = extractSupabaseRef(supabaseUrl.trim());
    if (!projectRef) {
      setError(
        'Invalid Supabase URL. Expected format: https://<project-ref>.supabase.co',
      );
      return null;
    }

    return {
      name: name.trim(),
      connectionString: buildSupabaseConnectionString(projectRef, supabasePassword.trim()),
      anonKey: anonKey.trim() || undefined,
      accessMode,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const dto = buildConnectionDto();
    if (!dto) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/admin/connections`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(dto),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const message =
          Array.isArray(data.message)
            ? data.message.join('; ')
            : data.message || data.error || 'Failed to create connection';
        throw new Error(message);
      }

      const connection = data.data;
      router.push(`/dashboard/connections/${connection.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create connection');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────

  const inputClass =
    'flex w-full h-[46px] border border-border/80 rounded-[10px] bg-card px-4 text-[15px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all placeholder:text-muted-foreground/50 focus-visible:outline-none focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca] hover:border-input';

  const isLoading = isSubmitting || isAnalyzing;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-65px)] bg-background py-10">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[900px]">

          {/* Header */}
          <div className="mb-10 text-left border-b border-border/60 pb-8">
            <h1 className="text-[2.25rem] font-semibold tracking-tight text-foreground leading-tight">
              New Connection
            </h1>
            <p className="text-[16px] text-muted-foreground font-medium mt-2">
              Configure your database connection settings. We'll use this to safely analyze and query your data.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">

            {/* Error banner */}
            {error && (
              <div className="p-4 text-[14.5px] text-red-600 bg-red-50/80 rounded-[10px] border border-red-200/60 font-medium shadow-sm">
                <span className="mr-2">⚠</span> {error}
              </div>
            )}

            {/* Test status banner */}
            {testStatus === 'success' && (
              <div className="p-4 text-[14.5px] text-emerald-700 bg-emerald-50/80 rounded-[10px] border border-emerald-200/60 font-medium shadow-sm flex items-center gap-2">
                <span className="block w-2 h-2 rounded-full bg-emerald-500" />
                {testMessage}
              </div>
            )}
            {testStatus === 'failed' && (
              <div className="p-4 text-[14.5px] text-amber-700 bg-amber-50/80 rounded-[10px] border border-amber-200/60 font-medium shadow-sm">
                <span className="mr-2">⚡</span>
                <strong>Connection test failed</strong> — {testMessage}
                <p className="mt-1 text-[13px] font-normal text-amber-600">
                  You can still save the connection. This is common when your local network blocks the database port.
                </p>
              </div>
            )}

            {/* ── Connection Name ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-4 space-y-1">
                <label htmlFor="name" className="text-[15px] font-semibold text-foreground">
                  Connection Name
                </label>
                <p className="text-[13.5px] text-muted-foreground font-medium leading-relaxed">
                  A memorable alias to identify this database within your workspace.
                </p>
              </div>
              <div className="md:col-span-8">
                <input
                  id="name"
                  placeholder="e.g. Production PostgreSQL"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null); }}
                  required
                  className={inputClass}
                />
              </div>
            </div>

            <div className="w-full h-px bg-border/40" />

            {/* ── Connection Method ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-4 space-y-1">
                <label className="text-[15px] font-semibold text-foreground">
                  Connection Method
                </label>
                <p className="text-[13.5px] text-muted-foreground font-medium leading-relaxed">
                  Choose how to provide your database credentials.
                </p>
              </div>
              <div className="md:col-span-8">
                <div className="flex bg-muted/40 p-1 rounded-[12px] border border-border/60">
                  {(
                    [
                      { value: 'connectionString', label: 'Standard URL / Connection String' },
                      { value: 'supabase', label: 'Supabase Wrapper' },
                    ] as const
                  ).map(({ value, label }) => (
                    <label
                      key={value}
                      className={`flex-1 flex items-center justify-center py-2.5 rounded-[8px] cursor-pointer transition-all duration-200 ${
                        connectionMethod === value
                          ? 'bg-white text-[#4338ca] shadow-sm font-semibold border border-border/50'
                          : 'text-muted-foreground hover:text-foreground font-medium border border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="connectionMethod"
                        value={value}
                        checked={connectionMethod === value}
                        onChange={() => {
                          setConnectionMethod(value);
                          setTestStatus('idle');
                          setError(null);
                        }}
                        className="sr-only"
                      />
                      <span className="text-[14px]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Configuration ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-4 space-y-1">
                <label className="text-[15px] font-semibold text-foreground">Configuration</label>
                <p className="text-[13.5px] text-muted-foreground font-medium leading-relaxed">
                  {connectionMethod === 'connectionString'
                    ? 'Paste your full database connection string URI.'
                    : 'Enter your Supabase project details. Get the database password from Supabase → Settings → Database.'}
                </p>
              </div>

              <div className="md:col-span-8 p-6 bg-[#fafafa] dark:bg-muted/10 border border-border/80 rounded-[14px] shadow-sm">

                {connectionMethod === 'connectionString' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="connectionString" className="text-[14.5px] font-semibold text-foreground">
                        Connection String URI
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !connectionString.trim()}
                        className="h-8 px-3 rounded-[8px] border-[#4338ca]/20 text-[#4338ca] bg-white hover:bg-[#4338ca]/5 font-semibold text-[12px] transition-all shadow-sm"
                      >
                        {isAnalyzing ? 'Analyzing…' : 'Analyze Format'}
                      </Button>
                    </div>

                    <textarea
                      id="connectionString"
                      className="w-full min-h-[140px] px-4 py-3 border border-border/80 rounded-[10px] bg-white dark:bg-card text-[14.5px] leading-relaxed font-mono shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus-visible:outline-none focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca] transition-colors placeholder:text-muted-foreground/40 resize-y"
                      placeholder={`postgresql://user:password@host:5432/database?sslmode=require\n\nSupports: PostgreSQL, NeonDB, Supabase, MySQL`}
                      value={connectionString}
                      onChange={(e) => handleConnectionStringChange(e.target.value)}
                    />

                    <div className="flex items-center justify-between">
                      <p className="text-[13px] text-muted-foreground font-medium">
                        Formats: PostgreSQL, MySQL, NeonDB, Supabase
                      </p>
                      {detectedType && (
                        <div className="flex items-center gap-1.5 text-[13px] text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-[6px] border border-emerald-200/60 font-semibold shadow-sm">
                          <span className="block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          {detectedType}
                        </div>
                      )}
                    </div>

                    {/* Parsed details */}
                    {parseResult && (
                      <div className="mt-2 p-3 bg-white border border-border/60 rounded-[10px] text-[13px] font-mono space-y-1">
                        <div className="font-sans text-[12px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Parsed Details</div>
                        <div><span className="text-muted-foreground">Host: </span><span className="text-foreground">{parseResult.host}:{parseResult.port}</span></div>
                        <div><span className="text-muted-foreground">Database: </span><span className="text-foreground">{parseResult.database}</span></div>
                        <div><span className="text-muted-foreground">User: </span><span className="text-foreground">{parseResult.username}</span></div>
                      </div>
                    )}
                  </div>

                ) : (
                  /* ── Supabase Mode ── */
                  <div className="space-y-5">
                    <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-[10px] text-[13px] text-blue-700 font-medium">
                      <strong>Where to find your database password:</strong> Supabase Dashboard → Project Settings → Database → Database Password
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="supabaseUrl" className="text-[14.5px] font-semibold text-foreground">
                        Supabase Project URL
                      </label>
                      <input
                        id="supabaseUrl"
                        type="url"
                        placeholder="https://abcdefgh.supabase.co"
                        value={supabaseUrl}
                        onChange={(e) => handleSupabaseUrlChange(e.target.value)}
                        className={inputClass}
                      />
                      <p className="text-[12.5px] text-muted-foreground">
                        Found in: Project Settings → API → Project URL
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="supabasePassword" className="text-[14.5px] font-semibold text-foreground">
                        Database Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="supabasePassword"
                        type="password"
                        placeholder="Your Supabase database password"
                        value={supabasePassword}
                        onChange={(e) => { setSupabasePassword(e.target.value); setError(null); }}
                        className={inputClass}
                      />
                      <p className="text-[12.5px] text-muted-foreground">
                        Found in: Project Settings → Database → Database Password
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <label htmlFor="anonKey" className="text-[14.5px] font-semibold text-foreground">
                          API Anon Key
                        </label>
                        <span className="text-[10px] px-2 py-0.5 rounded-[4px] bg-muted/80 text-muted-foreground font-bold uppercase tracking-wider">Optional</span>
                      </div>
                      <input
                        id="anonKey"
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                        value={anonKey}
                        onChange={(e) => setAnonKey(e.target.value)}
                        className={inputClass}
                      />
                      <p className="text-[12.5px] text-muted-foreground">
                        Stored for future REST API queries. Found in: Project Settings → API → Project API keys.
                      </p>
                    </div>

                    {/* Preview the constructed connection string */}
                    {supabaseUrl.trim() && supabasePassword.trim() && (() => {
                      const ref = extractSupabaseRef(supabaseUrl.trim());
                      if (!ref) return null;
                      return (
                        <div className="mt-2 p-3 bg-white border border-border/60 rounded-[10px] text-[12.5px] font-mono text-muted-foreground break-all">
                          <div className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Will connect to</div>
                          db.{ref}.supabase.co:5432/postgres
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full h-px bg-border/40" />

            {/* ── Access Mode ── */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-4 space-y-1">
                <label htmlFor="accessMode" className="text-[15px] font-semibold text-foreground">
                  Access Layer
                </label>
                <p className="text-[13.5px] text-muted-foreground font-medium leading-relaxed">
                  Control the operation scope granted to this workspace instance. Applies instantly.
                </p>
              </div>
              <div className="md:col-span-8">
                <div className="relative">
                  <select
                    id="accessMode"
                    value={accessMode}
                    onChange={(e) => setAccessMode(e.target.value as AccessMode)}
                    className="w-full h-[46px] px-4 border border-border/80 rounded-[10px] bg-card text-[15px] font-medium shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all focus-visible:outline-none focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca] hover:border-input appearance-none"
                  >
                    <option value="read">Read Only (SELECT strictly enforced)</option>
                    <option value="write">Write Access (INSERT operations allowed)</option>
                    <option value="update">Update Access (UPDATE operations allowed)</option>
                    <option value="full">Full Access (All DML operations enabled)</option>
                  </select>
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-border/40" />

            {/* ── Actions ── */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isLoading || testStatus === 'testing'}
                className="px-5 h-[46px] rounded-[10px] border-border/80 font-semibold text-[14px] bg-transparent hover:bg-muted/50 transition-colors shadow-sm"
              >
                {testStatus === 'testing' ? (
                  <span className="flex items-center gap-2">
                    <span className="block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                    Testing…
                  </span>
                ) : (
                  'Test Connection'
                )}
              </Button>

              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  disabled={isLoading}
                  className="px-6 h-[46px] rounded-[10px] border-border/80 font-semibold text-[15px] bg-transparent hover:bg-muted/50 transition-colors shadow-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 h-[46px] rounded-[10px] bg-[#4338ca] hover:bg-[#3730a3] text-white font-semibold text-[15px] shadow-[0_4px_16px_rgba(67,56,202,0.35)] transition-all hover:shadow-[0_6px_24px_rgba(67,56,202,0.30)] hover:-translate-y-[1px]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    'Create Connection'
                  )}
                </Button>
              </div>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
