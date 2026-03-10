import { clsx } from 'clsx'
import type { SelectHTMLAttributes } from 'react'

interface Option { value: string; label: string }
interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Option[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className, id, ...rest }: Props) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>}
      <select
        id={inputId}
        {...rest}
        className={clsx(
          'block w-full border rounded-xl px-4 py-2.5 text-sm bg-white shadow-sm ring-1 ring-inset ring-slate-300/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all duration-200 cursor-pointer',
          error ? 'border-red-400 bg-red-50 text-red-900 ring-red-400/50 focus:ring-red-500' : 'border-slate-200/60 hover:border-slate-300',
          className,
        )}
      >
        {placeholder && <option value="" disabled className="text-slate-400">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs font-medium text-red-600 animate-fade-in">{error}</p>}
    </div>
  )
}
