'use client';

import { useState } from 'react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@askdb/ui';
import { Send } from 'lucide-react';

interface QueryBoxProps {
  onExecute: (query: string) => void;
  loading: boolean;
  error: string | null;
}

export function QueryBox({ onExecute, loading, error }: QueryBoxProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onExecute(query.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ask Your Database</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="query" className="text-sm font-medium">
              Enter your question in natural language
            </label>
            <textarea
              id="query"
              className="w-full min-h-[120px] px-3 py-2 border border-input rounded-md bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="e.g., Show me all users who signed up in the last month"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
          )}
          <Button type="submit" disabled={loading || !query.trim()} className="w-full">
            {loading ? (
              'Processing...'
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Execute Query
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

