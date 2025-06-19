import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import React from 'react';
import './globals.css';
import { AuthProvider } from '../components/providers/session-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AIGentic - Agent-Based Content Generation Platform',
  description: 'Automate your content creation pipeline from idea to published video',
  keywords: ['AI', 'content generation', 'video creation', 'automation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-background font-sans antialiased">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
} 