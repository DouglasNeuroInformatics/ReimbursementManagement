import { beforeAll, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { ApiError } from './api'
import { translateApiError } from './translateApiError'

// Assert against the real en-CA `errors` namespace so the test breaks if a
// code's translation is removed.
beforeAll(async () => {
  await i18n.changeLanguage('en-CA')
})

describe('translateApiError', () => {
  it('translates a known ApiError code via the errors namespace', () => {
    const err = new ApiError(401, 'raw backend message', 'AUTH_INVALID_CREDENTIALS')
    expect(translateApiError(err)).toBe('Invalid email or password')
  })

  it('interpolates details into the translated message', () => {
    const err = new ApiError(403, 'forbidden', 'AUTH_FORBIDDEN_ROLE', { roles: 'SUPERVISOR' })
    expect(translateApiError(err)).toBe('Access denied. Required role(s): SUPERVISOR')
  })

  it('falls back to the ApiError message when the code has no translation', () => {
    const err = new ApiError(400, 'a very specific server message', 'NOT_A_REAL_CODE')
    expect(translateApiError(err)).toBe('a very specific server message')
  })

  it('uses a plain Error message when present', () => {
    expect(translateApiError(new Error('boom'))).toBe('boom')
  })

  it('returns the generic unknown message for non-Error values', () => {
    expect(translateApiError('just a string')).toBe('Something went wrong')
    expect(translateApiError(null)).toBe('Something went wrong')
  })
})
