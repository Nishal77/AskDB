'use client';

import Editor from '@monaco-editor/react';

interface SQLViewerProps {
  sql: string;
}

export function SQLViewer({ sql }: SQLViewerProps) {
  return (
    <div className="space-y-4">
      {/* Premium header */}
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
          Generated SQL
        </h3>
      </div>

      {/* Premium SQL viewer with borders only */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <Editor
          height="200px"
          defaultLanguage="sql"
          value={sql}
          theme="vs"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 3,
            renderLineHighlight: 'none',
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              useShadows: false,
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
            padding: { top: 12, bottom: 12 },
            automaticLayout: true,
          }}
          beforeMount={(monaco) => {
            // Premium theme with minimal background
            monaco.editor.defineTheme('premium-sql', {
              base: 'vs',
              inherit: true,
              rules: [
                { token: 'keyword.sql', foreground: '2563eb', fontStyle: 'bold' },
                { token: 'string.sql', foreground: '059669' },
                { token: 'number.sql', foreground: 'dc2626' },
                { token: 'comment.sql', foreground: '6b7280', fontStyle: 'italic' },
              ],
              colors: {
                'editor.background': '#fafafa',
                'editor.foreground': '#1f2937',
                'editorLineNumber.foreground': '#9ca3af',
                'editorLineNumber.activeForeground': '#374151',
                'editor.selectionBackground': '#e5e7eb',
                'editor.lineHighlightBackground': '#f9fafb',
                'editorCursor.foreground': '#1f2937',
                'editorIndentGuide.background': '#e5e7eb',
                'editorIndentGuide.activeBackground': '#d1d5db',
              },
            });
          }}
          onMount={(editor, monaco) => {
            monaco.editor.setTheme('premium-sql');
          }}
        />
      </div>
    </div>
  );
}

