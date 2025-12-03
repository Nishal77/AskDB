'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, connectionsApi } from '../../lib/api';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@askdb/ui';
import type { User, DatabaseConnection } from '@askdb/types';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userData, connectionsData] = await Promise.all([
          authApi.getMe(),
          connectionsApi.getAll(),
        ]);
        setUser(userData);
        setConnections(connectionsData);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const handleLogout = () => {
    authApi.logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">AskYourDatabase</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
          <p className="text-gray-600">Manage your database connections and queries</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Database Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{connections.length}</p>
              <p className="text-sm text-gray-600 mt-2">Active connections</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Connections</h3>
            <Link href="/dashboard/connections/new">
              <Button>Add Connection</Button>
            </Link>
          </div>

          {connections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-600 mb-4">No database connections yet</p>
                <Link href="/dashboard/connections/new">
                  <Button>Create Your First Connection</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((conn) => (
                <Card key={conn.id}>
                  <CardHeader>
                    <CardTitle>{conn.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">
                      {conn.type} • {conn.host}:{conn.port}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">{conn.database}</p>
                    <Link href={`/query?connectionId=${conn.id}`}>
                      <Button className="w-full" variant="outline">
                        Query Database
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <Link href="/query">
            <Button variant="secondary" className="w-full">
              Start New Query
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

