import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { translateApiError } from '../lib/translateApiError'
import { useState } from 'react'
import { LocaleSwitcher } from '../components/layout/LocaleSwitcher'

export const Route = createFileRoute('/register')({ component: RegisterPage })

function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useTranslation(['auth', 'common'])
  const [serverError, setServerError] = useState('')

  const form = useForm({
    defaultValues: { email: '', password: '', firstName: '', lastName: '' },
    onSubmit: async ({ value }) => {
      setServerError('')
      try {
        await api.post('/api/auth/register', value)
        navigate({ to: '/login' })
      } catch (err) {
        setServerError(translateApiError(err) || t('register.errorGeneric'))
      }
    },
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 relative">
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('register.title')}</h1>
        <p className="text-gray-500 text-sm mb-6">{t('appName', { ns: 'common' })}</p>

        {serverError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <form.Field name="firstName">
              {(field) => (
                <div>
                  <label htmlFor="reg-firstName" className="block text-sm font-medium text-gray-700 mb-1">{t('fields.firstName')}</label>
                  <input
                    id="reg-firstName"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="lastName">
              {(field) => (
                <div>
                  <label htmlFor="reg-lastName" className="block text-sm font-medium text-gray-700 mb-1">{t('fields.lastName')}</label>
                  <input
                    id="reg-lastName"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Field name="email">
            {(field) => (
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">{t('fields.email')}</label>
                <input
                  id="reg-email"
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">{t('fields.password')}</label>
                <input
                  id="reg-password"
                  type="password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('fields.passwordHint')}
                  required
                  minLength={8}
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
                {isSubmitting ? t('register.submitting') : t('register.submit')}
              </button>
            )}
          </form.Subscribe>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('register.haveAccount')}{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">{t('register.signInLink')}</Link>
        </p>
      </div>
    </div>
  )
}
