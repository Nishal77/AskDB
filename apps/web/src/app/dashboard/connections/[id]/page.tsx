'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { connectionsApi, schemaApi } from '../../../../lib/api';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Spinner } from '@askdb/ui';
import type { DatabaseConnection } from '@askdb/types';
import Link from 'next/link';
import { Database, ArrowLeft, RefreshCw, CheckSquare, Square, Server, Activity } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 text-foreground mx-auto" />
          <p className="text-sm text-muted-foreground font-medium">Loading connection details...</p>
        </div>
      </div>
    );
  }

  if (error || !connection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md border">
          <CardContent className="pt-8 pb-6">
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">{error || 'Connection not found'}</p>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Back to Dashboard
            </Button>
            </div>
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center">
                <Database className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                  {connection.name}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="font-medium">
                    {connection.type.toUpperCase()}
                  </Badge>
                  <span className="text-muted-foreground text-sm">•</span>
                  <span className="text-muted-foreground text-sm font-mono">
                    {connection.host}:{connection.port}
                  </span>
                </div>
            </div>
            </div>
            <p className="text-muted-foreground text-lg ml-16">
              Database: <span className="font-mono">{connection.database}</span>
            </p>
          </div>
          <Link href={`/query?connectionId=${connection.id}`}>
            <Button size="lg" className="gap-2">
              <Database className="h-4 w-4" />
              Query Database
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold mb-1">Database Tables</CardTitle>
              <p className="text-sm text-muted-foreground">
                {tables.length === 0
                  ? 'No tables found'
                  : `${tables.length} ${tables.length === 1 ? 'table' : 'tables'} available`}
          </p>
        </div>
              <div className="flex items-center gap-2">
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
                  className="gap-2"
                  >
                  {selectedTables.size === tables.length ? (
                    <>
                      <CheckSquare className="h-4 w-4" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4" />
                      Select All
                    </>
                  )}
                  </Button>
                )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadTables}
                disabled={refreshing}
                className="gap-2"
              >
                {refreshing ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tables.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4 font-medium">No tables found in this database</p>
                {error && (
                <p className="text-destructive text-sm mb-4">{error}</p>
                )}
              <Button onClick={loadTables} disabled={refreshing} variant="outline" className="gap-2">
                {refreshing ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {refreshing ? 'Refreshing...' : 'Try Again'}
              </Button>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2">
                      <th className="text-left py-4 px-4 font-semibold w-12">
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
                          className="w-4 h-4 rounded border-muted-foreground/20 cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Table Name
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Row Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((table) => (
                      <tr 
                        key={table.tableName} 
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer group"
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
                        <td className="py-4 px-4">
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
                            className="w-4 h-4 rounded border-muted-foreground/20 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-muted transition-colors">
                              <Server className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <span className="font-mono text-sm font-medium text-foreground">
                              {table.tableName}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatRowCount(table.rowCount)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pt-4 border-t flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total Tables:</span>
                    <span className="font-semibold text-foreground">{tables.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total Rows:</span>
                    <span className="font-semibold text-foreground font-mono">
                        {formatRowCount(
                          tables.reduce((sum, t) => (t.rowCount > 0 ? sum + t.rowCount : sum), 0)
                        )}
                    </span>
                  </div>
                  </div>
                  {selectedTables.size > 0 && (
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckSquare className="h-4 w-4" />
                    <span className="font-semibold">
                      {selectedTables.size} {selectedTables.size === 1 ? 'table' : 'tables'} selected
                    </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
  );
}

