import { dateInputToISO } from '../../../../utils/dates'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useCreateRequest, useUpdateRequest, useSubmitRequest } from '../../../../hooks/useRequests'
import { useUploadDocument } from '../../../../hooks/useDocuments'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card'
import { DateInput } from '../../../../components/ui/DateInput'
import { DocumentUpload } from '../../../../components/forms/DocumentUpload'

export const Route = createFileRoute('/_auth/dashboard/requests/new/travel-advance')({ component: NewTravelAdvancePage })

type Item = { _key: string; category: string; amount: string; notes: string }

function NewTravelAdvancePage() {
  const navigate = useNavigate()
  const createReq = useCreateRequest()
  const submitReq = useSubmitRequest()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const updateReq = useUpdateRequest()
  const uploadDoc = useUploadDocument()
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
            estimatedAmount: validItems.reduce((s, it) => s + parseFloat(it.amount || '0'), 0),
            items: validItems.map((it) => ({ category: it.category, amount: parseFloat(it.amount), notes: it.notes || null })),
          },
        },
      })
      for (const file of files) await uploadDoc.mutateAsync({ requestId: id!, file })
      if (andSubmit) await submitReq.mutateAsync(id)
      navigate({ to: '/dashboard/requests/$requestId', params: { requestId: id } })
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
  }

  const isLoading = createReq.isPending || updateReq.isPending || submitReq.isPending

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Travel Advance</h1>
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      <Card><CardHeader><span className="font-semibold">Request Details</span></CardHeader>
        <CardBody className="space-y-4">
          <Input label="Title" value={form.title} onChange={set('title')} required />
          <Textarea label="Description (optional)" value={form.description} onChange={set('description')} />
        </CardBody></Card>
      <Card><CardHeader><span className="font-semibold">Trip Details</span></CardHeader>
        <CardBody className="space-y-4">
          <Input label="Destination" value={form.destination} onChange={set('destination')} required />
          <Input label="Purpose" value={form.purpose} onChange={set('purpose')} required />
          <div className="grid grid-cols-2 gap-4">
            <DateInput label="Departure Date" value={form.departureDate} onChange={set('departureDate')} required />
            <DateInput label="Return Date" value={form.returnDate} onChange={set('returnDate')} required />
          </div>
        </CardBody></Card>
      <Card><CardHeader><div className="flex items-center justify-between"><span className="font-semibold">Estimated Expenses</span><Button size="sm" variant="secondary" type="button" onClick={() => setItems((its) => [...its, { _key: crypto.randomUUID(), category: '', amount: '', notes: '' }])}>Add Row</Button></div></CardHeader>
        <CardBody>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={it._key} className="grid grid-cols-3 gap-2 items-start">
                <Input placeholder="Category" value={it.category} onChange={setItem(i, 'category')} />
                <Input placeholder="Amount" type="number" step="0.01" value={it.amount} onChange={setItem(i, 'amount')} />
                <div className="flex gap-1">
                  <Input placeholder="Notes" value={it.notes} onChange={setItem(i, 'notes')} />
                  {items.length > 1 && <button type="button" onClick={() => setItems((its) => its.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 px-1">✕</button>}
                </div>
              </div>
            ))}
          </div>
        </CardBody></Card>
      <Card><CardHeader><span className="font-semibold">Supporting Documents</span></CardHeader><CardBody><DocumentUpload files={files} onChange={setFiles} requestId={createdId} /></CardBody></Card>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => handleSave(false)} loading={isLoading && !submitReq.isPending}>Save as Draft</Button>
        <Button onClick={() => handleSave(true)} loading={submitReq.isPending}>Save & Submit</Button>
      </div>
    </div>
  )
}
