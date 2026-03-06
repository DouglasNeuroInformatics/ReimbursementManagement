import type { User } from '../../types'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface Props {
  user: User
  children: React.ReactNode
}

export function AppShell({ user, children }: Props) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
