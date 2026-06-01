import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../../lib/api'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { PageSpinner } from '../../../components/ui/Spinner'
import type { User, SupervisorAccount } from '../../../types'

export const Route = createFileRoute('/_auth/admin/users')({ component: AdminUsersPage })

function AdminUsersPage() {
  const qc = useQueryClient()
  const { t } = useTranslation(['admin', 'enums', 'forms'])
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<{ users: User[] }>('/api/users').then((r) => r.users),
  })
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [expandedAccounts, setExpandedAccounts] = useState<string | null>(null)

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ role: string; supervisorId: string | null }> }) =>
      api.patch(`/api/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditingUser(null) },
  })

  if (isLoading) return <PageSpinner />

  const supervisors = users.filter((u) => u.role === 'SUPERVISOR' || u.role === 'FINANCIAL_ADMIN')

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      <Card>
        <CardHeader><span className="font-semibold">{t('users')}</span></CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('columns.name')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('columns.email')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('columns.role')}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">{t('columns.supervisor')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <UserRow key={u.id} user={u} supervisors={supervisors} onEdit={() => setEditingUser(u.id)} editing={editingUser === u.id} onSave={(d) => updateUser.mutate({ id: u.id, data: d })} onCancel={() => setEditingUser(null)} saving={updateUser.isPending} onToggleAccounts={() => setExpandedAccounts(expandedAccounts === u.id ? null : u.id)} showAccounts={expandedAccounts === u.id} qc={qc} />
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  )
}

function UserRow({ user, supervisors, onEdit, editing, onSave, onCancel, saving, onToggleAccounts, showAccounts, qc }: {
  user: User; supervisors: User[]; onEdit: () => void; editing: boolean; onSave: (d: Partial<{ role: string; supervisorId: string | null }>) => void; onCancel: () => void; saving: boolean; onToggleAccounts: () => void; showAccounts: boolean; qc: ReturnType<typeof useQueryClient>
}) {
  const { t } = useTranslation(['admin', 'enums', 'forms'])
  const [role, setRole] = useState(user.role)
  const [supervisorId, setSupervisorId] = useState(user.supervisorId ?? '')

  const { data: accounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ['accounts', user.id],
    queryFn: () => api.get<{ accounts: SupervisorAccount[] }>(`/api/supervisors/${user.id}/accounts`).then((r) => r.accounts),
    enabled: showAccounts && (user.role === 'SUPERVISOR' || user.role === 'FINANCIAL_ADMIN'),
  })

  const addAccount = useMutation({
    mutationFn: (d: { accountNumber: string; label: string }) => api.post(`/api/supervisors/${user.id}/accounts`, d),
    onSuccess: () => { refetchAccounts(); qc.invalidateQueries({ queryKey: ['accounts', user.id] }) },
  })
  const deactivateAccount = useMutation({
    mutationFn: (accountId: string) => api.delete(`/api/supervisors/${user.id}/accounts/${accountId}`),
    onSuccess: () => refetchAccounts(),
  })

  const [newAccNum, setNewAccNum] = useState('')
  const [newAccLabel, setNewAccLabel] = useState('')

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">{user.firstName} {user.lastName}</td>
        <td className="px-4 py-3 text-gray-600">{user.email}</td>
        <td className="px-4 py-3">
          {editing ? (
            <select value={role} onChange={(e) => setRole(e.target.value as User['role'])} className="border border-gray-300 rounded px-2 py-1 text-sm">
              <option value="USER">{t('role.USER', { ns: 'enums' }) as string}</option>
              <option value="SUPERVISOR">{t('role.SUPERVISOR', { ns: 'enums' }) as string}</option>
              <option value="FINANCIAL_ADMIN">{t('role.FINANCIAL_ADMIN', { ns: 'enums' }) as string}</option>
            </select>
          ) : (t(`role.${user.role}`, { ns: 'enums' }) as string)}
        </td>
        <td className="px-4 py-3">
          {editing ? (
            <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
              <option value="">{t('noSupervisor')}</option>
              {supervisors.filter((s) => s.id !== user.id).map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          ) : (user.supervisor ? `${user.supervisor.firstName} ${user.supervisor.lastName}` : '—')}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" onClick={() => onSave({ role, supervisorId: supervisorId || null })} loading={saving}>{t('forms:save')}</Button>
                <Button size="sm" variant="ghost" onClick={onCancel}>{t('forms:cancel')}</Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={onEdit}>{t('forms:edit')}</Button>
            )}
            {(user.role === 'SUPERVISOR' || user.role === 'FINANCIAL_ADMIN') && (
              <Button size="sm" variant="ghost" onClick={onToggleAccounts}>{showAccounts ? t('hide') : t('accounts')}</Button>
            )}
          </div>
        </td>
      </tr>
      {showAccounts && (user.role === 'SUPERVISOR' || user.role === 'FINANCIAL_ADMIN') && (
        <tr>
          <td colSpan={5} className="bg-gray-50 px-8 py-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('accountsHeader', { name: `${user.firstName} ${user.lastName}` })}</p>
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1 px-3 bg-white border border-gray-100 rounded text-sm">
                  <span className={a.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}>{a.accountNumber} — {a.label}</span>
                  {a.isActive && <Button size="sm" variant="ghost" onClick={() => deactivateAccount.mutate(a.id)}>{t('deactivate')}</Button>}
                </div>
              ))}
              <div className="flex gap-2">
                <input placeholder={t('accountNumber') as string} value={newAccNum} onChange={(e) => setNewAccNum(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm w-32" />
                <input placeholder={t('accountLabel') as string} value={newAccLabel} onChange={(e) => setNewAccLabel(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm flex-1" />
                <Button size="sm" onClick={() => { if (newAccNum && newAccLabel) { addAccount.mutate({ accountNumber: newAccNum, label: newAccLabel }); setNewAccNum(''); setNewAccLabel('') } }} loading={addAccount.isPending}>{t('forms:add')}</Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
