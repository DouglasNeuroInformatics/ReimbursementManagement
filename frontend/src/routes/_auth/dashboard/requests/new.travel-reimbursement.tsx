import { dateInputToISO } from '../../../../utils/dates'
import { sumAmounts } from '../../../../utils/currency'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateRequest, useUpdateRequest, useSubmitRequest } from '../../../../hooks/useRequests'
import { useUploadDocument } from '../../../../hooks/useDocuments'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card'
import { DateInput } from '../../../../components/ui/DateInput'
import { DocumentUpload } from '../../../../components/forms/DocumentUpload'
import { PolicyDisplay } from '../../../../components/forms/PolicyDisplay'
import { FormError } from '../../../../components/forms/FormError'
import { translateApiError } from '../../../../lib/translateApiError'
import { validateExpenseItems, type ExpenseItemErrors } from '../../../../lib/validateExpenseItems'

export const Route = createFileRoute('/_auth/dashboard/requests/new/travel-reimbursement')({ component: NewTravelReimbursementPage })

type Item = { _key: string; date: string; category: string; amount: string; vendor: string; notes: string }

function NewTravelReimbursementPage() {
  const navigate = useNavigate()
  const createReq = useCreateRequest()
  const submitReq = useSubmitRequest()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const updateReq = useUpdateRequest()
  const uploadDoc = useUploadDocument()
  const { t } = useTranslation(['requests', 'forms'])
  const [form, setForm] = useState({ title: '', description: '', destination: '', purpose: '', departureDate: '', returnDate: '' })
  const [items, setItems] = useState<Item[]>([{ _key: crypto.randomUUID(), date: '', category: '', amount: '', vendor: '', notes: '' }])
  const [files, setFiles] = useState<File[]>([])
  const [apiError, setApiError] = useState<unknown>(null)
  const [topErrors, setTopErrors] = useState<{ title?: string; destination?: string; purpose?: string }>({})
  const [itemErrors, setItemErrors] = useState<Record<number, ExpenseItemErrors>>({})

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setItem = (i: number, k: keyof Item) => (e: React.ChangeEvent<HTMLInputElement>) => setItems((its) => its.map((it, idx) => idx === i ? { ...it, [k]: e.target.value } : it))

  const handleSave = async (andSubmit = false) => {
    setApiError(null)
    const { itemErrors: fieldErrs } = validateExpenseItems(
      items.map((it) => ({ label: it.category, amount: it.amount, date: it.date })),
      { labelRequiredKey: 'forms:validation.categoryRequired', requireDate: true },
    )
    const te: { title?: string; destination?: string; purpose?: string } = {}
    if (!form.title.trim()) te.title = 'forms:validation.titleRequired'
    if (!form.destination.trim()) te.destination = 'forms:validation.destinationRequired'
    if (!form.purpose.trim()) te.purpose = 'forms:validation.purposeRequired'
    setTopErrors(te)
    setItemErrors(fieldErrs)
    if (Object.keys(te).length > 0 || Object.keys(fieldErrs).length > 0) {
      const targetId = te.title ? 'tr-title' : te.destination ? 'tr-destination' : te.purpose ? 'tr-purpose' : `tr-item-${Object.keys(fieldErrs)[0]}`
      requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
      return
    }
    try {
      let id = createdId
      if (!id) {
        const req = await createReq.mutateAsync({ type: 'TRAVEL_REIMBURSEMENT', title: form.title, description: form.description || undefined })
        id = req.id; setCreatedId(id)
      }
      const validItems = items.filter((it) => it.date && it.category && it.amount)
      await updateReq.mutateAsync({
        id,
        data: {
          title: form.title, description: form.description || null,
          travelReimbursement: {
            destination: form.destination, purpose: form.purpose,
            departureDate: form.departureDate ? dateInputToISO(form.departureDate) : undefined,
            returnDate: form.returnDate ? dateInputToISO(form.returnDate) : undefined,
            totalAmount: sumAmounts(validItems),
            items: validItems.map((it) => ({ date: dateInputToISO(it.date), category: it.category, amount: parseFloat(it.amount), vendor: it.vendor || null, notes: it.notes || null })),
          },
        },
      })
      for (const file of files) await uploadDoc.mutateAsync({ requestId: id!, file })
      if (andSubmit) await submitReq.mutateAsync(id)
      navigate({ to: '/dashboard/requests/$requestId', params: { requestId: id } })
    } catch (err: unknown) { setApiError(err) }
  }

  const isLoading = createReq.isPending || updateReq.isPending || submitReq.isPending
  const summaryError = apiError
    ? translateApiError(apiError)
    : Object.keys(topErrors).length > 0 || Object.keys(itemErrors).length > 0
      ? (t('forms:fixErrors') as string)
      : ''

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('newTravelReimbursement')}</h1>
      <FormError message={summaryError} />
      <PolicyDisplay policyIds={['eligibility', 'receipts', 'meals', 'accommodations', 'airfare', 'car_rental', 'gas', 'taxi', 'parking', 'exchange_rate']} />
      <Card><CardHeader><span className="font-semibold">{t('details')}</span></CardHeader>
        <CardBody className="space-y-4">
          <div id="tr-title"><Input label={t('fields.title') as string} value={form.title} onChange={set('title')} error={topErrors.title ? (t(topErrors.title) as string) : undefined} required /></div>
          <Textarea label={`${t('fields.description')} ${t('forms:optional')}`} value={form.description} onChange={set('description')} />
        </CardBody></Card>
      <Card><CardHeader><span className="font-semibold">{t('tripDetails')}</span></CardHeader>
        <CardBody className="space-y-4">
          <div id="tr-destination"><Input label={t('fields.destination') as string} value={form.destination} onChange={set('destination')} error={topErrors.destination ? (t(topErrors.destination) as string) : undefined} required /></div>
          <div id="tr-purpose"><Input label={t('fields.purpose') as string} value={form.purpose} onChange={set('purpose')} error={topErrors.purpose ? (t(topErrors.purpose) as string) : undefined} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <DateInput label={t('fields.departureDate') as string} value={form.departureDate} onChange={set('departureDate')} required />
            <DateInput label={t('fields.returnDate') as string} value={form.returnDate} onChange={set('returnDate')} required />
          </div>
        </CardBody></Card>
      <Card><CardHeader><div className="flex items-center justify-between"><span className="font-semibold">{t('actualExpenses')}</span><Button size="sm" variant="secondary" type="button" onClick={() => setItems((its) => [...its, { _key: crypto.randomUUID(), date: '', category: '', amount: '', vendor: '', notes: '' }])}>{t('forms:addRow')}</Button></div></CardHeader>
        <CardBody>
          <div className="space-y-2">
            {items.map((it, i) => {
              const fe = itemErrors[i]
              return (
              <div key={it._key} id={`tr-item-${i}`} className="grid grid-cols-4 gap-2 items-start">
                <DateInput placeholder="YYYY-MM-DD" value={it.date} onChange={setItem(i, 'date')} error={fe?.date ? (t(fe.date) as string) : undefined} />
                <Input placeholder={t('fields.category') as string} value={it.category} onChange={setItem(i, 'category')} error={fe?.label ? (t(fe.label) as string) : undefined} />
                <Input placeholder={t('fields.amount') as string} type="number" step="0.01" value={it.amount} onChange={setItem(i, 'amount')} error={fe?.amount ? (t(fe.amount) as string) : undefined} />
                <div className="flex gap-1">
                  <Input placeholder={t('fields.vendor') as string} value={it.vendor} onChange={setItem(i, 'vendor')} />
                  {items.length > 1 && <button type="button" onClick={() => setItems((its) => its.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 px-1">✕</button>}
                </div>
              </div>
              )
            })}
          </div>
        </CardBody></Card>
      <Card><CardHeader><span className="font-semibold">{t('supportingDocuments')}</span></CardHeader><CardBody><DocumentUpload files={files} onChange={setFiles} requestId={createdId} /></CardBody></Card>
      <FormError message={summaryError} />
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={isLoading} loading={isLoading && !submitReq.isPending}>{t('forms:saveDraft')}</Button>
        <Button onClick={() => handleSave(true)} disabled={isLoading} loading={submitReq.isPending}>{t('forms:saveAndSubmit')}</Button>
      </div>
    </div>
  )
}
