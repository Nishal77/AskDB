'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { connectionsApi, schemaApi } from '../../../../lib/api';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@askdb/ui';
import type { DatabaseConnection } from '@askdb/types';
import Link from 'next/link';

interface TableInfo {
  tableName: string;
  rowCount: number;
}

export default function ConnectionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const connectionId = params.id as string;

  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTables = async () => {
    try {
      setRefreshing(true);
      const tablesData = await schemaApi.getTablesWithRowCounts(connectionId);
      setTables(tablesData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load tables');
      console.error('Error loading tables:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [connData, tablesData] = await Promise.all([
          connectionsApi.getById(connectionId),
          schemaApi.getTablesWithRowCounts(connectionId),
        ]);
        setConnection(connData);
        setTables(tablesData);
        // Auto-select all tables by default
        setSelectedTables(new Set(tablesData.map(t => t.tableName)));
      } catch (err: any) {
        setError(err.message || 'Failed to load connection details');
      } finally {
        setLoading(false);
      }
    };

    if (connectionId) {
      loadData();
    }
  }, [connectionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading connection details...</p>
        </div>
      </div>
    );
  }

  if (error || !connection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600 mb-4">{error || 'Connection not found'}</p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatRowCount = (count: number): string => {
    if (count === -1) return 'N/A';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard')} className="text-xl font-bold">
                AskYourDatabase
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">{connection.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
              <Link href={`/query?connectionId=${connection.id}`}>
                <Button>Query Database</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">{connection.name}</h2>
          <p className="text-gray-600">
            {connection.type.toUpperCase()} • {connection.host}:{connection.port} • {connection.database}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Database Tables</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTables}
                  disabled={refreshing}
                >
                  {refreshing ? 'Refreshing...' : '🔄 Refresh Tables'}
                </Button>
                {tables.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedTables.size === tables.length) {
                        setSelectedTables(new Set());
                      } else {
                        setSelectedTables(new Set(tables.map(t => t.tableName)));
                      }
                    }}
                  >
                    {selectedTables.size === tables.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tables.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No tables found in this database</p>
                <Button onClick={loadTables} disabled={refreshing}>
                  {refreshing ? 'Refreshing...' : 'Try Again'}
                </Button>
                {error && (
                  <p className="text-red-600 text-sm mt-2">{error}</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold w-12">
                        <input
                          type="checkbox"
                          checked={selectedTables.size === tables.length && tables.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTables(new Set(tables.map(t => t.tableName)));
                            } else {
                              setSelectedTables(new Set());
                            }
                          }}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-semibold">Table Name</th>
                      <th className="text-right py-3 px-4 font-semibold">Row Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((table) => (
                      <tr 
                        key={table.tableName} 
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          const newSelected = new Set(selectedTables);
                          if (newSelected.has(table.tableName)) {
                            newSelected.delete(table.tableName);
                          } else {
                            newSelected.add(table.tableName);
                          }
                          setSelectedTables(newSelected);
                        }}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedTables.has(table.tableName)}
                            onChange={(e) => {
                              e.stopPropagation();
                              const newSelected = new Set(selectedTables);
                              if (e.target.checked) {
                                newSelected.add(table.tableName);
                              } else {
                                newSelected.delete(table.tableName);
                              }
                              setSelectedTables(newSelected);
                            }}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono text-sm">{table.tableName}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {formatRowCount(table.rowCount)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                  <div>
                    <p>Total Tables: <strong>{tables.length}</strong></p>
                    <p>
                      Total Rows: <strong>
                        {formatRowCount(
                          tables.reduce((sum, t) => (t.rowCount > 0 ? sum + t.rowCount : sum), 0)
                        )}
                      </strong>
                    </p>
                  </div>
                  {selectedTables.size > 0 && (
                    <div className="text-blue-600">
                      <strong>{selectedTables.size}</strong> table{selectedTables.size !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

