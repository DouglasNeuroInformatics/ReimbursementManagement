import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useUpdateProfile } from '../../../hooks/useProfile'
import { Card, CardHeader, CardBody } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'
import { Button } from '../../../components/ui/Button'
import { fmtDate } from '../../../utils/dates'

export const Route = createFileRoute('/_auth/profile/')({ component: ProfilePage })

function ProfilePage() {
  const { user } = useAuth()
  const update = useUpdateProfile()

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
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  if (!user) return null

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      <Card>
        <CardHeader><span className="font-semibold">Account</span></CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-gray-500">Name</dt>
            <dd className="font-medium">{user.firstName} {user.lastName}</dd>
            <dt className="text-gray-500">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-gray-500">Role</dt>
            <dd>{user.role.replace(/_/g, ' ')}</dd>
            <dt className="text-gray-500">Member since</dt>
            <dd>{fmtDate(user.createdAt)}</dd>
          </dl>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><span className="font-semibold">Contact &amp; Position</span></CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}
            {saved && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">Saved.</div>
            )}
            <Input
              label="Job Position"
              value={jobPosition}
              onChange={(e) => { setSaved(false); setJobPosition(e.target.value) }}
              placeholder="e.g. Senior Analyst"
            />
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => { setSaved(false); setPhone(e.target.value) }}
              placeholder="e.g. +1 613 555 0100"
            />
            <Input
              label="Work Extension"
              value={extension}
              onChange={(e) => { setSaved(false); setExtension(e.target.value) }}
              placeholder="e.g. 4201"
            />
            <Textarea
              label="Address"
              value={address}
              onChange={(e) => { setSaved(false); setAddress(e.target.value) }}
              placeholder="123 Main St&#10;Ottawa ON  K1A 0A9"
            />
            <Button type="submit" loading={update.isPending} disabled={update.isPending}>
              Save
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
