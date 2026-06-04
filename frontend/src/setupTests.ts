import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './test/server'

// Start MSW once for the whole run. `onUnhandledRequest: 'error'` makes any
// un-mocked network call fail loudly rather than hit a real backend.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => server.close())
