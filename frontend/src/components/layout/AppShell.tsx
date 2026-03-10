import type { User } from '../../types'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface Props {
  user: User
  children: React.ReactNode
}

export function AppShell({ user, children }: Props) {
  return (
    <div className="flex h-screen bg-slate-50/50 relative overflow-hidden font-inter text-slate-900">
      {/* Ambient background decoration */}
      <div className="absolute -top-[15%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-200/30 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-[15%] -right-[10%] w-[60%] h-[50%] rounded-full bg-blue-200/20 blur-[100px] pointer-events-none" />
      
      <div className="flex w-full h-full p-3 sm:p-4 gap-4 relative z-10 transition-all duration-300">
        <Sidebar user={user} />
        <div className="flex flex-col flex-1 overflow-hidden rounded-2xl glass shadow-sm border border-white/60">
          <Header user={user} />
          <main className="flex-1 overflow-y-auto p-6 md:p-8 animate-fade-in">{children}</main>
        </div>
      </div>
    </div>
  )
}
