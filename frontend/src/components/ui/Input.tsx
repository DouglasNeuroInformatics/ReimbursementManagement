import { clsx } from 'clsx'
import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...rest }: Props) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">{label}</label>}
      <input
        id={inputId}
        {...rest}
        className={clsx(
          'block w-full border rounded-xl px-4 py-2.5 text-sm bg-white shadow-sm ring-1 ring-inset ring-slate-300/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-all duration-200 placeholder:text-slate-400',
          error ? 'border-red-400 bg-red-50 text-red-900 ring-red-400/50 focus:ring-red-500' : 'border-slate-200/60 hover:border-slate-300',
          className,
        )}
      />
      {error && <p className="text-xs font-medium text-red-600 animate-fade-in">{error}</p>}
    </div>
  )
}
