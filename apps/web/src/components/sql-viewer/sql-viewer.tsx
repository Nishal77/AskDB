'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@askdb/ui';
import Editor from '@monaco-editor/react';

interface SQLViewerProps {
  sql: string;
}

export function SQLViewer({ sql }: SQLViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated SQL</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md overflow-hidden">
          <Editor
            height="200px"
            defaultLanguage="sql"
            value={sql}
            theme="vs-light"
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              wordWrap: 'on',
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

