import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardBody } from '../../../../components/ui/Card'

export const Route = createFileRoute('/_auth/dashboard/requests/new/')({ component: NewRequestPage })

const TYPES = [
  { key: 'reimbursement', label: 'General Reimbursement', description: 'Claim reimbursement for a business expense you already paid.', to: '/dashboard/requests/new/reimbursement' },
  { key: 'travel-advance', label: 'Travel Advance', description: 'Request funds in advance for an upcoming business trip.', to: '/dashboard/requests/new/travel-advance' },
  { key: 'travel-reimbursement', label: 'Travel Reimbursement', description: 'Claim reimbursement for actual travel expenses after your trip.', to: '/dashboard/requests/new/travel-reimbursement' },
]

function NewRequestPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">New Request</h1>
      <p className="text-gray-500 text-sm">Select the type of reimbursement request.</p>
      <div className="space-y-3">
        {TYPES.map((t) => (
          <Link key={t.key} to={t.to}>
            <Card className="hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
              <CardBody>
                <div className="font-semibold text-gray-900">{t.label}</div>
                <div className="text-sm text-gray-500 mt-1">{t.description}</div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
