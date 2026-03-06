import { useRef } from 'react'
import { clsx } from 'clsx'
import type { InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string
}

/**
 * Text input that always displays and accepts dates as YYYY-MM-DD (ISO-8601),
 * with a calendar icon that opens the native date picker.
 *
 * The hidden <input type="date"> is positioned over the icon area; clicking it
 * opens the browser picker. Its onChange writes the YYYY-MM-DD value back into
 * the visible text field via the shared onChange prop — no locale formatting.
 */
export function DateInput({ label, error, className, id, onChange, value, ...rest }: Props) {
  const pickerRef = useRef<HTMLInputElement>(null)
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className={clsx('space-y-1', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Visible ISO text input */}
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={onChange}
          placeholder="YYYY-MM-DD"
          pattern="\d{4}-\d{2}-\d{2}"
          {...rest}
          className={clsx(
            'block w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors pr-9',
            error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
          )}
        />

        {/* Calendar icon — purely decorative, pointer-events-none */}
        <span
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 pointer-events-none"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>

        {/* Transparent date input over the icon — absorbs clicks, opens picker */}
        <input
          ref={pickerRef}
          type="date"
          value={value as string}
          onChange={onChange}
          className="opacity-0 absolute inset-y-0 right-0 w-8 h-full cursor-pointer"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
