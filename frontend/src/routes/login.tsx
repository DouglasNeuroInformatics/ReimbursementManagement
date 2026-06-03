import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { translateApiError } from '../lib/translateApiError'
import type { User } from '../types'
import { useState } from 'react'
import { LocaleSwitcher } from '../components/layout/LocaleSwitcher'
import { useConfig } from '../hooks/useConfig'

export const Route = createFileRoute('/login')({ component: LoginPage })

// Seeded demo accounts (see backend/prisma/seed.ts). All share one password.
// Only rendered when the backend reports demo mode is on.
const DEMO_PASSWORD = 'Test1234!'
const DEMO_ACCOUNTS = [
  { email: 'admin@test.com', role: 'FINANCIAL_ADMIN' },
  { email: 'admin2@test.com', role: 'FINANCIAL_ADMIN' },
  { email: 'admin3@test.com', role: 'FINANCIAL_ADMIN' },
  { email: 'supervisor@test.com', role: 'SUPERVISOR' },
  { email: 'user@test.com', role: 'USER' },
] as const

function LoginPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation(['auth', 'common', 'enums'])
  const { data: config } = useConfig()
  const [serverError, setServerError] = useState('')

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setServerError('')
      try {
        const res = await api.post<{ user: User }>('/api/auth/login', value)
        qc.setQueryData(['auth', 'me'], res.user)
        navigate({ to: '/dashboard' })
      } catch (err) {
        setServerError(translateApiError(err) || t('signIn.errorGeneric'))
      }
    },
  })

  // Fill the form with a demo account's credentials and sign in immediately.
  const loginAs = (email: string) => {
    form.setFieldValue('email', email)
    form.setFieldValue('password', DEMO_PASSWORD)
    form.handleSubmit()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 relative">
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>
      <div className="max-w-md w-full space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('signIn.title')}</h1>
        <p className="text-gray-500 text-sm mb-6">{t('appName', { ns: 'common' })}</p>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {serverError}
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
          className="space-y-4"
        >
          <form.Field name="email">
            {(field) => (
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">{t('fields.email')}</label>
                <input
                  id="login-email"
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  required
                />
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">{t('fields.password')}</label>
                <input
                  id="login-password"
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? t('signIn.submitting') : t('signIn.submit')}
              </button>
            )}
          </form.Subscribe>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('signIn.noAccount')}{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">{t('signIn.registerLink')}</Link>
        </p>
      </div>

      {config?.demoMode && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
          <h2 className="text-sm font-semibold text-amber-900">{t('demoAccounts.title')}</h2>
          <p className="text-xs text-gray-500 mb-3">{t('demoAccounts.hint')}</p>
          <ul className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li
                key={account.email}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-gray-900 truncate">{account.email}</p>
                  <p className="text-xs text-gray-500">{t(`role.${account.role}`, { ns: 'enums' })}</p>
                </div>
                <button
                  type="button"
                  onClick={() => loginAs(account.email)}
                  className="shrink-0 bg-amber-500 text-white py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
                >
                  {t('demoAccounts.signIn')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </div>
  )
}
