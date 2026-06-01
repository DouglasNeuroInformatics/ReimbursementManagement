import { clsx } from 'clsx'
import { SUPPORTED_LOCALES, type Locale } from '../../lib/locales'
import { useLocale } from '../../hooks/useLocale'

const LABELS: Record<Locale, string> = {
  'en-CA': 'EN',
  'fr-CA': 'FR',
}

export function LocaleSwitcher() {
  const { current, setLocale } = useLocale()
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Language">
      {SUPPORTED_LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => { void setLocale(loc) }}
          aria-pressed={current === loc}
          className={clsx(
            'px-2.5 py-1 text-xs font-semibold rounded-md transition-colors',
            current === loc
              ? 'bg-white shadow text-slate-900'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {LABELS[loc]}
        </button>
      ))}
    </div>
  )
}
