'use client'
// app/[locale]/client/layout.tsx
import { TranslationProviderClient } from '@/locales/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient()

export function Providers(
  { children, locale }: { children: React.ReactNode, locale: string }
) {

  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProviderClient locale={locale}>
        {children}
      </TranslationProviderClient>
    </QueryClientProvider>
  );

}