'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { connectionsApi, schemaApi } from '../../lib/api';
import { useQueryAI } from '../../hooks/useQueryAI';
import { QueryBox } from '../../components/query-box/query-box';
import { SQLViewer } from '../../components/sql-viewer/sql-viewer';
import { ResultTable } from '../../components/result-table/result-table';
// import { ChartViewer } from '../../components/chart/chart-viewer';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@askdb/ui';
import { InsightsDisplay } from '../../components/insights/insights-display';
import { Database, ArrowLeft } from 'lucide-react';
import type { DatabaseConnection, QueryResult } from '@askdb/types';

interface TableInfo {
  tableName: string;
  rowCount: number;
}

export default function QueryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const connectionId = searchParams.get('connectionId') || '';

  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    status: 'connected' | 'disconnected' | 'error';
    message: string;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [query, setQuery] = useState('');
  const { executeQuery, loading, error, result, reset } = useQueryAI();

  useEffect(() => {
    if (connectionId) {
      connectionsApi
        .getById(connectionId)
        .then(setConnection)
        .catch(() => router.push('/'));

      // Load connection status
      setLoadingStatus(true);
      connectionsApi
        .getStatus(connectionId)
        .then((status) => {
          setConnectionStatus({
            connected: status.connected,
            status: status.status,
            message: status.message,
          });
        })
        .catch((err) => {
          console.error('Failed to load connection status:', err);
          setConnectionStatus({
            connected: false,
            status: 'error',
            message: 'Unable to check connection status',
          });
        })
        .finally(() => setLoadingStatus(false));

      // Load tables with row counts
      setLoadingTables(true);
      schemaApi
        .getTablesWithRowCounts(connectionId)
        .then(setTables)
        .catch((err) => {
          console.error('Failed to load tables:', err);
          setTables([]);
        })
        .finally(() => setLoadingTables(false));
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
      {/* Premium Navbar */}
      <nav className="bg-white border-b border-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Left Section - Navigation & Connection Info */}
            <div className="flex items-center space-x-6">
              {/* Back Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/');
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors group cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                  Dashboard
                </span>
              </button>

              {/* Divider */}
              {connection && <div className="h-6 w-px bg-gray-300" />}

              {/* Connection Info */}
              {connection && (
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-900 text-white">
                    <Database className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900 leading-tight">
                      {connection.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {connection.type}
                    </span>
                  </div>
                </div>
              )}
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
                onClick={() => router.push('/')}
                className="text-primary hover:underline"
              >
                Go to Dashboard
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <QueryBox 
              onExecute={handleExecute} 
              loading={loading} 
              error={error}
              connectionStatus={connectionStatus}
              loadingStatus={loadingStatus}
              tables={tables}
              loadingTables={loadingTables}
            />

            {result && (
              <>
                <SQLViewer sql={result.sql} />
                <ResultTable columns={result.columns} rows={result.rows} />
                {result.insights && (
                  <InsightsDisplay insights={result.insights} />
                )}
                {/* <ChartViewer data={result.rows} columns={result.columns} /> */}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

