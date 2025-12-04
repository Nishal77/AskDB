import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@askdb/ui';

export const metadata: Metadata = {
  title: 'AskYourDatabase',
  description: 'AI-powered natural language database queries',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

