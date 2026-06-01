import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { translateApiError } from '../lib/translateApiError'
import type { User } from '../types'
import { useState } from 'react'
import { LocaleSwitcher } from '../components/layout/LocaleSwitcher'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { t } = useTranslation(['auth', 'common'])
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 relative">
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
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
    </div>
  )
}
