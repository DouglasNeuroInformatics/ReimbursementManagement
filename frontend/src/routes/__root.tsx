import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { ErrorBoundary } from '../components/ErrorBoundary'

interface RouterContext {
  queryClient: QueryClient
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <p className="text-xl text-gray-600 mt-2">Page not found</p>
      <a href="/" className="mt-6 text-blue-600 hover:underline text-sm">Go home</a>
    </div>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  ),
  notFoundComponent: NotFound,
})
