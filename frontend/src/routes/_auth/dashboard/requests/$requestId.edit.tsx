import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import { useRequest, useUpdateRequest, useSubmitRequest } from '../../../../hooks/useRequests'
import { useUploadDocument } from '../../../../hooks/useDocuments'
import { useAuth } from '../../../../hooks/useAuth'
import { dateInputToISO } from '../../../../utils/dates'
import { sumAmounts } from '../../../../utils/currency'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card'
import { DateInput } from '../../../../components/ui/DateInput'
import { DocumentUpload } from '../../../../components/forms/DocumentUpload'
import { PageSpinner } from '../../../../components/ui/Spinner'
import { translateApiError } from '../../../../lib/translateApiError'
import type { Request } from '../../../../types'

export const Route = createFileRoute('/_auth/dashboard/requests/$requestId/edit')({ component: EditRequestPage })

const EDITABLE_STATUSES = ['DRAFT', 'SUPERVISOR_REJECTED', 'FINANCE_REJECTED']

function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

function EditRequestPage() {
  const { requestId } = Route.useParams()
  const { user } = useAuth()
  const { data, isLoading } = useRequest(requestId)
  const request = data?.request
  const { t } = useTranslation('requests')

  if (isLoading) return <PageSpinner />
  if (!request) return <div className="text-center py-12 text-gray-500">{t('notFound')}</div>

  const isOwner = user?.id === request.userId
  if (!isOwner || !EDITABLE_STATUSES.includes(request.status)) {
    return <div className="text-center py-12 text-gray-500">{t('cannotEdit')}</div>
  }

  if (request.type === 'REIMBURSEMENT') return <ReimbursementEdit request={request} />
  if (request.type === 'TRAVEL_ADVANCE') return <TravelAdvanceEdit request={request} />
  return <TravelReimbursementEdit request={request} />
}

/* ── Shared ── */

function ErrorBanner({ message }: { message: string }) {
  if (!message) return null
  return <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{message}</div>
}

function ActionButtons({
  onCancel,
  onSave,
  onSaveAndSubmit,
  isSaving,
  isSubmitting,
}: {
  onCancel: () => void
  onSave: () => void
  onSaveAndSubmit: () => void
  isSaving: boolean
  isSubmitting: boolean
}) {
  const { t } = useTranslation('forms')
  return (
    <div className="flex gap-3">
      <Button variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
      <Button variant="secondary" onClick={onSave} disabled={isSaving} loading={isSaving && !isSubmitting}>{t('save')}</Button>
      <Button onClick={onSaveAndSubmit} disabled={isSaving} loading={isSubmitting}>{t('saveAndSubmit')}</Button>
    </div>
  )
}

/* ── Reimbursement ── */

interface ReimbursementRow {
  description: string
  amount: string
  date: string
  vendor: string
  files: File[]
}

