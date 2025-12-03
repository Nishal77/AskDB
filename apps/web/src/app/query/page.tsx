'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { connectionsApi } from '../../lib/api';
import { useQueryAI } from '../../hooks/useQueryAI';
import { QueryBox } from '../../components/query-box/query-box';
import { SQLViewer } from '../../components/sql-viewer/sql-viewer';
import { ResultTable } from '../../components/result-table/result-table';
import { ChartViewer } from '../../components/chart/chart-viewer';
import { Card, CardHeader, CardTitle, CardContent } from '@askdb/ui';
import type { DatabaseConnection, QueryResult } from '@askdb/types';

export default function QueryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const connectionId = searchParams.get('connectionId') || '';

  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [query, setQuery] = useState('');
  const { executeQuery, loading, error, result, reset } = useQueryAI();

  useEffect(() => {
    if (connectionId) {
      connectionsApi
        .getById(connectionId)
        .then(setConnection)
        .catch(() => router.push('/dashboard'));
    }
  }, [connectionId, router]);

  const handleExecute = async (naturalLanguageQuery: string) => {
    if (!connectionId) return;
    setQuery(naturalLanguageQuery);
    reset();
    try {
      await executeQuery({
        connectionId,
        naturalLanguageQuery,
      });
    } catch (err) {
      // Error is handled by useQueryAI hook
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
            <div className="flex items-center">
              {connection && (
                <span className="text-sm text-gray-600 mr-4">
                  {connection.name} ({connection.type})
                </span>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!connectionId ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-600 mb-4">No database connection selected</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-primary hover:underline"
              >
                Go to Dashboard
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <QueryBox onExecute={handleExecute} loading={loading} error={error} />

            {result && (
              <>
                <SQLViewer sql={result.sql} />
                <ResultTable columns={result.columns} rows={result.rows} />
                {result.insights && (
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">{result.insights}</p>
                    </CardContent>
                  </Card>
                )}
                <ChartViewer data={result.rows} columns={result.columns} />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

