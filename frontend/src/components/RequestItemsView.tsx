import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Request } from '../types'
import { Card, CardHeader, CardBody } from './ui/Card'
import { DocumentUpload } from './forms/DocumentUpload'
import { fmtDate } from '../utils/dates'
import { fmtCurrency, sumAmounts } from '../utils/currency'

export type ClassificationItemType = 'reimbursement' | 'travel_advance' | 'travel_expense'

export type ItemColumnRef = {
  itemId: string
  itemType: ClassificationItemType
  codeSecondaire: string | null
}

export type ItemExtraColumn = {
  header: string
  render: (ref: ItemColumnRef) => ReactNode
}

type Props = {
  request: Request
  requestId: string
  extraColumn?: ItemExtraColumn
}

const TH = 'text-left px-4 py-2 font-medium text-gray-500'
const TH_RIGHT = 'text-right px-4 py-2 font-medium text-gray-500'
const TH_CENTER = 'text-center px-4 py-2 font-medium text-gray-500'

export function RequestItemsView({ request, requestId, extraColumn }: Props) {
  const { t } = useTranslation('requests')
  const unlinkedDocs = request.documents?.filter((d) => !d.reimbursementItemId) ?? []
  return (
    <>
      {request.reimbursement && (
        <Card>
          <CardHeader><span className="font-semibold">{t('sections.reimbursementItems')}</span></CardHeader>
          <CardBody className="p-0">
            {request.reimbursement.items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">{t('noItems')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>{t('columns.description')}</th>
                    <th className={TH}>{t('columns.date')}</th>
                    <th className={TH}>{t('columns.vendor')}</th>
                    <th className={TH_RIGHT}>{t('columns.amount')}</th>
                    <th className={TH_CENTER}>{t('columns.docs')}</th>
                    {extraColumn && <th className={TH}>{extraColumn.header}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {request.reimbursement.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2">{it.description}</td>
                      <td className="px-4 py-2">{fmtDate(it.date)}</td>
                      <td className="px-4 py-2 text-gray-500">{it.vendor ?? '—'}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmtCurrency(it.amount)}</td>
                      <td className="px-4 py-2 text-center">
                        {(it.documents?.length ?? 0) > 0 ? (
                          <span className="text-xs text-blue-600">{t('filesCount', { count: it.documents.length })}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {extraColumn && (
                        <td className="px-4 py-2">
                          {extraColumn.render({ itemId: it.id, itemType: 'reimbursement', codeSecondaire: it.codeSecondaire })}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-semibold text-gray-700">{t('total')}</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmtCurrency(sumAmounts(request.reimbursement.items))}</td>
                    <td />
                    {extraColumn && <td />}
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {request.travelAdvance && (
        <Card>
          <CardHeader><span className="font-semibold">{t('sections.travelAdvance')}</span></CardHeader>
          <CardBody className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">{t('fields.destination')}</dt><dd>{request.travelAdvance.destination}</dd>
              <dt className="text-gray-500">{t('fields.purpose')}</dt><dd>{request.travelAdvance.purpose}</dd>
              <dt className="text-gray-500">{t('fields.departure')}</dt><dd>{fmtDate(request.travelAdvance.departureDate)}</dd>
              <dt className="text-gray-500">{t('fields.return')}</dt><dd>{fmtDate(request.travelAdvance.returnDate)}</dd>
              <dt className="text-gray-500">{t('fields.estimatedAmount')}</dt><dd className="font-medium">{fmtCurrency(request.travelAdvance.estimatedAmount)}</dd>
            </dl>
            {request.travelAdvance.items.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>{t('columns.category')}</th>
                    <th className={TH_RIGHT}>{t('columns.amount')}</th>
                    <th className={TH}>{t('columns.notes')}</th>
                    {extraColumn && <th className={TH}>{extraColumn.header}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {request.travelAdvance.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2">{it.category}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmtCurrency(it.amount)}</td>
                      <td className="px-4 py-2 text-gray-500">{it.notes ?? '—'}</td>
                      {extraColumn && (
                        <td className="px-4 py-2">
                          {extraColumn.render({ itemId: it.id, itemType: 'travel_advance', codeSecondaire: it.codeSecondaire })}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td className="px-4 py-2 text-right font-semibold text-gray-700">{t('total')}</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmtCurrency(sumAmounts(request.travelAdvance.items))}</td>
                    <td />
                    {extraColumn && <td />}
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {request.travelReimbursement && (
        <Card>
          <CardHeader><span className="font-semibold">{t('sections.travelReimbursement')}</span></CardHeader>
          <CardBody className="space-y-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-gray-500">{t('fields.destination')}</dt><dd>{request.travelReimbursement.destination}</dd>
              <dt className="text-gray-500">{t('fields.purpose')}</dt><dd>{request.travelReimbursement.purpose}</dd>
              <dt className="text-gray-500">{t('fields.totalAmount')}</dt><dd className="font-medium">{fmtCurrency(request.travelReimbursement.totalAmount)}</dd>
            </dl>
            {request.travelReimbursement.items.length > 0 && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className={TH}>{t('columns.date')}</th>
                    <th className={TH}>{t('columns.category')}</th>
                    <th className={TH_RIGHT}>{t('columns.amount')}</th>
                    <th className={TH}>{t('columns.vendor')}</th>
                    {extraColumn && <th className={TH}>{extraColumn.header}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {request.travelReimbursement.items.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2">{fmtDate(it.date)}</td>
                      <td className="px-4 py-2">{it.category}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmtCurrency(it.amount)}</td>
                      <td className="px-4 py-2 text-gray-500">{it.vendor ?? '—'}</td>
                      {extraColumn && (
                        <td className="px-4 py-2">
                          {extraColumn.render({ itemId: it.id, itemType: 'travel_expense', codeSecondaire: it.codeSecondaire })}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-right font-semibold text-gray-700">{t('total')}</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmtCurrency(sumAmounts(request.travelReimbursement.items))}</td>
                    <td />
                    {extraColumn && <td />}
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>
      )}

      {request.reimbursement && request.reimbursement.items.some((it) => (it.documents?.length ?? 0) > 0) && (
        <Card>
          <CardHeader><span className="font-semibold">{t('sections.itemDocuments')}</span></CardHeader>
          <CardBody className="space-y-3">
            {request.reimbursement.items.filter((it) => (it.documents?.length ?? 0) > 0).map((it) => (
              <div key={it.id}>
                <p className="text-sm font-medium text-gray-700 mb-1">{it.description}</p>
                <DocumentUpload files={[]} onChange={() => {}} requestId={requestId} existingDocs={it.documents} readOnly />
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {unlinkedDocs.length > 0 && (
        <Card>
          <CardHeader><span className="font-semibold">{t('sections.documents')}</span></CardHeader>
          <CardBody>
            <DocumentUpload files={[]} onChange={() => {}} requestId={requestId} existingDocs={unlinkedDocs} readOnly />
          </CardBody>
        </Card>
      )}
    </>
  )
}
