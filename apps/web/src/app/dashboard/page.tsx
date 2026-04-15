'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { connectionsApi } from '../../lib/api';
import {
  Button,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Spinner,
} from '@askdb/ui';
import type { DatabaseConnection } from '@askdb/types';
import Link from 'next/link';
import {
  Database,
  Plus,
  ArrowRight,
  Server,
  Activity,
  Trash2,
  MessageSquare,
  Zap,
  PlugZap,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const router = useRouter();
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<DatabaseConnection | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const connectionsData = await connectionsApi.getAll();
        setConnections(connectionsData);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const handleDeleteClick = (e: React.MouseEvent, connection: DatabaseConnection) => {
    e.preventDefault();
    e.stopPropagation();
    setConnectionToDelete(connection);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!connectionToDelete) return;
    try {
      setDeletingId(connectionToDelete.id);
      await connectionsApi.delete(connectionToDelete.id);
      setConnections((prev) => prev.filter((conn) => conn.id !== connectionToDelete.id));
      toast.success('Connection deleted', {
        description: `${connectionToDelete.name} has been deleted successfully.`,
      });
      setDeleteDialogOpen(false);
      setConnectionToDelete(null);
    } catch (error: any) {
      toast.error('Failed to delete connection', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setConnectionToDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-[#4338ca]" />
          <p className="text-sm text-muted-foreground font-medium">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const formatHost = (host: string) =>
    host.length > 32 ? host.substring(0, 29) + '…' : host;

  const getDbTypeLabel = (type: string) => type?.toUpperCase() || 'DB';

  const getDbAccentColor = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('postgres')) return { bg: 'bg-blue-500/10', text: 'text-blue-600', dot: 'bg-blue-500' };
    if (t.includes('mysql')) return { bg: 'bg-orange-500/10', text: 'text-orange-600', dot: 'bg-orange-500' };
    if (t.includes('mongo')) return { bg: 'bg-green-500/10', text: 'text-green-600', dot: 'bg-green-500' };
    return { bg: 'bg-indigo-500/10', text: 'text-indigo-600', dot: 'bg-indigo-500' };
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-tight text-foreground leading-tight">
            Dashboard
          </h1>
          <p className="text-[15px] text-muted-foreground font-medium mt-1">
            Manage your database connections and queries
          </p>
        </div>
        <Link href="/dashboard/connections/new">
          <Button
            size="default"
            className="gap-2 h-10 px-5 rounded-[10px] bg-[#4338ca] hover:bg-[#3730a3] text-white font-semibold text-sm shadow-[0_3px_12px_rgba(67,56,202,0.35)] transition-all hover:-translate-y-[1px] hover:shadow-[0_6px_20px_rgba(67,56,202,0.28)]"
          >
            <Plus className="h-4 w-4" />
            Add Connection
          </Button>
        </Link>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {/* Active Connections */}
        <div className="relative overflow-hidden rounded-[14px] border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Active Connections
              </p>
              <p className="text-5xl font-semibold text-foreground tabular-nums leading-none">
                {connections.length}
              </p>
            </div>
            <div className="h-11 w-11 rounded-[10px] bg-[#4338ca]/10 flex items-center justify-center flex-shrink-0">
              <PlugZap className="h-5 w-5 text-[#4338ca]" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium mt-4">
            {connections.length === 0 ? 'No databases connected yet' : `${connections.length} database${connections.length > 1 ? 's' : ''} connected`}
          </p>
        </div>

        {/* Total Queries (static: visual enhancement) */}
        <div className="relative overflow-hidden rounded-[14px] border border-border/60 bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Queries Run
              </p>
              <p className="text-5xl font-semibold text-foreground tabular-nums leading-none">—</p>
            </div>
            <div className="h-11 w-11 rounded-[10px] bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium mt-4">Across all connections</p>
        </div>

        {/* Quick Action */}
        <div className="relative overflow-hidden rounded-[14px] border border-[#4338ca]/25 bg-gradient-to-br from-[#4338ca]/8 to-indigo-500/5 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#4338ca]/80 uppercase tracking-widest mb-2">
                Quick Action
              </p>
              <p className="text-[15px] font-semibold text-foreground leading-snug mt-1">
                Start querying
              </p>
            </div>
            <div className="h-11 w-11 rounded-[10px] bg-[#4338ca]/15 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-[#4338ca]" />
            </div>
          </div>
          <Link href="/query" className="block mt-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 rounded-[8px] text-xs font-semibold border-[#4338ca]/30 text-[#4338ca] hover:bg-[#4338ca]/10 gap-1.5 transition-all"
            >
              Open Query
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Database Connections Section ── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[1.2rem] font-semibold text-foreground tracking-tight">
              Database Connections
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-0.5">
              {connections.length === 0
                ? 'Get started by adding your first database connection'
                : `${connections.length} ${connections.length === 1 ? 'connection' : 'connections'} configured`}
            </p>
          </div>
        </div>

        {connections.length === 0 ? (
          /* ── Empty State ── */
          <div className="rounded-[16px] border border-dashed border-border bg-muted/20 py-20 px-8">
            <div className="text-center max-w-sm mx-auto space-y-5">
              <div className="h-16 w-16 rounded-2xl bg-[#4338ca]/10 flex items-center justify-center mx-auto">
                <Database className="h-7 w-7 text-[#4338ca]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-[1.1rem] font-semibold text-foreground">No connections yet</h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Connect your first database to start querying and managing your data with natural language.
                </p>
              </div>
              <Link href="/dashboard/connections/new">
                <Button
                  size="default"
                  className="gap-2 h-10 px-5 rounded-[10px] bg-[#4338ca] hover:bg-[#3730a3] text-white font-semibold text-sm shadow-[0_3px_12px_rgba(67,56,202,0.35)] transition-all hover:-translate-y-[1px]"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Connection
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Connection Cards Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {connections.map((conn) => {
                const accent = getDbAccentColor(conn.type);
                return (
                  <div
                    key={conn.id}
                    className="group relative rounded-[14px] border border-border/60 bg-card hover:border-[#4338ca]/30 hover:shadow-[0_4px_24px_rgba(67,56,202,0.10)] transition-all duration-200"
                  >
                    <div className="p-5">
                      {/* Card Header */}
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`h-11 w-11 rounded-[10px] ${accent.bg} flex items-center justify-center flex-shrink-0`}>
                          <Database className={`h-5 w-5 ${accent.text}`} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h3 className="text-[15px] font-semibold text-foreground truncate leading-tight">
                            {conn.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${accent.dot}`} />
                            <span className={`text-xs font-semibold ${accent.text}`}>
                              {getDbTypeLabel(conn.type)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Connection Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Server className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-mono truncate">
                            {formatHost(conn.host)}:{conn.port}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Database className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="font-mono truncate">{conn.database}</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/60 pt-4">
                        <div className="grid grid-cols-2 gap-2.5">
                          <Link href={`/query?connectionId=${conn.id}`} className="flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-9 justify-center gap-1.5 rounded-[8px] border-border bg-background hover:bg-[#4338ca]/5 hover:border-[#4338ca]/30 hover:text-[#4338ca] text-xs font-semibold transition-all"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Chat
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-9 justify-center gap-1.5 rounded-[8px] border-red-200 bg-background hover:bg-red-50 text-red-500 hover:text-red-600 text-xs font-semibold transition-all"
                            onClick={(e) => handleDeleteClick(e, conn)}
                            disabled={deletingId === conn.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {deletingId === conn.id ? 'Deleting…' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Delete Confirmation Dialog ── */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent className="rounded-[16px] border border-border shadow-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-semibold">Delete Connection?</AlertDialogTitle>
                  <AlertDialogDescription className="text-[15px] text-muted-foreground font-medium pt-1 leading-relaxed">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-foreground">
                      {connectionToDelete?.name}
                    </span>
                    ? This action cannot be undone and will also delete all associated query history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel
                    onClick={handleDeleteCancel}
                    disabled={!!deletingId}
                    className="rounded-[8px] font-medium"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    disabled={!!deletingId}
                    className="rounded-[8px] bg-red-600 hover:bg-red-700 text-white font-semibold gap-2"
                  >
                    {deletingId ? (
                      <>
                        <Spinner className="h-4 w-4 text-white" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete Connection
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </main>
  );
}
