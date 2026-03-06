import { useAuth } from '../../hooks/useAuth'
import type { User } from '../../types'

interface Props { user: User }

export function Header({ user }: Props) {
  const { logout } = useAuth()
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user.email}</span>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
