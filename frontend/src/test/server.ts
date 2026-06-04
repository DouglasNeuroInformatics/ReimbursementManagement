import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Shared MSW server for the whole test run. Lifecycle (listen/resetHandlers/
// close) is wired in src/setupTests.ts.
export const server = setupServer(...handlers)
