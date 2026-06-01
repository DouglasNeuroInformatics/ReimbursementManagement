import i18n from '../i18n'
import { ApiError } from './api'

/**
 * Translate a backend error response into a user-facing string in the current
 * locale. If the code is known in errors.json, the translated template is
 * rendered with the details bag as interpolation values. Otherwise falls back
 * to whatever localized string the backend sent (server-side fallback table),
 * and ultimately to a generic "Something went wrong".
 */
export function translateApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code && i18n.exists(`errors:${err.code}`)) {
      return i18n.t(`errors:${err.code}`, (err.details ?? {}) as Record<string, unknown>) as string
    }
    if (err.message) return err.message
  }
  if (err instanceof Error && err.message) return err.message
  return i18n.t('errors:unknown') as string
}
