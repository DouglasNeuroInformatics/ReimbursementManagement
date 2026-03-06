import { Link } from '@tanstack/react-router'
import type { User } from '../../types'

interface Props { user: User }

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      activeProps={{ className: 'flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700' }}
    >
      {children}
    </Link>
  )
}

export function Sidebar({ user }: Props) {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-100">
        <span className="text-base font-semibold text-gray-900">Reimbursements</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        <NavItem to="/dashboard">Dashboard</NavItem>
        <NavItem to="/dashboard/requests">My Requests</NavItem>
        {(user.role === 'SUPERVISOR' || user.role === 'FINANCIAL_ADMIN') && (
          <NavItem to="/review">Review Queue</NavItem>
        )}
        {user.role === 'FINANCIAL_ADMIN' && (
          <>
            <NavItem to="/finance">Finance Queue</NavItem>
            <NavItem to="/admin/users">Admin</NavItem>
          </>
        )}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <Link
          to="/profile"
          className="block px-3 py-2 text-xs rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          activeProps={{ className: 'block px-3 py-2 text-xs rounded-lg bg-blue-50 text-blue-700' }}
        >
          <div className="font-medium text-current">{user.firstName} {user.lastName}</div>
          <div className="opacity-75">{user.role.replace(/_/g, ' ')}</div>
        </Link>
      </div>
    </aside>
  )
}
