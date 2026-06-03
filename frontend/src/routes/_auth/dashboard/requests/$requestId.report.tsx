import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useReport } from '../../../../hooks/useRequests'
import { PageSpinner } from '../../../../components/ui/Spinner'
import { fmtCurrency } from '../../../../utils/currency'
import { fmtDate } from '../../../../utils/dates'
import { translateApiError } from '../../../../lib/translateApiError'

export const Route = createFileRoute('/_auth/dashboard/requests/$requestId/report')({ component: ReportPage })

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ReportPage() {
  const { requestId } = Route.useParams()
  const { data: report, isLoading, error } = useReport(requestId)
  const { t } = useTranslation('report')

  if (isLoading) return <PageSpinner />
  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <p className="text-red-600">{translateApiError(error) || t('error.load')}</p>
        <Link to="/dashboard/requests/$requestId" params={{ requestId }} className="text-primary-600 underline mt-4 inline-block">
          {t('toolbar.back')}
        </Link>
      </div>
    )
  }

  const handlePrint = () => window.print()

  return (
    <div className="report-page">
      {/* Print toolbar - hidden when printing */}
      <div className="print-toolbar flex items-center justify-between max-w-4xl mx-auto px-6 py-3 border-b border-gray-200 bg-white sticky top-0 z-10 print:hidden">
        <Link to="/dashboard/requests/$requestId" params={{ requestId }} className="text-sm text-primary-600 hover:underline">
          ← {t('toolbar.back')}
        </Link>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
        >
          {t('toolbar.print')}
        </button>
      </div>

      {/* Report content */}
      <div className="report-content max-w-4xl mx-auto px-8 py-6 print:px-0 print:py-0 print:max-w-none">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
          <h1 className="text-lg font-bold tracking-wide uppercase">{t('subtitle')}</h1>
          <h2 className="text-xl font-bold mt-1">{t('title')}</h2>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>{t('header.requestId')}: {report.request.id.slice(0, 8).toUpperCase()}</span>
            <span>{t('header.date')}: {fmtDate(report.reportMeta.generatedAt)}</span>
          </div>
        </div>

        {/* Payee / Requester info */}
        <div className="grid grid-cols-2 gap-x-8 border border-gray-300 p-4 mb-6 text-sm">
          <div className="space-y-1">
            <div className="font-semibold text-gray-700 mb-2">{t('header.payTo')}</div>
            <div>
              <span className="text-gray-500">{t('requester.name')}:</span>{' '}
              <span className="font-medium">{report.requester.firstName} {report.requester.lastName}</span>
            </div>
            {report.requester.address && (
              <div>
                <span className="text-gray-500">{t('requester.address')}:</span>{' '}
                <span className="whitespace-pre-line">{report.requester.address}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">{t('requester.department')}:</span>{' '}
              <span>{report.requester.department || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">{t('requester.employeeNumber')}:</span>{' '}
              <span>{report.requester.employeeNumber || '—'}</span>
            </div>
          </div>
          <div className="space-y-1">
            {report.requester.jobPosition && (
              <div>
                <span className="text-gray-500">{t('requester.jobPosition')}:</span>{' '}
                <span>{report.requester.jobPosition}</span>
              </div>
            )}
            {report.requester.phone && (
              <div>
                <span className="text-gray-500">{t('requester.phone')}:</span>{' '}
                <span>{report.requester.phone}{report.requester.extension ? ` (${t('requester.ext')} ${report.requester.extension})` : ''}</span>
              </div>
            )}
            {report.billingAccount && (
              <div className="mt-2">
                <span className="text-gray-500">{t('signatures.account')}:</span>{' '}
                <span className="font-medium">{report.billingAccount.accountNumber} — {report.billingAccount.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Travel details (if applicable) */}
        {report.travelDetails && (
          <div className="border border-gray-300 p-4 mb-6 text-sm">
            <h3 className="font-semibold text-gray-700 mb-2">{t('travel.title')}</h3>
            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <span className="text-gray-500">{t('travel.destination')}:</span> {report.travelDetails.destination}
              </div>
              <div>
                <span className="text-gray-500">{t('travel.purpose')}:</span> {report.travelDetails.purpose}
              </div>
              <div>
                <span className="text-gray-500">{t('travel.departure')}:</span> {fmtDate(report.travelDetails.departureDate)}
              </div>
              <div>
                <span className="text-gray-500">{t('travel.return')}:</span> {fmtDate(report.travelDetails.returnDate)}
              </div>
              {'estimatedAmount' in report.travelDetails && (
                <div>
                  <span className="text-gray-500">{t('travel.estimatedAmount')}:</span>{' '}
                  <span className="font-medium">{fmtCurrency(report.travelDetails.estimatedAmount!)}</span>
                </div>
              )}
              {'totalAmount' in report.travelDetails && (
                <div>
                  <span className="text-gray-500">{t('travel.totalAmount')}:</span>{' '}
                  <span className="font-medium">{fmtCurrency(report.travelDetails.totalAmount!)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Justification */}
        <div className="border border-gray-300 p-4 mb-6 text-sm">
          <h3 className="font-semibold text-gray-700 mb-1">{t('justification.title')}</h3>
          <p>{report.request.description || t('justification.none')}</p>
          <p className="text-gray-500 mt-1 italic">{report.request.title}</p>
        </div>

        {/* Expense Distribution by Code Secondaire */}
        {report.totals.byCode.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">{t('distribution.byCode')}</h3>
            <table className="w-full text-sm border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-gray-300 font-medium">{t('distribution.fund')}</th>
                  <th className="text-left px-3 py-2 border-b border-gray-300 font-medium">{t('distribution.primaryCode')}</th>
                  <th className="text-left px-3 py-2 border-b border-gray-300 font-medium">{t('distribution.secondaryCode')}</th>
                  <th className="text-right px-3 py-2 border-b border-gray-300 font-medium">{t('distribution.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {report.totals.byCode.map((row) => (
                  <tr key={row.code} className="border-b border-gray-200">
                    <td className="px-3 py-2">{report.billingAccount?.fund || '—'}</td>
                    <td className="px-3 py-2">{report.billingAccount?.primaryCode || '—'}</td>
                    <td className="px-3 py-2">{row.code} — {row.description}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmtCurrency(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right font-bold">{t('distribution.total')}</td>
                  <td className="px-3 py-2 text-right font-bold">{fmtCurrency(report.totals.grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Line Items detail */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-2 text-sm">{t('items.title')}</h3>
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2 border-b border-gray-300 font-medium">{t('items.description')}</th>
                <th className="text-left px-3 py-2 border-b border-gray-300 font-medium">{t('items.date')}</th>
                <th className="text-left px-3 py-2 border-b border-gray-300 font-medium">{t('items.vendor')}</th>
                <th className="text-left px-3 py-2 border-b border-gray-300 font-medium">{t('items.codeSecondaire')}</th>
                <th className="text-right px-3 py-2 border-b border-gray-300 font-medium">{t('items.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {report.lineItems.map((item) => (
                <tr key={item.itemId} className="border-b border-gray-200">
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2">{item.date ? fmtDate(item.date) : '—'}</td>
                  <td className="px-3 py-2">{item.vendor || '—'}</td>
                  <td className="px-3 py-2">
                    {item.codeSecondaire
                      ? `${item.codeSecondaire} — ${item.codeSecondaireLabel}`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{fmtCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-bold">{t('distribution.total')}</td>
                <td className="px-3 py-2 text-right font-bold">{fmtCurrency(report.totals.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Documents list */}
        {report.documents.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">{t('documents.title')}</h3>
            <table className="w-full text-sm border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-gray-300 font-medium">{t('documents.filename')}</th>
                  <th className="text-right px-3 py-2 border-b border-gray-300 font-medium">{t('documents.size')}</th>
                </tr>
              </thead>
              <tbody>
                {report.documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-200">
                    <td className="px-3 py-2">{doc.filename}</td>
                    <td className="px-3 py-2 text-right">{formatBytes(doc.sizeBytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-8 print:mt-4">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">{t('signatures.title')}</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-sm">
            {/* Requested by */}
            <div>
              <div className="text-gray-500 mb-1">{t('signatures.requestedBy')}</div>
              <div className="border-b border-gray-400 pb-1 font-medium">
                {report.requester.firstName} {report.requester.lastName}
              </div>
              <div className="text-gray-400 text-xs mt-0.5">{fmtDate(report.request.submittedAt)}</div>
            </div>

            {/* Authorized by (supervisor) */}
            <div>
              <div className="text-gray-500 mb-1">{t('signatures.authorizedBy')}</div>
              {report.supervisorApproval ? (
                <>
                  <div className="border-b border-gray-400 pb-1 font-medium">
                    {report.supervisorApproval.actor.firstName} {report.supervisorApproval.actor.lastName}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">
                    {report.supervisorApproval.account && (
                      <span>{report.supervisorApproval.account.accountNumber} ({report.supervisorApproval.account.label}) · </span>
                    )}
                    {fmtDate(report.supervisorApproval.createdAt)}
                  </div>
                </>
              ) : (
                <div className="border-b border-gray-300 pb-1 text-gray-300">—</div>
              )}
            </div>

            {/* Finance approvals */}
            {report.financeApprovals.map((fa, i) => (
              <div key={i}>
                <div className="text-gray-500 mb-1">{t('signatures.financeSignoff', { n: i + 1 })}</div>
                <div className="border-b border-gray-400 pb-1 font-medium">
                  {fa.actor.firstName} {fa.actor.lastName}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">{fmtDate(fa.createdAt)}</div>
              </div>
            ))}

            {/* Paid by */}
            {report.paidApproval && (
              <div>
                <div className="text-gray-500 mb-1">{t('signatures.paidBy')}</div>
                <div className="border-b border-gray-400 pb-1 font-medium">
                  {report.paidApproval.actor.firstName} {report.paidApproval.actor.lastName}
                </div>
                <div className="text-gray-400 text-xs mt-0.5">{fmtDate(report.paidApproval.createdAt)}</div>
              </div>
            )}

            {/* Received by - blank for physical signature */}
            <div>
              <div className="text-gray-500 mb-1">{t('signatures.receivedBy')}</div>
              <div className="border-b border-gray-400 pb-1 h-5" />
              <div className="text-gray-400 text-xs mt-0.5">{t('signatures.date')}: _______________</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
