'use client'
// app/[locale]/client/layout.tsx
import { TranslationProviderClient } from '@/locales/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ComponentType } from 'react';

const queryClient = new QueryClient()

export function withClientLayout<T extends Object>(
  WrappedComponent: ComponentType<T>
) {
  return function WithClientLayout(props: T & {
    locale: string
  }) {
    const locale = props.locale
    return (
      <QueryClientProvider client={queryClient}>
        <TranslationProviderClient locale={locale}>
          <WrappedComponent {...props} />
        </TranslationProviderClient>
      </QueryClientProvider>
    );
  };
}