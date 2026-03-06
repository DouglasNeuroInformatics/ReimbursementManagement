import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useRequest, useUpdateRequest, useSubmitRequest } from '../../../../hooks/useRequests'
import { useUploadDocument } from '../../../../hooks/useDocuments'
import { useAuth } from '../../../../hooks/useAuth'
import { dateInputToISO, fmtDate } from '../../../../utils/dates'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Textarea } from '../../../../components/ui/Textarea'
import { Card, CardHeader, CardBody } from '../../../../components/ui/Card'
import { DateInput } from '../../../../components/ui/DateInput'
import { DocumentUpload } from '../../../../components/forms/DocumentUpload'
import { PageSpinner } from '../../../../components/ui/Spinner'
import type { Request } from '../../../../types'

export const Route = createFileRoute('/_auth/dashboard/requests/$requestId/edit')({ component: EditRequestPage })

const EDITABLE_STATUSES = ['DRAFT', 'SUPERVISOR_REJECTED', 'FINANCE_REJECTED']

/* ── Reimbursement item row ── */

interface ReimbursementRow {
  _key: string
  description: string
  amount: string
  date: string
  vendor: string
  files: File[]
}

function blankReimbursementRow(): ReimbursementRow {
  return { _key: crypto.randomUUID(), description: '', amount: '', date: '', vendor: '', files: [] }
}

/* ── Travel advance item row ── */

interface TravelAdvanceRow {
  _key: string
  category: string
  amount: string
  notes: string
}

/* ── Travel reimbursement item row ── */

interface TravelExpenseRow {
  _key: string
  date: string
  category: string
  amount: string
  vendor: string
  notes: string
}

/* ── Page component ── */

