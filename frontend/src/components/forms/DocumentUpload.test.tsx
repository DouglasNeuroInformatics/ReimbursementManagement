import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, renderWithProviders, screen } from '../../test/renderWithProviders'
import { mockDocument } from '../../test/handlers'
import { DocumentUpload } from './DocumentUpload'

// File() sizes itself from its content; override `size` to fake large files
// without allocating megabytes.
function fileOfSize(name: string, type: string, bytes: number): File {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: bytes })
  return f
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement
}

afterEach(() => vi.unstubAllGlobals())

describe('DocumentUpload', () => {
  it('accepts a valid file and reports it via onChange', () => {
    const onChange = vi.fn()
    const { container } = renderWithProviders(
      <DocumentUpload files={[]} onChange={onChange} requestId="req-1" />,
    )
    const pdf = fileOfSize('receipt.pdf', 'application/pdf', 1024)
    fireEvent.change(fileInput(container), { target: { files: [pdf] } })
    expect(onChange).toHaveBeenCalledWith([pdf])
  })

  it('rejects a file over the 50MB limit and alerts instead of accepting it', () => {
    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)
    const onChange = vi.fn()
    const { container } = renderWithProviders(
      <DocumentUpload files={[]} onChange={onChange} requestId="req-1" />,
    )
    const big = fileOfSize('huge.pdf', 'application/pdf', 60 * 1024 * 1024)
    fireEvent.change(fileInput(container), { target: { files: [big] } })
    expect(alertSpy).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('rejects an unsupported MIME type and alerts', () => {
    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)
    const onChange = vi.fn()
    const { container } = renderWithProviders(
      <DocumentUpload files={[]} onChange={onChange} requestId="req-1" />,
    )
    const exe = fileOfSize('virus.exe', 'application/x-msdownload', 1024)
    fireEvent.change(fileInput(container), { target: { files: [exe] } })
    expect(alertSpy).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('lists existing documents by filename', () => {
    renderWithProviders(
      <DocumentUpload
        files={[]}
        onChange={vi.fn()}
        requestId="req-1"
        existingDocs={[mockDocument({ filename: 'prior-receipt.pdf' })]}
      />,
    )
    expect(screen.getByText('prior-receipt.pdf')).toBeInTheDocument()
  })
})