function ReimbursementEdit({ request }: { request: Request }) {
  const navigate = useNavigate()
  const updateReq = useUpdateRequest()
  const submitReq = useSubmitRequest()
  const uploadDoc = useUploadDocument()
  const [error, setError] = useState('')
  const [andSubmit, setAndSubmit] = useState(false)
  const { t } = useTranslation(['requests', 'forms'])

  const initialItems: ReimbursementRow[] =
    request.reimbursement && request.reimbursement.items.length > 0
      ? request.reimbursement.items.map((it) => ({
          description: it.description,
          amount: it.amount,
          date: toDateInput(it.date),
          vendor: it.vendor ?? '',
          files: [],
        }))
      : [{ description: '', amount: '', date: '', vendor: '', files: [] }]

  const form = useForm({
    defaultValues: {
      title: request.title,
      description: request.description ?? '',
      items: initialItems,
    },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const hasData = (it: ReimbursementRow) => it.description.trim() || it.amount || it.date || it.files.length > 0
        const isComplete = (it: ReimbursementRow) => it.description.trim() && it.amount && it.date
        if (value.items.some((it) => hasData(it) && !isComplete(it))) {
          setError(t('forms:incompleteItemsError') as string)
          return
        }
        const validItems = value.items.filter(isComplete)

        const result = await updateReq.mutateAsync({
          id: request.id,
          data: {
            title: value.title,
            description: value.description || null,
            reimbursement: {
              items: validItems.map((it) => ({
                description: it.description.trim(),
                amount: parseFloat(it.amount),
                date: dateInputToISO(it.date),
                vendor: it.vendor.trim() || undefined,
              })),
            },
          },
        })

        const createdItems = result.reimbursement?.items ?? []
        for (let i = 0; i < validItems.length; i++) {
          const row = validItems[i]
          const createdItem = createdItems[i]
          if (createdItem && row.files.length > 0) {
            for (const file of row.files) {
              await uploadDoc.mutateAsync({ requestId: request.id, file, itemId: createdItem.id })
            }
          }
        }

        if (andSubmit) await submitReq.mutateAsync(request.id)
        navigate({ to: '/dashboard/requests/$requestId', params: { requestId: request.id } })
      } catch (err: unknown) {
        setError(translateApiError(err) || (t('forms:saveFailed') as string))
      }
    },
  })

  const isSaving = updateReq.isPending || submitReq.isPending || uploadDoc.isPending

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }} className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('editGeneral')}</h1>
      <ErrorBanner message={error} />

      <Card>
        <CardHeader><span className="font-semibold">{t('details')}</span></CardHeader>
        <CardBody className="space-y-4">
          <form.Field name="title">
            {(field) => (
              <Input label={t('fields.title') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />
            )}
          </form.Field>
          <form.Field name="description">
            {(field) => (
              <Textarea label={`${t('fields.description')} ${t('forms:optional')}`} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
            )}
          </form.Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="font-semibold">{t('expenseItems')}</span></CardHeader>
        <CardBody className="space-y-4">
          <form.Field name="items" mode="array">
            {(itemsField) => (
              <>
                {itemsField.state.value.map((_, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{t('item', { n: index + 1 })}</span>
                      {itemsField.state.value.length > 1 && (
                        <Button variant="ghost" size="sm" type="button" onClick={() => itemsField.removeValue(index)}>{t('forms:remove')}</Button>
                      )}
                    </div>
                    <form.Field name={`items[${index}].description`}>
                      {(field) => (
                        <Input label={t('fields.description') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />
                      )}
                    </form.Field>
                    <div className="grid grid-cols-2 gap-4">
                      <form.Field name={`items[${index}].amount`}>
                        {(field) => (
                          <Input label={t('fields.amount') as string} type="number" step="0.01" min="0" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />
                        )}
                      </form.Field>
                      <form.Field name={`items[${index}].date`}>
                        {(field) => (
                          <DateInput label={t('fields.date') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />
                        )}
                      </form.Field>
                    </div>
                    <form.Field name={`items[${index}].vendor`}>
                      {(field) => (
                        <Input label={`${t('fields.vendor')} ${t('forms:optional')}`} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                      )}
                    </form.Field>
                    <form.Field name={`items[${index}].files`}>
                      {(field) => (
                        <DocumentUpload
                          files={field.state.value}
                          onChange={(f) => field.handleChange(f)}
                          requestId={request.id}
                          existingDocs={request.reimbursement?.items[index]?.documents}
                        />
                      )}
                    </form.Field>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => itemsField.pushValue({ description: '', amount: '', date: '', vendor: '', files: [] })}
                >
                  {t('forms:addRowPlus')}
                </Button>
              </>
            )}
          </form.Field>
        </CardBody>
      </Card>

      <ActionButtons
        onCancel={() => navigate({ to: '/dashboard/requests/$requestId', params: { requestId: request.id } })}
        onSave={() => { setAndSubmit(false); form.handleSubmit() }}
        onSaveAndSubmit={() => { setAndSubmit(true); form.handleSubmit() }}
        isSaving={isSaving}
        isSubmitting={submitReq.isPending}
      />
    </form>
  )
}

/* ── Travel Advance ── */

interface TravelAdvanceRow {
  category: string
  amount: string
  notes: string
}

function TravelAdvanceEdit({ request }: { request: Request }) {
  const navigate = useNavigate()
  const updateReq = useUpdateRequest()
  const submitReq = useSubmitRequest()
  const uploadDoc = useUploadDocument()
  const [error, setError] = useState('')
  const [andSubmit, setAndSubmit] = useState(false)
  const [requestFiles, setRequestFiles] = useState<File[]>([])
  const { t } = useTranslation(['requests', 'forms'])

  const ta = request.travelAdvance
  const initialItems: TravelAdvanceRow[] =
    ta && ta.items.length > 0
      ? ta.items.map((it) => ({ category: it.category, amount: it.amount, notes: it.notes ?? '' }))
      : [{ category: '', amount: '', notes: '' }]

  const form = useForm({
    defaultValues: {
      title: request.title,
      description: request.description ?? '',
      destination: ta?.destination ?? '',
      purpose: ta?.purpose ?? '',
      departureDate: toDateInput(ta?.departureDate),
      returnDate: toDateInput(ta?.returnDate),
      items: initialItems,
    },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const validItems = value.items.filter((it) => it.category && it.amount)
        await updateReq.mutateAsync({
          id: request.id,
          data: {
            title: value.title,
            description: value.description || null,
            travelAdvance: {
              destination: value.destination,
              purpose: value.purpose,
              departureDate: value.departureDate ? dateInputToISO(value.departureDate) : undefined,
              returnDate: value.returnDate ? dateInputToISO(value.returnDate) : undefined,
              estimatedAmount: sumAmounts(validItems),
              items: validItems.map((it) => ({
                category: it.category,
                amount: parseFloat(it.amount),
                notes: it.notes || null,
              })),
            },
          },
        })

        for (const file of requestFiles) {
          await uploadDoc.mutateAsync({ requestId: request.id, file })
        }

        if (andSubmit) await submitReq.mutateAsync(request.id)
        navigate({ to: '/dashboard/requests/$requestId', params: { requestId: request.id } })
      } catch (err: unknown) {
        setError(translateApiError(err) || (t('forms:saveFailed') as string))
      }
    },
  })

  const isSaving = updateReq.isPending || submitReq.isPending || uploadDoc.isPending
  const existingUnlinkedDocs = request.documents?.filter((d) => !d.reimbursementItemId) ?? []

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }} className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('editTravelAdvance')}</h1>
      <ErrorBanner message={error} />

      <Card>
        <CardHeader><span className="font-semibold">{t('details')}</span></CardHeader>
        <CardBody className="space-y-4">
          <form.Field name="title">
            {(field) => <Input label={t('fields.title') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
          </form.Field>
          <form.Field name="description">
            {(field) => <Textarea label={`${t('fields.description')} ${t('forms:optional')}`} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
          </form.Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="font-semibold">{t('tripDetails')}</span></CardHeader>
        <CardBody className="space-y-4">
          <form.Field name="destination">
            {(field) => <Input label={t('fields.destination') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
          </form.Field>
          <form.Field name="purpose">
            {(field) => <Input label={t('fields.purpose') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
          </form.Field>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="departureDate">
              {(field) => <DateInput label={t('fields.departureDate') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
            </form.Field>
            <form.Field name="returnDate">
              {(field) => <DateInput label={t('fields.returnDate') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
            </form.Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <form.Field name="items" mode="array">
            {(itemsField) => (
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t('estimatedExpenses')}</span>
                <Button size="sm" variant="secondary" type="button" onClick={() => itemsField.pushValue({ category: '', amount: '', notes: '' })}>{t('forms:addRow')}</Button>
              </div>
            )}
          </form.Field>
        </CardHeader>
        <CardBody>
          <form.Field name="items" mode="array">
            {(itemsField) => (
              <div className="space-y-2">
                {itemsField.state.value.map((_, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-start">
                    <form.Field name={`items[${i}].category`}>
                      {(field) => <Input placeholder={t('fields.category') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
                    </form.Field>
                    <form.Field name={`items[${i}].amount`}>
                      {(field) => <Input placeholder={t('fields.amount') as string} type="number" step="0.01" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
                    </form.Field>
                    <div className="flex gap-1">
                      <form.Field name={`items[${i}].notes`}>
                        {(field) => <Input placeholder={t('fields.notes') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
                      </form.Field>
                      {itemsField.state.value.length > 1 && (
                        <button type="button" onClick={() => itemsField.removeValue(i)} className="text-red-400 hover:text-red-600 px-1">{'✕'}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form.Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="font-semibold">{t('supportingDocuments')}</span></CardHeader>
        <CardBody>
          <DocumentUpload files={requestFiles} onChange={setRequestFiles} requestId={request.id} existingDocs={existingUnlinkedDocs} />
        </CardBody>
      </Card>

      <ActionButtons
        onCancel={() => navigate({ to: '/dashboard/requests/$requestId', params: { requestId: request.id } })}
        onSave={() => { setAndSubmit(false); form.handleSubmit() }}
        onSaveAndSubmit={() => { setAndSubmit(true); form.handleSubmit() }}
        isSaving={isSaving}
        isSubmitting={submitReq.isPending}
      />
    </form>
  )
}

/* ── Travel Reimbursement ── */

interface TravelExpenseRow {
  date: string
  category: string
  amount: string
  vendor: string
  notes: string
}

function TravelReimbursementEdit({ request }: { request: Request }) {
  const navigate = useNavigate()
  const updateReq = useUpdateRequest()
  const submitReq = useSubmitRequest()
  const uploadDoc = useUploadDocument()
  const [error, setError] = useState('')
  const [andSubmit, setAndSubmit] = useState(false)
  const [requestFiles, setRequestFiles] = useState<File[]>([])
  const { t } = useTranslation(['requests', 'forms'])

  const tr = request.travelReimbursement
  const initialItems: TravelExpenseRow[] =
    tr && tr.items.length > 0
      ? tr.items.map((it) => ({
          date: toDateInput(it.date),
          category: it.category,
          amount: it.amount,
          vendor: it.vendor ?? '',
          notes: it.notes ?? '',
        }))
      : [{ date: '', category: '', amount: '', vendor: '', notes: '' }]

  const form = useForm({
    defaultValues: {
      title: request.title,
      description: request.description ?? '',
      destination: tr?.destination ?? '',
      purpose: tr?.purpose ?? '',
      departureDate: toDateInput(tr?.departureDate),
      returnDate: toDateInput(tr?.returnDate),
      items: initialItems,
    },
    onSubmit: async ({ value }) => {
      setError('')
      try {
        const validItems = value.items.filter((it) => it.date && it.category && it.amount)
        await updateReq.mutateAsync({
          id: request.id,
          data: {
            title: value.title,
            description: value.description || null,
            travelReimbursement: {
              destination: value.destination,
              purpose: value.purpose,
              departureDate: value.departureDate ? dateInputToISO(value.departureDate) : undefined,
              returnDate: value.returnDate ? dateInputToISO(value.returnDate) : undefined,
              totalAmount: sumAmounts(validItems),
              items: validItems.map((it) => ({
                date: dateInputToISO(it.date),
                category: it.category,
                amount: parseFloat(it.amount),
                vendor: it.vendor || null,
                notes: it.notes || null,
              })),
            },
          },
        })

        for (const file of requestFiles) {
          await uploadDoc.mutateAsync({ requestId: request.id, file })
        }

        if (andSubmit) await submitReq.mutateAsync(request.id)
        navigate({ to: '/dashboard/requests/$requestId', params: { requestId: request.id } })
      } catch (err: unknown) {
        setError(translateApiError(err) || (t('forms:saveFailed') as string))
      }
    },
  })

  const isSaving = updateReq.isPending || submitReq.isPending || uploadDoc.isPending
  const existingUnlinkedDocs = request.documents?.filter((d) => !d.reimbursementItemId) ?? []

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }} className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('editTravelReimbursement')}</h1>
      <ErrorBanner message={error} />

      <Card>
        <CardHeader><span className="font-semibold">{t('details')}</span></CardHeader>
        <CardBody className="space-y-4">
          <form.Field name="title">
            {(field) => <Input label={t('fields.title') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
          </form.Field>
          <form.Field name="description">
            {(field) => <Textarea label={`${t('fields.description')} ${t('forms:optional')}`} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
          </form.Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="font-semibold">{t('tripDetails')}</span></CardHeader>
        <CardBody className="space-y-4">
          <form.Field name="destination">
            {(field) => <Input label={t('fields.destination') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
          </form.Field>
          <form.Field name="purpose">
            {(field) => <Input label={t('fields.purpose') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
          </form.Field>
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="departureDate">
              {(field) => <DateInput label={t('fields.departureDate') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
            </form.Field>
            <form.Field name="returnDate">
              {(field) => <DateInput label={t('fields.returnDate') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} required />}
            </form.Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <form.Field name="items" mode="array">
            {(itemsField) => (
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t('actualExpenses')}</span>
                <Button size="sm" variant="secondary" type="button" onClick={() => itemsField.pushValue({ date: '', category: '', amount: '', vendor: '', notes: '' })}>{t('forms:addRow')}</Button>
              </div>
            )}
          </form.Field>
        </CardHeader>
        <CardBody>
          <form.Field name="items" mode="array">
            {(itemsField) => (
              <div className="space-y-2">
                {itemsField.state.value.map((_, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-start">
                    <form.Field name={`items[${i}].date`}>
                      {(field) => <DateInput placeholder="YYYY-MM-DD" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
                    </form.Field>
                    <form.Field name={`items[${i}].category`}>
                      {(field) => <Input placeholder={t('fields.category') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
                    </form.Field>
                    <form.Field name={`items[${i}].amount`}>
                      {(field) => <Input placeholder={t('fields.amount') as string} type="number" step="0.01" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
                    </form.Field>
                    <div className="flex gap-1">
                      <form.Field name={`items[${i}].vendor`}>
                        {(field) => <Input placeholder={t('fields.vendor') as string} value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
                      </form.Field>
                      {itemsField.state.value.length > 1 && (
                        <button type="button" onClick={() => itemsField.removeValue(i)} className="text-red-400 hover:text-red-600 px-1">{'✕'}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form.Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="font-semibold">{t('supportingDocuments')}</span></CardHeader>
        <CardBody>
          <DocumentUpload files={requestFiles} onChange={setRequestFiles} requestId={request.id} existingDocs={existingUnlinkedDocs} />
        </CardBody>
      </Card>

      <ActionButtons
        onCancel={() => navigate({ to: '/dashboard/requests/$requestId', params: { requestId: request.id } })}
        onSave={() => { setAndSubmit(false); form.handleSubmit() }}
        onSaveAndSubmit={() => { setAndSubmit(true); form.handleSubmit() }}
        isSaving={isSaving}
        isSubmitting={submitReq.isPending}
      />
    </form>
  )
}
