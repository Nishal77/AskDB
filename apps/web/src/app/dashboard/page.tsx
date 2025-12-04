'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { connectionsApi } from '../../lib/api';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
import { Database, Plus, ArrowRight, Server, Activity, Trash2, MessageSquare } from 'lucide-react';
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
      
      // Remove from local state
      setConnections((prev) => prev.filter((conn) => conn.id !== connectionToDelete.id));
      
      // Show success toast
      toast.success('Connection deleted', {
        description: `${connectionToDelete.name} has been deleted successfully.`,
      });
      
      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setConnectionToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete connection:', error);
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
        <Spinner className="h-8 w-8 text-foreground" />
      </div>
    );
  }

  const getDatabaseIcon = (type: string) => {
    return <Database className="h-4 w-4" />;
  };

  const formatHost = (host: string) => {
    if (host.length > 30) {
      return host.substring(0, 27) + '...';
    }
    return host;
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header Section */}
      <div className="mb-12">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground mb-3">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your database connections and queries
            </p>
          </div>
          <Link href="/dashboard/connections/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Connection
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Card */}
      <div className="mb-10">
        <Card className="border ">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Active Connections
                </p>
                <p className="text-5xl font-semibold text-foreground">
                  {connections.length}
                </p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connections Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-1">
              Database Connections
            </h2>
            <p className="text-sm text-muted-foreground">
              {connections.length === 0
                ? 'Get started by adding your first database connection'
                : `${connections.length} ${connections.length === 1 ? 'connection' : 'connections'} configured`}
            </p>
          </div>
        </div>

        {connections.length === 0 ? (
          <Card className="border border-dashed bg-muted/30">
            <CardContent className="py-16 px-8">
              <div className="text-center max-w-md mx-auto space-y-6">
                <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                  <Database className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    No connections yet
                  </h3>
                  <p className="text-muted-foreground">
                    Connect your first database to start querying and managing your data
                  </p>
                </div>
                <Link href="/dashboard/connections/new">
                  <Button size="lg" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Connection
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections.map((conn) => (
                <Card
                  key={conn.id}
                  className="group border bg-card hover:border-foreground/30 transition-all duration-200"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-muted/40 flex items-center justify-center flex-shrink-0">
                          {getDatabaseIcon(conn.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold text-foreground truncate">
                            {conn.name}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Server className="h-4 w-4 flex-shrink-0" />
                        <span className="font-mono text-xs truncate">
                          {formatHost(conn.host)}:{conn.port}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Database className="h-4 w-4 flex-shrink-0" />
                        <span className="font-mono text-xs truncate">{conn.database}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="grid grid-cols-2 gap-3">
                        <Link href={`/query?connectionId=${conn.id}`} className="flex-1">
                          <Button
                            variant="outline"
                            className="w-full justify-center gap-2 bg-background border h-10"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-medium text-sm">Chat</span>
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          className="w-full justify-center gap-2 text-destructive border-destructive/30 bg-background hover:bg-destructive/5 h-10"
                          onClick={(e) => handleDeleteClick(e, conn)}
                          disabled={deletingId === conn.id}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="font-medium text-sm">
                            {deletingId === conn.id ? 'Deleting...' : 'Delete'}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent className="border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-semibold">
                    Delete Connection?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-base pt-2">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-foreground">
                      {connectionToDelete?.name}
                    </span>
                    ? This action cannot be undone and will also delete all associated query history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                  <AlertDialogCancel onClick={handleDeleteCancel} disabled={!!deletingId}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteConfirm}
                    disabled={!!deletingId}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                  >
                    {deletingId ? (
                      <>
                        <Spinner className="h-4 w-4 text-destructive-foreground" />
                        Deleting...
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

      {/* Quick Action */}
      {connections.length > 0 && (
        <div className="mt-10">
          <Card className="border bg-gradient-to-br from-card to-muted/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    Ready to query?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Start a new query session with any of your connections
                  </p>
                </div>
                <Link href="/query">
                  <Button size="lg" variant="outline" className="gap-2">
                    Start New Query
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

