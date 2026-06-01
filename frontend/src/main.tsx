import React, { useSyncExternalStore } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import { queryClient } from './lib/queryClient'
import { routeTree } from './routeTree.gen'
import i18n from './i18n'
import './index.css'

const router = createRouter({
  routeTree,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Subscribes the entire render tree to i18next's `languageChanged` event so
// every consumer of useTranslation/fmtCurrency/fmtDate re-renders when the
// active locale changes — without waiting for the next navigation event.
function I18nReactiveRoot({ children }: { children: React.ReactNode }) {
  useSyncExternalStore(
    (cb) => {
      i18n.on('languageChanged', cb)
      return () => { i18n.off('languageChanged', cb) }
    },
    () => i18n.language,
    () => i18n.language,
  )
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <I18nReactiveRoot>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} context={{ queryClient }} />
        </QueryClientProvider>
      </I18nReactiveRoot>
    </I18nextProvider>
  </React.StrictMode>
)
