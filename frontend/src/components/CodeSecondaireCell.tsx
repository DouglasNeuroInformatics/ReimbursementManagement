import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { useTranslation } from 'react-i18next'
import { useCodeSecondaire, useClassifyItem } from '../hooks/useRequests'
import type { ClassificationItemType } from './RequestItemsView'

type Props = {
  itemId: string
  itemType: ClassificationItemType
  currentCode: string | null
  requestId: string
}

export function CodeSecondaireCell({ itemId, itemType, currentCode, requestId }: Props) {
  const { data: codes = [] } = useCodeSecondaire()
  const classify = useClassifyItem(requestId, itemId)
  const [value, setValue] = useState(currentCode ?? '')
  const [showSuccess, setShowSuccess] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const { t } = useTranslation(['finance', 'forms'])

  useEffect(() => {
    setValue(currentCode ?? '')
  }, [currentCode])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const dirty = value !== (currentCode ?? '')

  const handleSave = () => {
    clearTimeout(timerRef.current)
    classify.mutate(
      { itemId, itemType, codeSecondaire: value },
      {
        onSuccess: () => {
          setShowSuccess(true)
          timerRef.current = setTimeout(() => setShowSuccess(false), 2000)
        },
      },
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value="">—</option>
        {codes.map((c) => (
          <option key={c.code} value={c.code}>{c.code} — {c.description}</option>
        ))}
      </select>
      <span className="inline-flex items-center gap-1">
        <button
          onClick={handleSave}
          disabled={!dirty || classify.isPending}
          className={clsx(
            'text-xs font-medium px-2 py-0.5 rounded transition-colors',
            dirty
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-primary-500/0 text-transparent pointer-events-none',
          )}
        >
          {classify.isPending ? (
            <span className="inline-block h-3 w-3 border-2 border-current border-t-transparent border-r-transparent rounded-full animate-spin" />
          ) : t('forms:save')}
        </button>
        <span className={clsx('text-xs transition-opacity duration-200', showSuccess ? 'text-green-600 opacity-100' : 'opacity-0')}>
          {t('saved')}
        </span>
        <span className={clsx('text-xs', classify.isError ? 'text-red-600' : 'opacity-0')}>
          {t('errorIndicator')}
        </span>
      </span>
    </div>
  )
}
