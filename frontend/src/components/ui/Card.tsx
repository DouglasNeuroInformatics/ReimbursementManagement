import { clsx } from 'clsx'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('bg-white rounded-2xl border border-slate-200/60 shadow-sm transition-shadow duration-300 hover:shadow-md overflow-hidden', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('px-6 md:px-8 py-5 border-b border-slate-100/80 bg-slate-50/50', className)}>{children}</div>
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('px-6 md:px-8 py-6', className)}>{children}</div>
}
