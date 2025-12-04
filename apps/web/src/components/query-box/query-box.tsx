'use client';

import { useState } from 'react';
import { Button } from '@askdb/ui';
import { Send, Database, CheckCircle2, XCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';

interface TableInfo {
  tableName: string;
  rowCount: number;
}

interface ConnectionStatus {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'error';
  message: string;
}

interface QueryBoxProps {
  onExecute: (query: string) => void;
  loading: boolean;
  error: string | null;
  connectionStatus?: ConnectionStatus | null;
  loadingStatus?: boolean;
  tables?: TableInfo[];
  loadingTables?: boolean;
}

export function QueryBox({ 
  onExecute, 
  loading, 
  error,
  connectionStatus,
  loadingStatus = false,
  tables = [],
  loadingTables = false,
}: QueryBoxProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading && connectionStatus?.connected) {
      onExecute(query.trim());
    }
  };

  const formatRowCount = (count: number): string => {
    if (count === -1) return 'N/A';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const totalEntries = tables.reduce((sum, t) => (t.rowCount > 0 ? sum + t.rowCount : sum), 0);

  return (
    <div className="space-y-6">
      {/* Database Stats Box */}
      {(tables.length > 0 || loadingTables) && (
        <div className="border border-gray-300 rounded-lg px-6 py-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700">
                {loadingTables ? (
                  'Loading...'
                ) : (
                  <>
                      <span className="text-gray-900 font-bold">{tables.length}</span> {tables.length === 1 ? 'table' : 'tables'}
                  </>
                )}
              </span>
            </div>
            {!loadingTables && tables.length > 0 && (
              <>
                <span className="text-gray-300">•</span>
                  <span className="text-sm font-semibold text-gray-700">
                    <span className="text-gray-900 font-bold">{formatRowCount(totalEntries)}</span> total entries
                  </span>
                </>
              )}
            </div>
            {connectionStatus && (
              <div className="flex items-center">
                {loadingStatus ? (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-gray-100 border border-gray-300">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">Checking connection...</span>
                  </div>
                ) : connectionStatus.connected ? (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-green-50 border border-green-300">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-bold text-green-700">Your database is working perfectly</span>
                  </div>
                ) : connectionStatus.status === 'error' ? (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-red-50 border border-red-300">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-bold text-red-700">Connection error detected</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-yellow-50 border border-yellow-300">
                    <XCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-bold text-yellow-700">Database unavailable</span>
                  </div>
                )}
                </div>
            )}
          </div>
          </div>
        )}

      {/* Query Input Box */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">

        {/* Premium Query Input Section */}
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-5">
          {connectionStatus && !connectionStatus.connected && (
              <div className={`p-4 text-sm rounded-lg border ${
              connectionStatus.status === 'error' 
                  ? 'text-red-700 bg-red-50 border-red-300' 
                  : 'text-yellow-700 bg-yellow-50 border-yellow-300'
              }`}>
                <div className="flex items-start space-x-2">
                  {connectionStatus.status === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="font-semibold">{connectionStatus.message}</p>
                </div>
            </div>
          )}

            <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label htmlFor="query" className="text-sm font-bold text-gray-900 tracking-tight">
                Enter your question in natural language
              </label>
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-gray-100 border border-gray-300">
                  <Sparkles className="h-3.5 w-3.5 text-gray-600" />
                  <span className="text-xs font-bold text-gray-700">Ask in plain English</span>
                </div>
            </div>
              
              <div className="relative">
            <textarea
              id="query"
                  className="w-full min-h-[140px] px-4 py-3.5 border-2 border-gray-300 rounded-lg bg-white text-[15px] text-gray-900 placeholder-gray-400 focus-visible:outline-none focus-visible:border-gray-900 focus-visible:ring-0 transition-colors resize-none font-medium leading-relaxed"
              placeholder="Try asking questions like:&#10;&#10;• Show me all users who signed up in the last month&#10;• What are the column names in my tables?&#10;• Count the total number of records&#10;• Find the most recent entries&#10;• List all available tables and their columns"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading || !connectionStatus?.connected}
            />
              </div>

              <div className="pt-2 pb-1">
                <div className="text-xs text-gray-600 space-y-2">
                  <p className="font-bold text-gray-900 mb-2.5">How to chat with your database:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-0.5 font-bold">•</span>
                      <span className="font-semibold">Ask questions in plain English - no SQL knowledge needed!</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-0.5 font-bold">•</span>
                      <span className="font-semibold">Use natural phrases like "show me", "find", "count", "list"</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-0.5 font-bold">•</span>
                      <span className="font-semibold">Reference table names, columns, or ask about your data structure</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-0.5 font-bold">•</span>
                      <span className="font-semibold">The AI will automatically generate and execute the SQL for you</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-50 rounded-lg border border-red-300">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="font-semibold">{error}</p>
            </div>
          </div>
          )}

          <Button 
            type="submit" 
            disabled={loading || !query.trim() || !connectionStatus?.connected} 
              className="w-full h-12 text-base font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-none border-0"
          >
            {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Send className="h-5 w-5" />
                  <span>Execute Query</span>
                </div>
            )}
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
}

