import type { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'

// A fresh QueryClient per render/hook keeps tests isolated: no cache bleed
// between cases, and retries off so a mocked error surfaces immediately
// instead of after exponential backoff.
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface ProvidersProps {
  children: ReactNode
  queryClient?: QueryClient
}

export function Providers({ children, queryClient }: ProvidersProps) {
  const client = queryClient ?? makeQueryClient()
  return (
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  )
}

/** Render a component inside the app's QueryClient + i18n providers. */
export function renderWithProviders(
  ui: ReactElement,
  options: { queryClient?: QueryClient } & Omit<RenderOptions, 'wrapper'> = {},
) {
  const { queryClient, ...rest } = options
  const client = queryClient ?? makeQueryClient()
  return {
    queryClient: client,
    ...render(ui, {
      wrapper: ({ children }) => <Providers queryClient={client}>{children}</Providers>,
      ...rest,
    }),
  }
}

/** Wrapper for renderHook (hooks that need QueryClient + i18n context). */
export function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? makeQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Providers queryClient={client}>{children}</Providers>
  )
  return { wrapper, queryClient: client }
}

// Re-export Testing Library so test files have a single import source.
export * from '@testing-library/react'
