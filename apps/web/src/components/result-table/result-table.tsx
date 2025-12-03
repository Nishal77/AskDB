'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@askdb/ui';

interface ResultTableProps {
  columns: string[];
  rows: any[];
}

export function ResultTable({ columns, rows }: ResultTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Query Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No results found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Query Results ({rows.length} rows)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                {columns.map((col) => (
                  <th key={col} className="text-left p-2 font-semibold text-sm">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col} className="p-2 text-sm">
                      {row[col] !== null && row[col] !== undefined
                        ? String(row[col])
                        : 'NULL'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && (
            <p className="mt-4 text-sm text-gray-600">
              Showing first 100 of {rows.length} rows
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

