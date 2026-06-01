import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Card, CardBody } from '../../../../components/ui/Card'

export const Route = createFileRoute('/_auth/dashboard/requests/new/')({ component: NewRequestPage })

const TYPES = [
  { key: 'reimbursement', titleKey: 'newGeneral', descriptionKey: 'typeDescriptions.reimbursement', to: '/dashboard/requests/new/reimbursement' },
  { key: 'travel-advance', titleKey: 'newTravelAdvance', descriptionKey: 'typeDescriptions.travel_advance', to: '/dashboard/requests/new/travel-advance' },
  { key: 'travel-reimbursement', titleKey: 'newTravelReimbursement', descriptionKey: 'typeDescriptions.travel_reimbursement', to: '/dashboard/requests/new/travel-reimbursement' },
] as const

function NewRequestPage() {
  const { t } = useTranslation('requests')
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t('newRequest')}</h1>
      <p className="text-gray-500 text-sm">{t('selectType')}</p>
      <div className="space-y-3">
        {TYPES.map((row) => (
          <Link key={row.key} to={row.to}>
            <Card className="hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
              <CardBody>
                <div className="font-semibold text-gray-900">{t(row.titleKey)}</div>
                <div className="text-sm text-gray-500 mt-1">{t(row.descriptionKey)}</div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
