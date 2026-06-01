import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useRequest, useSubmitRequest, useReviseRequest, useDeleteRequest } from '../../../../hooks/useRequests'
import { useAuth } from '../../../../hooks/useAuth'
import { StatusBadge } from '../../../../components/ui/Badge'
import { Button } from '../../../../components/ui/Button'
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card'
import { PageSpinner } from '../../../../components/ui/Spinner'
import { RequestItemsView } from '../../../../components/RequestItemsView'
import { fmtDateTime } from '../../../../utils/dates'

export const Route = createFileRoute('/_auth/dashboard/requests/$requestId/')({ component: RequestDetailPage })

function RequestDetailPage() {
  const { requestId } = Route.useParams()
  const { user } = useAuth()
  const { data, isLoading } = useRequest(requestId)
  const request = data?.request
  const submitReq = useSubmitRequest()
  const reviseReq = useReviseRequest()
  const deleteReq = useDeleteRequest()
  const navigate = useNavigate()
  const { t } = useTranslation(['requests', 'enums'])

  if (isLoading) return <PageSpinner />
  if (!request) return <div className="text-center py-12 text-gray-500">{t('notFound')}</div>

  const isOwner = user?.id === request.userId
  const canEdit = isOwner && (request.status === 'DRAFT' || request.status === 'SUPERVISOR_REJECTED' || request.status === 'FINANCE_REJECTED')
  const canSubmit = isOwner && request.status === 'DRAFT'
  const canRevise = isOwner && (request.status === 'SUPERVISOR_REJECTED' || request.status === 'FINANCE_REJECTED')
  const canDelete = isOwner && request.status === 'DRAFT'

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={request.status} />
            <span className="text-sm text-gray-500">{t(`requestType.${request.type}`, { ns: 'enums' }) as string}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link to="/dashboard/requests/$requestId/edit" params={{ requestId }}>
              <Button size="sm" variant="secondary">{t('actions.edit')}</Button>
            </Link>
          )}
          {canSubmit && (
            <Button size="sm" loading={submitReq.isPending} onClick={() => submitReq.mutate(request.id)}>{t('actions.submit')}</Button>
          )}
          {canRevise && (
            <Button size="sm" variant="secondary" loading={reviseReq.isPending} onClick={() => reviseReq.mutate(request.id)}>{t('actions.revise')}</Button>
          )}
          {canDelete && (
            <Button size="sm" variant="danger" loading={deleteReq.isPending} onClick={async () => { await deleteReq.mutateAsync(request.id); navigate({ to: '/dashboard/requests' }) }}>{t('actions.delete')}</Button>
          )}
        </div>
      </div>

      {request.description && (
        <Card><CardBody><p className="text-sm text-gray-700">{request.description}</p></CardBody></Card>
      )}

      <RequestItemsView request={request} requestId={requestId} />

      {(request.approvals?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><span className="font-semibold">{t('sections.approvalHistory')}</span></CardHeader>
          <CardBody>
            <div className="space-y-3">
              {request.approvals!.map((a) => (
                <div key={a.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full shrink-0" style={{ background: (a.action === 'APPROVE' || a.action === 'PAID') ? '#22c55e' : '#ef4444' }} />
                  <div>
                    <span className="font-medium">{a.actor.firstName} {a.actor.lastName}</span>
                    <span className="text-gray-500 ml-1">— {t(`stage.${a.stage}`, { ns: 'enums', defaultValue: a.stage }) as string} · {t(`approvalAction.${a.action}`, { ns: 'enums', defaultValue: a.action }) as string}</span>
                    {a.account && <span className="ml-2 text-gray-500">· {t('columns.account')}: {a.account.accountNumber} ({a.account.label})</span>}
                    {a.comment && <p className="text-gray-600 mt-0.5">{a.comment}</p>}
                    <p className="text-gray-400 text-xs mt-0.5">{fmtDateTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
