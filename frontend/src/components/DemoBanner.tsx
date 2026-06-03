import { useTranslation } from 'react-i18next'
import { useConfig } from '../hooks/useConfig'

// App-wide strip shown when the backend reports demo mode is on. Warns that the
// data is sample/shared and lists the well-known demo login. Renders nothing
// (and reserves no space) when demo mode is off or config hasn't loaded.
export function DemoBanner() {
  const { t } = useTranslation('common')
  const { data } = useConfig()

  if (!data?.demoMode) return null

  return (
    <div
      role="status"
      className="bg-amber-400 text-amber-950 text-center text-sm px-4 py-1.5 font-medium"
    >
      <span>{t('demoBanner.message')}</span>{' '}
      <span className="font-mono whitespace-nowrap">{t('demoBanner.credentials')}</span>
    </div>
  )
}
