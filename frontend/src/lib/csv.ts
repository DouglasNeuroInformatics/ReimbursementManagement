export type CsvCell = string | number | null | undefined

// Excel only auto-detects UTF-8 when the file starts with a byte-order mark.
const UTF8_BOM = '﻿'

/** Escape a single field per RFC 4180: quote when it contains `,` `"` or a newline. */
function escapeCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return ''
  const s = String(cell)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Build an RFC-4180 CSV string from a header row and data rows, prefixed with a
 * UTF-8 BOM so spreadsheet apps render accented (fr-CA) headers correctly.
 * Rows are joined with CRLF as the spec recommends.
 */
export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
  return UTF8_BOM + lines.join('\r\n')
}

/** Trigger a browser download of `content` as a file named `filename`. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
