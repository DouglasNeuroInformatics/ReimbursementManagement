import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]',
        {
          'bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-sm hover:from-primary-400 hover:to-primary-500 hover:shadow hover:shadow-primary-500/25 focus:ring-primary-500 border border-primary-600/50': variant === 'primary',
          'bg-white text-slate-700 border border-slate-200/80 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow focus:ring-slate-400': variant === 'secondary',
          'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm hover:from-red-400 hover:to-red-500 hover:shadow hover:shadow-red-500/25 focus:ring-red-500 border border-red-600/50': variant === 'danger',
          'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 focus:ring-slate-400 active:bg-slate-200/80': variant === 'ghost',
          'px-3 py-1.5 text-xs rounded-lg': size === 'sm',
          'px-4 py-2 text-sm': size === 'md',
          'px-6 py-2.5 text-base': size === 'lg',
        },
        className,
      )}
    >
      {loading ? <span className="mr-2 h-4 w-4 border-2 border-current border-t-transparent border-r-transparent rounded-full animate-spin" /> : null}
      {children}
    </button>
  )
}
