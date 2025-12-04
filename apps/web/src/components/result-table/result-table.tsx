'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@askdb/ui';

interface ResultTableProps {
  columns: string[];
  rows: any[];
}

export function ResultTable({ columns, rows }: ResultTableProps) {
  if (rows.length === 0) {
    return (
      <div className="border border-gray-300 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Query Results</h3>
        <p className="text-sm text-gray-600">No results found</p>
      </div>
    );
  }

  const displayRows = rows.slice(0, 100);
  const hasMore = rows.length > 100;

  return (
    <div className="space-y-4">
      {/* Premium header */}
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
          Query Results
        </h3>
        <span className="text-sm text-gray-600 font-medium">
          {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        </span>
      </div>

      {/* Premium table with borders only - no background */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-300 hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col}
                    className="h-12 px-4 text-left align-middle font-semibold text-gray-900 bg-gray-50/30 border-r border-gray-300 last:border-r-0 whitespace-nowrap"
                  >
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRows.map((row, idx) => (
                <TableRow
                  key={idx}
                  className="border-b border-gray-300 hover:bg-gray-50/20 transition-colors last:border-b-0"
                >
                  {columns.map((col) => {
                    const cellValue = row[col];
                    const cellString = cellValue !== null && cellValue !== undefined 
                      ? String(cellValue) 
                      : null;
                    const isLongText = cellString && cellString.length > 100;
                    
                    return (
                      <TableCell
                        key={col}
                        className="px-4 py-3 text-sm text-gray-700 border-r border-gray-300 last:border-r-0 align-top"
                      >
                        {cellString ? (
                          <div 
                            className={isLongText ? "max-w-lg break-words" : ""}
                            title={isLongText ? cellString : undefined}
                          >
                            {cellString}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic font-normal">NULL</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {hasMore && (
        <p className="text-sm text-gray-500 text-center py-2 font-medium">
          Showing first 100 of {rows.length} rows
        </p>
      )}
    </div>
  );
}

