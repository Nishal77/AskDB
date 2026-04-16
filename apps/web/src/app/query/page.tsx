'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { connectionsApi, schemaApi, llmApi } from '../../lib/api';
import type { OpenRouterKeyInfo } from '../../lib/api';
import { useQueryAI } from '../../hooks/useQueryAI';
import { SQLViewer } from '../../components/sql-viewer/sql-viewer';
import { ResultTable } from '../../components/result-table/result-table';
import { InsightsDisplay } from '../../components/insights/insights-display';
import {
  Database, ArrowLeft, Zap, Table2, Hash,
  AlertCircle, XCircle, RefreshCw, Sparkles, Cpu,
} from 'lucide-react';
import type { DatabaseConnection } from '@askdb/types';

interface TableInfo { tableName: string; rowCount: number }

const EXAMPLE_QUERIES = [
  'Show all tables and row counts',
  'List the 10 most recent records',
  'Count records in each table',
  'Show column names and types',
];

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K`
  : n.toLocaleString();

export default function QueryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const connectionId = searchParams.get('connectionId') || '';
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean; message: string;
  } | null>(null);

  const [keyInfo, setKeyInfo] = useState<OpenRouterKeyInfo | null>(null);
  const [query, setQuery] = useState('');
  const { executeQuery, loading, error, result, reset } = useQueryAI();

  useEffect(() => {
    if (!connectionId) return;
    connectionsApi.getById(connectionId).then(setConnection).catch(() => router.push('/dashboard'));
    connectionsApi.getStatus(connectionId)
      .then(s => setConnectionStatus({ connected: s.connected, message: s.message }))
      .catch(() => setConnectionStatus({ connected: false, message: 'Unable to check status' }));
    setLoadingTables(true);
    schemaApi.getTablesWithRowCounts(connectionId)
      .then(setTables).catch(() => setTables([]))
      .finally(() => setLoadingTables(false));

    llmApi.getKeyInfo().then(setKeyInfo).catch(() => {});
  }, [connectionId, router]);

  const totalRows = tables.reduce((s, t) => t.rowCount > 0 ? s + t.rowCount : s, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading || !connectionId) return;
    reset();
    executeQuery({ connectionId, naturalLanguageQuery: query.trim() }).catch(() => {});
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (!connectionId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <Database className="h-10 w-10 text-gray-200 mx-auto" />
          <p className="text-gray-400 text-sm">No connection selected</p>
          <button onClick={() => router.push('/dashboard')} className="text-black text-sm font-semibold underline underline-offset-2">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-30 bg-white">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 text-sm font-medium transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Dashboard
        </button>

        <span className="text-gray-200">·</span>

        {connection ? (
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-black flex items-center justify-center flex-shrink-0">
              <Database className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">{connection.name}</span>
            <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{connection.type}</span>
          </div>
        ) : (
          <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
        )}

        {/* Status pill */}
        <div className="ml-auto">
          {connectionStatus && (
            connectionStatus.connected ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Connected
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Connection issue
              </div>
            )
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex w-60 flex-col border-r border-gray-100 flex-shrink-0 bg-white">
          {/* Stats */}
          <div className="px-4 pt-5 pb-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Database</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Table2 className="h-3 w-3 text-gray-400" />
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Tables</span>
                </div>
                <p className="text-lg font-black text-gray-900 leading-none">{loadingTables ? '—' : tables.length}</p>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Hash className="h-3 w-3 text-gray-400" />
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Rows</span>
                </div>
                <p className="text-lg font-black text-gray-900 leading-none">{loadingTables ? '—' : fmt(totalRows)}</p>
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold px-1 mb-2">Tables</p>
            {loadingTables ? (
              <div className="space-y-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 rounded-lg bg-gray-50 animate-pulse" />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <p className="text-gray-300 text-xs px-1">No tables found</p>
            ) : (
              <div className="space-y-px">
                {tables.map(t => (
                  <button
                    key={t.tableName}
                    onClick={() => { setQuery(`Show me all records from ${t.tableName}`); textareaRef.current?.focus(); }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Database className="h-3 w-3 text-gray-300 flex-shrink-0" />
                      <span className="text-[13px] text-gray-500 group-hover:text-gray-900 font-medium truncate transition-colors">{t.tableName}</span>
                    </div>
                    <span className="text-[11px] text-gray-300 group-hover:text-gray-500 font-mono ml-2 flex-shrink-0 transition-colors">
                      {t.rowCount === -1 ? '—' : fmt(t.rowCount)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* AI Credits Card */}
          {keyInfo && (
            <div className="px-4 pb-5 pt-2 border-t border-gray-100 mt-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="h-3 w-3 text-gray-400" />
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">AI Credits</p>
              </div>

              {keyInfo.isFreeTier ? (
                <div className="rounded-xl bg-gray-50 px-3 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-medium">Plan</span>
                    <span className="text-[11px] font-bold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">Free tier</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-medium">Used today</span>
                    <span className="text-[11px] font-bold text-gray-900 font-mono">
                      ${keyInfo.usageDaily.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-medium">All-time</span>
                    <span className="text-[11px] font-bold text-gray-900 font-mono">
                      ${keyInfo.usage.toFixed(4)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 px-3 py-2.5 space-y-2">
                  {keyInfo.limitRemaining !== null && keyInfo.limit !== null && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-gray-400 font-medium">Remaining</span>
                        <span className="text-[12px] font-black text-gray-900 font-mono">
                          ${keyInfo.limitRemaining.toFixed(2)}
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (keyInfo.limitRemaining / keyInfo.limit) * 100)}%`,
                            background: keyInfo.limitRemaining / keyInfo.limit > 0.3
                              ? '#111827'
                              : keyInfo.limitRemaining / keyInfo.limit > 0.1
                              ? '#f59e0b'
                              : '#ef4444',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          ${(keyInfo.limit - keyInfo.limitRemaining).toFixed(2)} used
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ${keyInfo.limit.toFixed(2)} limit
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-gray-400 font-medium">Today</span>
                    <span className="text-[11px] font-bold text-gray-900 font-mono">
                      ${keyInfo.usageDaily.toFixed(4)}
                    </span>
                  </div>
                  {keyInfo.limitReset && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 font-medium">Resets</span>
                      <span className="text-[11px] text-gray-500 font-medium capitalize">{keyInfo.limitReset}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

            {/* ── Query Section (no outer border) ──────────────────── */}
            <div>
              {/* Heading */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-[17px] font-bold text-gray-900 leading-tight">Ask your database</h1>
                  <p className="text-xs text-gray-400 mt-0.5">Write in plain English — AI converts it to SQL</p>
                </div>
                <span className="ml-auto text-[11px] text-gray-300 font-medium hidden sm:block">⌘↩ to run</span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Input — only this has a border */}
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  rows={5}
                  placeholder="e.g. Show me all users who signed up in the last 30 days, ordered by most recent"
                  className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-[14px] text-gray-900 placeholder-gray-300 resize-none focus:outline-none focus:border-gray-900 focus:ring-0 transition-colors leading-relaxed font-medium bg-white"
                />

                {/* Example chips */}
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_QUERIES.map(ex => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => { setQuery(ex); textareaRef.current?.focus(); }}
                      className="text-[12px] text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full px-3.5 py-1.5 transition-all font-medium"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                {/* Error banner */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 rounded-xl px-4 py-3.5">
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] text-red-600 font-medium leading-relaxed">{error}</p>
                  </div>
                )}

                {/* Connection warning (non-blocking) */}
                {connectionStatus && !connectionStatus.connected && (
                  <div className="flex items-start gap-3 bg-amber-50 rounded-xl px-4 py-3.5">
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[13px] text-amber-700 font-medium leading-relaxed">
                      Connection test failed — you can still try running a query.
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="w-full h-12 rounded-2xl bg-black hover:bg-gray-800 text-white font-bold text-[14px] flex items-center justify-center gap-2.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating & running SQL…
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Execute Query
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ── Results (no borders on cards) ────────────────────── */}
            {result && (
              <div className="space-y-8">

                {/* Generated SQL */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Generated SQL</p>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[11px] text-gray-300 font-mono">{result.executionTime}ms</span>
                  </div>
                  <SQLViewer sql={result.sql} />
                </div>

                {/* Results table */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Results</p>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[11px] text-gray-400 font-medium">{result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}</span>
                  </div>
                  <ResultTable columns={result.columns} rows={result.rows} />
                </div>

                {/* Insights */}
                {result.insights && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">AI Insights</p>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <InsightsDisplay insights={result.insights} />
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
