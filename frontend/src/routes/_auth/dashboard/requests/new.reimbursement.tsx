import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateRequest, useUpdateRequest, useSubmitRequest } from '../../../../hooks/useRequests'
import { useUploadDocument } from '../../../../hooks/useDocuments'
import { dateInputToISO } from '../../../../utils/dates'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card'
import { DateInput } from '../../../../components/ui/DateInput'
import { DocumentUpload } from '../../../../components/forms/DocumentUpload'
import { PolicyDisplay } from '../../../../components/forms/PolicyDisplay'
import { FormError } from '../../../../components/forms/FormError'
import { TrashIcon } from '../../../../components/ui/icons'
import { translateApiError } from '../../../../lib/translateApiError'
import { validateExpenseItems, type ExpenseItemErrors } from '../../../../lib/validateExpenseItems'

export const Route = createFileRoute('/_auth/dashboard/requests/new/reimbursement')({ component: NewReimbursementPage })

interface ItemRow {
  _key: string
  description: string
  amount: string
  date: string
  vendor: string
  files: File[]
}

function blankItem(): ItemRow {
  return { _key: crypto.randomUUID(), description: '', amount: '', date: '', vendor: '', files: [] }
}

function NewReimbursementPage() {
  const navigate = useNavigate()
  const createReq = useCreateRequest()
  const submitReq = useSubmitRequest()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const updateReq = useUpdateRequest()
  const uploadDoc = useUploadDocument()
  const { t } = useTranslation(['requests', 'forms'])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<ItemRow[]>([blankItem()])
  // API errors are kept raw and translated at render so they follow locale
  // changes (#6e); field errors hold i18n keys for the same reason.
  const [apiError, setApiError] = useState<unknown>(null)
  const [titleError, setTitleError] = useState('')
  const [itemErrors, setItemErrors] = useState<Record<number, ExpenseItemErrors>>({})

  const setItem = (index: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const setItemFiles = (index: number, newFiles: File[]) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, files: newFiles } : row)))
  }

  const addRow = () => setItems((prev) => [...prev, blankItem()])

  const removeRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (andSubmit = false) => {
    setApiError(null)

    // Inline field-level validation (#6c). Errors are i18n keys.
    const { itemErrors: fieldErrs } = validateExpenseItems(
      items.map((it) => ({ label: it.description, amount: it.amount, date: it.date, files: it.files })),
      { labelRequiredKey: 'forms:validation.descriptionRequired' },
    )
    const tErr = title.trim() ? '' : 'forms:validation.titleRequired'
    setItemErrors(fieldErrs)
    setTitleError(tErr)
    if (tErr || Object.keys(fieldErrs).length > 0) {
      const targetId = tErr ? 'rb-title' : `rb-item-${Object.keys(fieldErrs)[0]}`
      requestAnimationFrame(() =>
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }

    try {
      let id = createdId
      if (!id) {
        const req = await createReq.mutateAsync({
          type: 'REIMBURSEMENT',
          title,
          description: description || undefined,
        })
        id = req.id
        setCreatedId(id)
      }

      const validItems = items.filter(
        (item) => item.description.trim() && item.amount && item.date,
      )

      const result = await updateReq.mutateAsync({
        id,
        data: {
          reimbursement: {
            items: validItems.map((item) => ({
              description: item.description.trim(),
              amount: parseFloat(item.amount),
              date: dateInputToISO(item.date),
              vendor: item.vendor.trim() || undefined,
            })),
          },
        },
      })

      const createdItems = result.reimbursement?.items ?? []
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i]
        const createdItem = createdItems[i]
        if (createdItem && item.files.length > 0) {
          for (const file of item.files) {
            await uploadDoc.mutateAsync({ requestId: id!, file, itemId: createdItem.id })
          }
        }
      }

      if (andSubmit) await submitReq.mutateAsync(id)
      navigate({ to: '/dashboard/requests/$requestId', params: { requestId: id } })
    } catch (err: unknown) {
      setApiError(err)
    }
  }

  const isLoading = createReq.isPending || updateReq.isPending || submitReq.isPending || uploadDoc.isPending

  // Computed at render so it tracks the active locale (#6e).
  const summaryError = apiError
    ? translateApiError(apiError)
    : titleError || Object.keys(itemErrors).length > 0
      ? (t('forms:fixErrors') as string)
      : ''

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('newGeneral')}</h1>
      <FormError message={summaryError} />
      <PolicyDisplay policyIds={['eligibility', 'receipts', 'equipment']} />
      <Card>
        <CardHeader><span className="font-semibold">{t('details')}</span></CardHeader>
        <CardBody className="space-y-4">
          <div id="rb-title">
            <Input label={t('fields.title') as string} value={title} onChange={(e) => setTitle(e.target.value)} error={titleError ? (t(titleError) as string) : undefined} required />
          </div>
          <Textarea label={`${t('fields.description')} ${t('forms:optional')}`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="font-semibold">{t('expenseItems')}</span></CardHeader>
        <CardBody className="space-y-4">
          {items.map((item, index) => {
            const fe = itemErrors[index]
            return (
            <div key={item._key} id={`rb-item-${index}`} className="p-4 border border-gray-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">{t('item', { n: index + 1 })}</span>
                {items.length > 1 && (
                  <Button
                    variant="danger"
                    size="sm"
                    type="button"
                    onClick={() => removeRow(index)}
                  >
                    <span className="flex items-center gap-1"><TrashIcon />{t('forms:remove')}</span>
                  </Button>
                )}
              </div>
              <Input
                label={t('fields.description') as string}
                value={item.description}
                onChange={(e) => setItem(index, 'description', e.target.value)}
                error={fe?.label ? (t(fe.label) as string) : undefined}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('fields.amount') as string}
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.amount}
                  onChange={(e) => setItem(index, 'amount', e.target.value)}
                  error={fe?.amount ? (t(fe.amount) as string) : undefined}
                  required
                />
                <DateInput
                  label={t('fields.date') as string}
                  value={item.date}
                  onChange={(e) => setItem(index, 'date', e.target.value)}
                  error={fe?.date ? (t(fe.date) as string) : undefined}
                  required
                />
              </div>
              <Input
                label={`${t('fields.vendor')} ${t('forms:optional')}`}
                value={item.vendor}
                onChange={(e) => setItem(index, 'vendor', e.target.value)}
              />
              <DocumentUpload files={item.files} onChange={(f) => setItemFiles(index, f)} requestId={null} />
            </div>
            )
          })}
          <Button variant="secondary" type="button" onClick={addRow}>
            {t('forms:addRowPlus')}
          </Button>
        </CardBody>
      </Card>

      <FormError message={summaryError} />
      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => handleSave(false)}
          disabled={isLoading}
          loading={isLoading && !submitReq.isPending}
        >
          {t('forms:saveDraft')}
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={isLoading}
          loading={submitReq.isPending}
        >
          {t('forms:saveAndSubmit')}
        </Button>
      </div>
    </div>
  )
}
