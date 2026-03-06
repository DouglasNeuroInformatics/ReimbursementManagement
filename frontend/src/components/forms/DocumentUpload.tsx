import { useRef, useState } from 'react'
import { useGetDocumentUrl, useDeleteDocument } from '../../hooks/useDocuments'
import type { Document } from '../../types'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  requestId: string | null
  existingDocs?: Document[]
  readOnly?: boolean
}

const MAX_MB = 50

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
])

const ACCEPT = Array.from(ALLOWED_TYPES).join(',')

export function DocumentUpload({ files, onChange, requestId, existingDocs = [], readOnly = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const dragCounter = useRef(0)
  const getUrl = useGetDocumentUrl(requestId ?? '')
  const deleteDoc = useDeleteDocument(requestId ?? '')

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const valid: File[] = []
    const rejected: string[] = []
    for (const f of Array.from(incoming)) {
      if (f.size > MAX_MB * 1024 * 1024) { alert(`${f.name} exceeds ${MAX_MB}MB limit`); continue }
      if (!ALLOWED_TYPES.has(f.type)) { rejected.push(f.name); continue }
      valid.push(f)
    }
    if (rejected.length > 0) {
      alert(`Unsupported file type: ${rejected.join(', ')}\nAllowed: PDF, images, Word, Excel, CSV, plain text`)
    }
    if (valid.length > 0) onChange([...files, ...valid])
  }

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop zone for file uploads. Click or press Enter to browse files."
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50'
          }`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click() } }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current++; setDragOver(true) }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current--; if (dragCounter.current === 0) setDragOver(false) }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current = 0; setDragOver(false); handleFiles(e.dataTransfer.files) }}
        >
          <svg className={`mx-auto h-10 w-10 mb-3 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {dragOver ? (
            <p className="text-sm font-medium text-blue-600">Drop files to upload</p>
          ) : (
            <p className="text-sm text-gray-500">Drag & drop files here, or <span className="text-blue-600 font-medium">browse</span></p>
          )}
          <p className="text-xs text-gray-400 mt-1">PDF, images, Word, Excel {"\u2014"} max {MAX_MB}MB each</p>
          <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
        </div>
      )}

      {existingDocs.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Uploaded</p>
          {existingDocs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-sm">
              <span className="text-gray-700 truncate">{doc.filename}</span>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  className="text-blue-600 hover:underline text-xs"
                  onClick={async () => { const url = await getUrl.mutateAsync(doc.id); window.open(url, '_blank') }}
                >
                  Download
                </button>
                {requestId && !readOnly && (
                  <button className="text-red-400 hover:text-red-600 text-xs" onClick={() => deleteDoc.mutate(doc.id)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending upload</p>
          {files.map((f, i) => (
            <div key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between py-1.5 px-3 bg-blue-50 rounded-lg text-sm">
              <span className="text-gray-700 truncate">{f.name}</span>
              <button className="text-red-400 hover:text-red-600 text-xs ml-2" onClick={() => onChange(files.filter((_, idx) => idx !== i))}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
