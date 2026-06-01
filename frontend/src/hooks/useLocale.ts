import { useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import i18n from '../i18n'
import { api } from '../lib/api'
import type { Locale } from '../lib/locales'
import type { User } from '../types'

export function useLocale() {
  const qc = useQueryClient()

  // Subscribe directly to i18next so the consuming component always re-renders
  // when the language changes, independent of react-i18next's internal
  // subscription path.
  const current = useSyncExternalStore(
    (cb) => {
      i18n.on('languageChanged', cb)
      return () => { i18n.off('languageChanged', cb) }
    },
    () => i18n.language as Locale,
    () => i18n.language as Locale,
  )

  async function setLocale(locale: Locale) {
    if (locale === current) return
    await i18n.changeLanguage(locale)
    const user = qc.getQueryData<User>(['auth', 'me'])
    if (user) {
      try {
        await api.patch('/api/auth/me', { preferredLocale: locale })
        qc.invalidateQueries({ queryKey: ['auth', 'me'] })
      } catch {
        // Non-fatal: local change already applied; server sync will catch up next session.
      }
    }
  }

  return { current, setLocale }
}
