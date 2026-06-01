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
import { translateApiError } from '../../../../lib/translateApiError'

export const Route = createFileRoute('/_auth/dashboard/requests/new/travel-advance')({ component: NewTravelAdvancePage })

type Item = { _key: string; category: string; amount: string; notes: string }

function NewTravelAdvancePage() {
  const navigate = useNavigate()
  const createReq = useCreateRequest()
  const submitReq = useSubmitRequest()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const updateReq = useUpdateRequest()
  const uploadDoc = useUploadDocument()
  const { t } = useTranslation(['requests', 'forms'])
  const [form, setForm] = useState({ title: '', description: '', destination: '', purpose: '', departureDate: '', returnDate: '' })
  const [items, setItems] = useState<Item[]>([{ _key: crypto.randomUUID(), category: '', amount: '', notes: '' }])
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setItem = (i: number, k: keyof Item) => (e: React.ChangeEvent<HTMLInputElement>) => setItems((its) => its.map((it, idx) => idx === i ? { ...it, [k]: e.target.value } : it))

  const handleSave = async (andSubmit = false) => {
    setError('')
    try {
      let id = createdId
      if (!id) {
        const req = await createReq.mutateAsync({ type: 'TRAVEL_ADVANCE', title: form.title, description: form.description || undefined })
        id = req.id; setCreatedId(id)
      }
      const validItems = items.filter((it) => it.category && it.amount)
      await updateReq.mutateAsync({
        id,
        data: {
          title: form.title, description: form.description || null,
          travelAdvance: {
            destination: form.destination, purpose: form.purpose,
            departureDate: form.departureDate ? dateInputToISO(form.departureDate) : undefined,
            returnDate: form.returnDate ? dateInputToISO(form.returnDate) : undefined,
            estimatedAmount: sumAmounts(validItems),
            items: validItems.map((it) => ({ category: it.category, amount: parseFloat(it.amount), notes: it.notes || null })),
          },
        },
      })
      for (const file of files) await uploadDoc.mutateAsync({ requestId: id!, file })
      if (andSubmit) await submitReq.mutateAsync(id)
      navigate({ to: '/dashboard/requests/$requestId', params: { requestId: id } })
    } catch (err: unknown) { setError(translateApiError(err) || (t('forms:saveGeneric') as string)) }
  }

  const isLoading = createReq.isPending || updateReq.isPending || submitReq.isPending

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('newTravelAdvance')}</h1>
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      <PolicyDisplay policyIds={['advance_request', 'eligibility', 'meals', 'accommodations', 'mileage']} />
      <Card><CardHeader><span className="font-semibold">{t('details')}</span></CardHeader>
        <CardBody className="space-y-4">
          <Input label={t('fields.title') as string} value={form.title} onChange={set('title')} required />
          <Textarea label={`${t('fields.description')} ${t('forms:optional')}`} value={form.description} onChange={set('description')} />
        </CardBody></Card>
      <Card><CardHeader><span className="font-semibold">{t('tripDetails')}</span></CardHeader>
        <CardBody className="space-y-4">
          <Input label={t('fields.destination') as string} value={form.destination} onChange={set('destination')} required />
          <Input label={t('fields.purpose') as string} value={form.purpose} onChange={set('purpose')} required />
          <div className="grid grid-cols-2 gap-4">
            <DateInput label={t('fields.departureDate') as string} value={form.departureDate} onChange={set('departureDate')} required />
            <DateInput label={t('fields.returnDate') as string} value={form.returnDate} onChange={set('returnDate')} required />
          </div>
        </CardBody></Card>
      <Card><CardHeader><div className="flex items-center justify-between"><span className="font-semibold">{t('estimatedExpenses')}</span><Button size="sm" variant="secondary" type="button" onClick={() => setItems((its) => [...its, { _key: crypto.randomUUID(), category: '', amount: '', notes: '' }])}>{t('forms:addRow')}</Button></div></CardHeader>
        <CardBody>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={it._key} className="grid grid-cols-3 gap-2 items-start">
                <Input placeholder={t('fields.category') as string} value={it.category} onChange={setItem(i, 'category')} />
                <Input placeholder={t('fields.amount') as string} type="number" step="0.01" value={it.amount} onChange={setItem(i, 'amount')} />
                <div className="flex gap-1">
                  <Input placeholder={t('fields.notes') as string} value={it.notes} onChange={setItem(i, 'notes')} />
                  {items.length > 1 && <button type="button" onClick={() => setItems((its) => its.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 px-1">✕</button>}
                </div>
              </div>
            ))}
          </div>
        </CardBody></Card>
      <Card><CardHeader><span className="font-semibold">{t('supportingDocuments')}</span></CardHeader><CardBody><DocumentUpload files={files} onChange={setFiles} requestId={createdId} /></CardBody></Card>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={isLoading} loading={isLoading && !submitReq.isPending}>{t('forms:saveDraft')}</Button>
        <Button onClick={() => handleSave(true)} disabled={isLoading} loading={submitReq.isPending}>{t('forms:saveAndSubmit')}</Button>
      </div>
    </div>
  )
}
