'use client'
import { Toaster } from '@/components/shadcn/ui/toaster';
// app/client/layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient()

export function Providers(
  { children }: { children: React.ReactNode }
) {

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );

}