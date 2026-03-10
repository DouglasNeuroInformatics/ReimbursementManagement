import { Link } from '@tanstack/react-router'
import type { User } from '../../types'

interface Props { user: User }

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center px-4 py-2.5 text-sm font-medium rounded-xl text-slate-600 hover:bg-white/60 hover:text-slate-900 transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
      activeProps={{ className: 'flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl bg-white/80 text-primary-700 shadow-sm ring-1 ring-primary-900/5 scale-[1.02]' }}
    >
      {children}
    </Link>
  )
}

export function Sidebar({ user }: Props) {
  return (
    <aside className="w-64 glass-dark !bg-white/40 border border-white/60 flex flex-col shrink-0 rounded-2xl shadow-sm overflow-hidden hidden md:flex animate-slide-in">
      <div className="px-6 py-6 border-b border-white/40">
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500 font-outfit tracking-tight">Reimbursements</span>
      </div>
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <NavItem to="/dashboard">Dashboard</NavItem>
        <NavItem to="/dashboard/requests">My Requests</NavItem>
        {(user.role === 'SUPERVISOR' || user.role === 'FINANCIAL_ADMIN') && (
          <div className="pt-4 pb-1">
            <span className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Management</span>
          </div>
        )}
        {(user.role === 'SUPERVISOR' || user.role === 'FINANCIAL_ADMIN') && (
          <>
            <NavItem to="/review">Review Queue</NavItem>
            <NavItem to="/review/history">Request History</NavItem>
          </>
        )}
        {user.role === 'FINANCIAL_ADMIN' && (
          <div className="pt-4 pb-1">
            <span className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Administration</span>
          </div>
        )}
        {user.role === 'FINANCIAL_ADMIN' && (
          <>
            <NavItem to="/finance">Finance Queue</NavItem>
            <NavItem to="/admin/users">Admin</NavItem>
          </>
        )}
      </nav>
      <div className="p-4 border-t border-white/40 bg-white/20">
        <Link
          to="/profile"
          className="block px-4 py-3 text-xs rounded-xl text-slate-600 hover:bg-white/80 hover:text-slate-900 transition-all duration-200 hover:shadow-sm"
          activeProps={{ className: 'block px-4 py-3 text-xs rounded-xl bg-white text-primary-700 shadow-sm ring-1 ring-black/5' }}
        >
          <div className="font-semibold text-sm text-current mb-0.5">{user.firstName} {user.lastName}</div>
          <div className="opacity-70 font-medium">{user.role.replace(/_/g, ' ')}</div>
        </Link>
      </div>
    </aside>
  )
}
