import { useState } from 'react'
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
  const classify = useClassifyItem(requestId)
  const [value, setValue] = useState(currentCode ?? '')

  const handleBlur = () => {
    if (value && value !== currentCode) {
      classify.mutate({ itemId, itemType, codeSecondaire: value })
    }
  }

  return (
    <select
      className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white max-w-[140px]"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
    >
      <option value="">—</option>
      {codes.map((c) => (
        <option key={c.code} value={c.code}>{c.code} — {c.description}</option>
      ))}
    </select>
  )
}
