import { useAuth } from '../../hooks/useAuth'
import type { User } from '../../types'

interface Props { user: User }

export function Header({ user }: Props) {
  const { logout } = useAuth()
  return (
    <header className="bg-white/30 backdrop-blur-md border-b border-white/40 px-6 md:px-8 py-4 flex items-center justify-between shrink-0 z-10 sticky top-0">
      <div className="md:hidden flex items-center">
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500 font-outfit tracking-tight">Reimbursements</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-5">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-slate-700">{user.email}</span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-primary-600">{user.role.replace(/_/g, ' ')}</span>
        </div>
        <div className="h-8 w-px bg-slate-200/60" />
        <button
          onClick={logout}
          className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
