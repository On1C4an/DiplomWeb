import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { PropsWithChildren } from 'react';
import Head from 'next/head';

import { QueryProvider } from '@/components/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { siteConfig } from '@/config';
import { cn } from '@/lib/utils';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = siteConfig;

const RootLayout = ({ children }: Readonly<PropsWithChildren>) => {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" type="image/png" href="/vpi.png" />
      </head>
      <body className={cn(inter.className, 'min-h-screen antialiased')}>
        <QueryProvider>
          <Toaster theme="light" richColors closeButton />

          {children}
        </QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
