import { useTranslation } from 'react-i18next'
import { Card, CardBody } from './ui/Card'
import type { Approval } from '../types'

type Props = {
  financeApprovals: Approval[]
  required: number
  showClassificationWarning: boolean
}

export function ApprovalProgressCard({ financeApprovals, required, showClassificationWarning }: Props) {
  const count = financeApprovals.length
  const { t } = useTranslation('finance')
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">
              {t('approvalProgressShort', { count, required })}
            </p>
            {count > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {t('signedBy', { names: financeApprovals.map((a) => `${a.actor.firstName} ${a.actor.lastName}`).join(', ') })}
              </p>
            )}
          </div>
          {showClassificationWarning && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
              {t('classifyAllItemsShort')}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  )
}
