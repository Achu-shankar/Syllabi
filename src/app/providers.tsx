'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient instance on first render.
  // This ensures that data is not shared between different users and requests,
  // especially in server-side rendering environments if you were to use it there directly.
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Global default options for queries
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: process.env.NODE_ENV === 'production', // Only in prod for less noise in dev
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
} 