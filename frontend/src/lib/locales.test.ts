import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, isSupportedLocale, SUPPORTED_LOCALES } from './locales'

describe('isSupportedLocale', () => {
  it('accepts the supported BCP 47 tags', () => {
    expect(isSupportedLocale('en-CA')).toBe(true)
    expect(isSupportedLocale('fr-CA')).toBe(true)
  })

  it('rejects unsupported, malformed, or non-string values', () => {
    const rejected: unknown[] = ['en', 'fr', 'EN-CA', 'en-US', 'en_CA', '', null, undefined, 42, {}, []]
    for (const value of rejected) {
      expect(isSupportedLocale(value)).toBe(false)
    }
  })
})

describe('locale constants', () => {
  it('DEFAULT_LOCALE is itself a supported locale', () => {
    expect(isSupportedLocale(DEFAULT_LOCALE)).toBe(true)
  })

  it('SUPPORTED_LOCALES contains no duplicates', () => {
    expect(new Set(SUPPORTED_LOCALES).size).toBe(SUPPORTED_LOCALES.length)
  })
})
