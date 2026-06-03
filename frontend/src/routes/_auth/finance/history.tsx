import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAllRequests } from '../../../hooks/useAllRequests'
import { RequestsTable } from '../../../components/tables/RequestsTable'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import { PageSpinner } from '../../../components/ui/Spinner'
import { api } from '../../../lib/api'
import { toCsv, downloadCsv, type CsvCell } from '../../../lib/csv'
import { fmtDate } from '../../../utils/dates'
import type {
  FinanceHistory,
  FinanceHistoryLineItem,
  FinanceHistorySummary,
} from '../../../lib/financeHistory'

export const Route = createFileRoute('/_auth/finance/history')({ component: FinanceHistoryPage })

function FinanceHistoryPage() {
  const { data: requests = [], isLoading } = useAllRequests()
  const { t } = useTranslation(['finance', 'requests', 'enums'])
  const [exporting, setExporting] = useState<'lineItems' | 'summary' | null>(null)
  const [error, setError] = useState(false)

  // CSV dates should be blank (not the "—" placeholder fmtDate uses) when absent.
  const csvDate = (iso: string | null) => (iso ? fmtDate(iso) : '')
  const status = (s: string) => t(`status.${s}`, { ns: 'enums', defaultValue: s })
  const reqType = (ty: string) => t(`requestType.${ty}`, { ns: 'enums', defaultValue: ty })
  const fullName = (first: string | null, last: string | null) =>
    [first, last].filter(Boolean).join(' ')

  async function runExport(kind: 'lineItems' | 'summary') {
    setExporting(kind)
    setError(false)
    try {
      const data = await api.get<FinanceHistory>('/api/finance/history')
      const stamp = new Date().toISOString().slice(0, 10)
      if (kind === 'lineItems') {
        downloadCsv(`finance-line-items-${stamp}.csv`, buildLineItemsCsv(data.lineItems))
      } else {
        downloadCsv(`finance-summary-${stamp}.csv`, buildSummaryCsv(data.summaries))
      }
    } catch {
      setError(true)
    } finally {
      setExporting(null)
    }
  }

  function buildLineItemsCsv(rows: FinanceHistoryLineItem[]): string {
    const h = (k: string) => t(`history.lineItemHeaders.${k}`)
    const headers = [
      h('requestId'), h('title'), h('type'), h('status'), h('submitted'),
      h('requester'), h('email'), h('employeeNumber'), h('department'), h('supervisor'),
      h('accountNumber'), h('accountLabel'), h('fund'), h('itemType'), h('description'),
      h('category'), h('date'), h('vendor'), h('amount'), h('notes'),
      h('codeSecondaire'), h('codeLabel'),
    ]
    const body: CsvCell[][] = rows.map((r) => [
      r.requestId, r.title, reqType(r.type), status(r.status), csvDate(r.submittedAt),
      fullName(r.requesterFirstName, r.requesterLastName), r.requesterEmail, r.employeeNumber,
      r.department, fullName(r.supervisorFirstName, r.supervisorLastName),
      r.accountNumber, r.accountLabel, r.fund,
      t(`history.itemType.${r.itemType}`, { defaultValue: r.itemType }),
      r.description, r.category, csvDate(r.date), r.vendor, r.amount, r.notes,
      r.codeSecondaire, r.codeSecondaireLabel,
    ])
    return toCsv(headers, body)
  }

  function buildSummaryCsv(rows: FinanceHistorySummary[]): string {
    const h = (k: string) => t(`history.summaryHeaders.${k}`)
    const headers = [
      h('requestId'), h('title'), h('type'), h('status'), h('submitted'), h('created'),
      h('requester'), h('email'), h('employeeNumber'), h('department'), h('supervisor'),
      h('accountNumber'), h('accountLabel'), h('itemCount'), h('total'),
      h('destination'), h('purpose'), h('departure'), h('return'),
    ]
    const body: CsvCell[][] = rows.map((r) => [
      r.requestId, r.title, reqType(r.type), status(r.status), csvDate(r.submittedAt),
      csvDate(r.createdAt), fullName(r.requesterFirstName, r.requesterLastName), r.requesterEmail,
      r.employeeNumber, r.department, fullName(r.supervisorFirstName, r.supervisorLastName),
      r.accountNumber, r.accountLabel, r.itemCount, r.total,
      r.destination, r.purpose, csvDate(r.departureDate), csvDate(r.returnDate),
    ])
    return toCsv(headers, body)
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('history.title')}</h1>
          <p className="text-sm text-gray-500">{t('history.subtitle')}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => runExport('lineItems')}
              loading={exporting === 'lineItems'}
              disabled={exporting !== null}
            >
              {exporting === 'lineItems' ? t('history.exporting') : t('history.downloadLineItems')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => runExport('summary')}
              loading={exporting === 'summary'}
              disabled={exporting !== null}
            >
              {exporting === 'summary' ? t('history.exporting') : t('history.downloadSummary')}
            </Button>
          </div>
          {error ? <p className="text-sm text-red-600">{t('history.exportError')}</p> : null}
        </div>
      </div>
      <Card>
        <CardHeader>
          <span className="font-semibold">{t('history.title')}</span>
        </CardHeader>
        <CardBody className="p-0">
          <RequestsTable
            data={requests}
            showUser
            showAccount
            linkTo={(r) => `/finance/${r.id}`}
          />
        </CardBody>
      </Card>
    </div>
  )
}
