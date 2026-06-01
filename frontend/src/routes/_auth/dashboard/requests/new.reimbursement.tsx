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
import { translateApiError } from '../../../../lib/translateApiError'

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
  const [error, setError] = useState('')

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
    setError('')
    try {
      const hasData = (item: ItemRow) =>
        item.description.trim() || item.amount || item.date || item.files.length > 0
      const isComplete = (item: ItemRow) =>
        item.description.trim() && item.amount && item.date
      const incomplete = items.filter((item) => hasData(item) && !isComplete(item))
      if (incomplete.length > 0) {
        setError(t('forms:incompleteItemsError') as string)
        return
      }

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
      setError(translateApiError(err) || (t('forms:saveFailed') as string))
    }
  }

  const isLoading = createReq.isPending || updateReq.isPending || submitReq.isPending || uploadDoc.isPending

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('newGeneral')}</h1>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}
      <PolicyDisplay policyIds={['eligibility', 'receipts', 'equipment']} />
      <Card>
        <CardHeader><span className="font-semibold">{t('details')}</span></CardHeader>
        <CardBody className="space-y-4">
          <Input label={t('fields.title') as string} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label={`${t('fields.description')} ${t('forms:optional')}`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="font-semibold">{t('expenseItems')}</span></CardHeader>
        <CardBody className="space-y-4">
          {items.map((item, index) => (
            <div key={item._key} className="p-4 border border-gray-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('item', { n: index + 1 })}</span>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => removeRow(index)}
                  >
                    {t('forms:remove')}
                  </Button>
                )}
              </div>
              <Input
                label={t('fields.description') as string}
                value={item.description}
                onChange={(e) => setItem(index, 'description', e.target.value)}
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
                  required
                />
                <DateInput
                  label={t('fields.date') as string}
                  value={item.date}
                  onChange={(e) => setItem(index, 'date', e.target.value)}
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
          ))}
          <Button variant="secondary" type="button" onClick={addRow}>
            {t('forms:addRowPlus')}
          </Button>
        </CardBody>
      </Card>

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
