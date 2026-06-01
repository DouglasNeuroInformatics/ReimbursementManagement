import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../../hooks/useAuth'
import { useUpdateProfile } from '../../../hooks/useProfile'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { Button } from '../../../components/ui/Button'
import { fmtDate } from '../../../utils/dates'
import { translateApiError } from '../../../lib/translateApiError'

export const Route = createFileRoute('/_auth/profile/')({ component: ProfilePage })

function ProfilePage() {
  const { user } = useAuth()
  const update = useUpdateProfile()
  const { t } = useTranslation(['profile', 'enums', 'forms'])

  const [jobPosition, setJobPosition] = useState('')
  const [phone, setPhone] = useState('')
  const [extension, setExtension] = useState('')
  const [address, setAddress] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setJobPosition(user.jobPosition ?? '')
      setPhone(user.phone ?? '')
      setExtension(user.extension ?? '')
      setAddress(user.address ?? '')
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    try {
      await update.mutateAsync({
        jobPosition: jobPosition.trim() || null,
        phone: phone.trim() || null,
        extension: extension.trim() || null,
        address: address.trim() || null,
      })
      setSaved(true)
    } catch (err: unknown) {
      setError(translateApiError(err) || (t('forms:saveFailed') as string))
    }
  }

  if (!user) return null

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

      <Card>
        <CardHeader><span className="font-semibold">{t('account')}</span></CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-gray-500">{t('name')}</dt>
            <dd className="font-medium">{user.firstName} {user.lastName}</dd>
            <dt className="text-gray-500">{t('email')}</dt>
            <dd>{user.email}</dd>
            <dt className="text-gray-500">{t('role')}</dt>
            <dd>{t(`role.${user.role}`, { ns: 'enums' }) as string}</dd>
            <dt className="text-gray-500">{t('memberSince')}</dt>
            <dd>{fmtDate(user.createdAt)}</dd>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="font-semibold">{t('contactSection')}</span></CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}
            {saved && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{t('forms:saved')}</div>
            )}
            <Input
              label={t('fields.jobPosition') as string}
              value={jobPosition}
              onChange={(e) => { setSaved(false); setJobPosition(e.target.value) }}
              placeholder={t('fields.jobPositionPlaceholder') as string}
            />
            <Input
              label={t('fields.phone') as string}
              type="tel"
              value={phone}
              onChange={(e) => { setSaved(false); setPhone(e.target.value) }}
              placeholder={t('fields.phonePlaceholder') as string}
            />
            <Input
              label={t('fields.extension') as string}
              value={extension}
              onChange={(e) => { setSaved(false); setExtension(e.target.value) }}
              placeholder={t('fields.extensionPlaceholder') as string}
            />
            <Textarea
              label={t('fields.address') as string}
              value={address}
              onChange={(e) => { setSaved(false); setAddress(e.target.value) }}
              placeholder={t('fields.addressPlaceholder') as string}
            />
            <Button type="submit" loading={update.isPending} disabled={update.isPending}>
              {t('forms:save')}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