function EditRequestPage() {
  const { requestId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: request, isLoading } = useRequest(requestId)

  const updateReq = useUpdateRequest()
  const submitReq = useSubmitRequest()
  const uploadDoc = useUploadDocument()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [initialized, setInitialized] = useState(false)

  // Reimbursement state
  const [reimbursementItems, setReimbursementItems] = useState<ReimbursementRow[]>([blankReimbursementRow()])

  // Travel advance state
  const [taForm, setTaForm] = useState({ destination: '', purpose: '', departureDate: '', returnDate: '' })
  const [taItems, setTaItems] = useState<TravelAdvanceRow[]>([{ _key: crypto.randomUUID(), category: '', amount: '', notes: '' }])

  // Travel reimbursement state
  const [trForm, setTrForm] = useState({ destination: '', purpose: '', departureDate: '', returnDate: '' })
  const [trItems, setTrItems] = useState<TravelExpenseRow[]>([{ _key: crypto.randomUUID(), date: '', category: '', amount: '', vendor: '', notes: '' }])

  // Request-level files (travel types)
  const [requestFiles, setRequestFiles] = useState<File[]>([])

  // Initialize form from request data (once)
  useEffect(() => {
    if (!request || initialized) return
    setTitle(request.title)
    setDescription(request.description ?? '')

    if (request.reimbursement) {
      const rows = request.reimbursement.items.map((it) => ({
        _key: crypto.randomUUID(),
        description: it.description,
        amount: it.amount,
        date: fmtDate(it.date) === '\u2014' ? '' : fmtDate(it.date),
        vendor: it.vendor ?? '',
        files: [] as File[],
      }))
      setReimbursementItems(rows.length > 0 ? rows : [blankReimbursementRow()])
    }

    if (request.travelAdvance) {
      const ta = request.travelAdvance
      setTaForm({
        destination: ta.destination,
        purpose: ta.purpose,
        departureDate: fmtDate(ta.departureDate) === '\u2014' ? '' : fmtDate(ta.departureDate),
        returnDate: fmtDate(ta.returnDate) === '\u2014' ? '' : fmtDate(ta.returnDate),
      })
      setTaItems(
        ta.items.length > 0
          ? ta.items.map((it) => ({ _key: crypto.randomUUID(), category: it.category, amount: it.amount, notes: it.notes ?? '' }))
          : [{ _key: crypto.randomUUID(), category: '', amount: '', notes: '' }],
      )
    }

    if (request.travelReimbursement) {
      const tr = request.travelReimbursement
      setTrForm({
        destination: tr.destination,
        purpose: tr.purpose,
        departureDate: fmtDate(tr.departureDate) === '\u2014' ? '' : fmtDate(tr.departureDate),
        returnDate: fmtDate(tr.returnDate) === '\u2014' ? '' : fmtDate(tr.returnDate),
      })
      setTrItems(
        tr.items.length > 0
          ? tr.items.map((it) => ({
              _key: crypto.randomUUID(),
              date: fmtDate(it.date) === '\u2014' ? '' : fmtDate(it.date),
              category: it.category,
              amount: it.amount,
              vendor: it.vendor ?? '',
              notes: it.notes ?? '',
            }))
          : [{ _key: crypto.randomUUID(), date: '', category: '', amount: '', vendor: '', notes: '' }],
      )
    }

    setInitialized(true)
  }, [request, initialized])

  if (isLoading) return <PageSpinner />
  if (!request) return <div className="text-center py-12 text-gray-500">Request not found.</div>

  const isOwner = user?.id === request.userId
  if (!isOwner || !EDITABLE_STATUSES.includes(request.status)) {
    return <div className="text-center py-12 text-gray-500">This request cannot be edited.</div>
  }

  /* ── Save handler ── */

  const handleSave = async (andSubmit = false) => {
    setError('')
    try {
      const baseData: Record<string, unknown> = {
        title,
        description: description || null,
      }

      if (request.type === 'REIMBURSEMENT') {
        // Validate: any item with data or files must have all required fields
        const hasData = (it: ReimbursementRow) =>
          it.description.trim() || it.amount || it.date || it.files.length > 0
        const isComplete = (it: ReimbursementRow) =>
          it.description.trim() && it.amount && it.date
        const incomplete = reimbursementItems.filter((it) => hasData(it) && !isComplete(it))
        if (incomplete.length > 0) {
          setError('Each expense item with data or files must have a description, amount, and date.')
          return
        }

        const validItems = reimbursementItems.filter(
          (it) => it.description.trim() && it.amount && it.date,
        )
        baseData.reimbursement = {
          items: validItems.map((it) => ({
            description: it.description.trim(),
            amount: parseFloat(it.amount),
            date: dateInputToISO(it.date),
            vendor: it.vendor.trim() || undefined,
          })),
        }

        const result = await updateReq.mutateAsync({ id: requestId, data: baseData })
        const createdItems = result.reimbursement?.items ?? []

        for (let i = 0; i < validItems.length; i++) {
          const row = validItems[i]
          const createdItem = createdItems[i]
          if (createdItem && row.files.length > 0) {
            for (const file of row.files) {
              await uploadDoc.mutateAsync({ requestId, file, itemId: createdItem.id })
            }
          }
        }
      } else if (request.type === 'TRAVEL_ADVANCE') {
        const validItems = taItems.filter((it) => it.category && it.amount)
        baseData.travelAdvance = {
          destination: taForm.destination,
          purpose: taForm.purpose,
          departureDate: taForm.departureDate ? dateInputToISO(taForm.departureDate) : undefined,
          returnDate: taForm.returnDate ? dateInputToISO(taForm.returnDate) : undefined,
          estimatedAmount: validItems.reduce((s, it) => s + parseFloat(it.amount || '0'), 0),
          items: validItems.map((it) => ({
            category: it.category,
            amount: parseFloat(it.amount),
            notes: it.notes || null,
          })),
        }
        await updateReq.mutateAsync({ id: requestId, data: baseData })

        for (const file of requestFiles) {
          await uploadDoc.mutateAsync({ requestId, file })
        }
      } else if (request.type === 'TRAVEL_REIMBURSEMENT') {
        const validItems = trItems.filter((it) => it.date && it.category && it.amount)
        baseData.travelReimbursement = {
          destination: trForm.destination,
          purpose: trForm.purpose,
          departureDate: trForm.departureDate ? dateInputToISO(trForm.departureDate) : undefined,
          returnDate: trForm.returnDate ? dateInputToISO(trForm.returnDate) : undefined,
          totalAmount: validItems.reduce((s, it) => s + parseFloat(it.amount || '0'), 0),
          items: validItems.map((it) => ({
            date: dateInputToISO(it.date),
            category: it.category,
            amount: parseFloat(it.amount),
            vendor: it.vendor || null,
            notes: it.notes || null,
          })),
        }
        await updateReq.mutateAsync({ id: requestId, data: baseData })

        for (const file of requestFiles) {
          await uploadDoc.mutateAsync({ requestId, file })
        }
      }

      if (andSubmit) await submitReq.mutateAsync(requestId)
      navigate({ to: '/dashboard/requests/$requestId', params: { requestId } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const isSaving = updateReq.isPending || submitReq.isPending || uploadDoc.isPending

  /* ── Reimbursement helpers ── */

  const setReimbursementField = (index: number, field: keyof ReimbursementRow, value: string) => {
    setReimbursementItems((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const setReimbursementFiles = (index: number, newFiles: File[]) => {
    setReimbursementItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, files: newFiles } : row)),
    )
  }

  /* ── Render ── */

  const heading =
    request.type === 'REIMBURSEMENT'
      ? 'Edit General Reimbursement'
      : request.type === 'TRAVEL_ADVANCE'
        ? 'Edit Travel Advance'
        : 'Edit Travel Reimbursement'

  const existingUnlinkedDocs = request.documents?.filter((d) => !d.reimbursementItemId) ?? []

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{heading}</h1>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Common fields */}
      <Card>
        <CardHeader><span className="font-semibold">Request Details</span></CardHeader>
        <CardBody className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        </CardBody>
      </Card>

      {/* ── Reimbursement ── */}
      {request.type === 'REIMBURSEMENT' && (
        <Card>
          <CardHeader><span className="font-semibold">Expense Items</span></CardHeader>
          <CardBody className="space-y-4">
            {reimbursementItems.map((item, index) => (
              <div key={item._key} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                  {reimbursementItems.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => setReimbursementItems((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <Input
                  label="Description"
                  value={item.description}
                  onChange={(e) => setReimbursementField(index, 'description', e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.amount}
                    onChange={(e) => setReimbursementField(index, 'amount', e.target.value)}
                    required
                  />
                  <DateInput
                    label="Date"
                    value={item.date}
                    onChange={(e) => setReimbursementField(index, 'date', e.target.value)}
                    required
                  />
                </div>
                <Input
                  label="Vendor (optional)"
                  value={item.vendor}
                  onChange={(e) => setReimbursementField(index, 'vendor', e.target.value)}
                />

                <DocumentUpload
                  files={item.files}
                  onChange={(f) => setReimbursementFiles(index, f)}
                  requestId={requestId}
                  existingDocs={request.reimbursement?.items[index]?.documents}
                />
              </div>
            ))}
            <Button variant="secondary" type="button" onClick={() => setReimbursementItems((prev) => [...prev, blankReimbursementRow()])}>
              + Add Row
            </Button>
          </CardBody>
        </Card>
      )}

      {/* ── Travel Advance ── */}
      {request.type === 'TRAVEL_ADVANCE' && (
        <>
          <Card>
            <CardHeader><span className="font-semibold">Trip Details</span></CardHeader>
            <CardBody className="space-y-4">
              <Input label="Destination" value={taForm.destination} onChange={(e) => setTaForm((f) => ({ ...f, destination: e.target.value }))} required />
              <Input label="Purpose" value={taForm.purpose} onChange={(e) => setTaForm((f) => ({ ...f, purpose: e.target.value }))} required />
              <div className="grid grid-cols-2 gap-4">
                <DateInput label="Departure Date" value={taForm.departureDate} onChange={(e) => setTaForm((f) => ({ ...f, departureDate: e.target.value }))} required />
                <DateInput label="Return Date" value={taForm.returnDate} onChange={(e) => setTaForm((f) => ({ ...f, returnDate: e.target.value }))} required />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Estimated Expenses</span>
                <Button size="sm" variant="secondary" type="button" onClick={() => setTaItems((its) => [...its, { _key: crypto.randomUUID(), category: '', amount: '', notes: '' }])}>Add Row</Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {taItems.map((it, i) => (
                  <div key={it._key} className="grid grid-cols-3 gap-2 items-start">
                    <Input placeholder="Category" value={it.category} onChange={(e) => setTaItems((its) => its.map((r, idx) => (idx === i ? { ...r, category: e.target.value } : r)))} />
                    <Input placeholder="Amount" type="number" step="0.01" value={it.amount} onChange={(e) => setTaItems((its) => its.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)))} />
                    <div className="flex gap-1">
                      <Input placeholder="Notes" value={it.notes} onChange={(e) => setTaItems((its) => its.map((r, idx) => (idx === i ? { ...r, notes: e.target.value } : r)))} />
                      {taItems.length > 1 && <button type="button" onClick={() => setTaItems((its) => its.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 px-1">{'\u2715'}</button>}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><span className="font-semibold">Supporting Documents</span></CardHeader>
            <CardBody>
              <DocumentUpload files={requestFiles} onChange={setRequestFiles} requestId={requestId} existingDocs={existingUnlinkedDocs} />
            </CardBody>
          </Card>
        </>
      )}

      {/* ── Travel Reimbursement ── */}
      {request.type === 'TRAVEL_REIMBURSEMENT' && (
        <>
          <Card>
            <CardHeader><span className="font-semibold">Trip Details</span></CardHeader>
            <CardBody className="space-y-4">
              <Input label="Destination" value={trForm.destination} onChange={(e) => setTrForm((f) => ({ ...f, destination: e.target.value }))} required />
              <Input label="Purpose" value={trForm.purpose} onChange={(e) => setTrForm((f) => ({ ...f, purpose: e.target.value }))} required />
              <div className="grid grid-cols-2 gap-4">
                <DateInput label="Departure Date" value={trForm.departureDate} onChange={(e) => setTrForm((f) => ({ ...f, departureDate: e.target.value }))} required />
                <DateInput label="Return Date" value={trForm.returnDate} onChange={(e) => setTrForm((f) => ({ ...f, returnDate: e.target.value }))} required />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Actual Expenses</span>
                <Button size="sm" variant="secondary" type="button" onClick={() => setTrItems((its) => [...its, { _key: crypto.randomUUID(), date: '', category: '', amount: '', vendor: '', notes: '' }])}>Add Row</Button>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {trItems.map((it, i) => (
                  <div key={it._key} className="grid grid-cols-4 gap-2 items-start">
                    <DateInput placeholder="YYYY-MM-DD" value={it.date} onChange={(e) => setTrItems((its) => its.map((r, idx) => (idx === i ? { ...r, date: e.target.value } : r)))} />
                    <Input placeholder="Category" value={it.category} onChange={(e) => setTrItems((its) => its.map((r, idx) => (idx === i ? { ...r, category: e.target.value } : r)))} />
                    <Input placeholder="Amount" type="number" step="0.01" value={it.amount} onChange={(e) => setTrItems((its) => its.map((r, idx) => (idx === i ? { ...r, amount: e.target.value } : r)))} />
                    <div className="flex gap-1">
                      <Input placeholder="Vendor" value={it.vendor} onChange={(e) => setTrItems((its) => its.map((r, idx) => (idx === i ? { ...r, vendor: e.target.value } : r)))} />
                      {trItems.length > 1 && <button type="button" onClick={() => setTrItems((its) => its.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 px-1">{'\u2715'}</button>}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader><span className="font-semibold">Supporting Documents</span></CardHeader>
            <CardBody>
              <DocumentUpload files={requestFiles} onChange={setRequestFiles} requestId={requestId} existingDocs={existingUnlinkedDocs} />
            </CardBody>
          </Card>
        </>
      )}

      {/* ── Action buttons ── */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => navigate({ to: '/dashboard/requests/$requestId', params: { requestId } })}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSave(false)}
          disabled={isSaving}
          loading={isSaving && !submitReq.isPending}
        >
          Save
        </Button>
        <Button
          onClick={() => handleSave(true)}
          disabled={isSaving}
          loading={submitReq.isPending}
        >
          Save &amp; Submit
        </Button>
      </div>
    </div>
  )
}
