'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Trash2, Users } from 'lucide-react'
import Spinner from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/badge'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  is_admin: boolean
  created_at: string
}

interface AdminUsersClientProps {
  initialUsers: Profile[]
  initialError: string | null
}

export default function AdminUsersClient({
  initialUsers,
  initialError,
}: AdminUsersClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [error, setError] = useState<string | null>(initialError)
  const [busyId, setBusyId] = useState<string | null>(null)
  const router = useRouter()

  const deleteUser = async (id: string, name: string) => {
    const label = name || 'המשתמש'
    if (!window.confirm(`למחוק את ${label}? פעולה זו אינה ניתנת לביטול.`)) {
      return
    }

    const previousUsers = users
    setBusyId(id)
    setError(null)
    setUsers((prev) => prev.filter((user) => user.id !== id))

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(data?.error ?? 'לא הצלחנו למחוק את המשתמש')
      }
    } catch (nextError) {
      setUsers(previousUsers)
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'לא הצלחנו למחוק את המשתמש'
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4 sm:p-8"
      dir="rtl"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
            title="חזרה לאפליקציה"
          >
            <ArrowRight className="h-5 w-5" />
          </button>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-md shadow-blue-200">
            <Users className="h-5 w-5 text-white" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-slate-800">ניהול משתמשים</h1>
            <p className="text-sm text-slate-500">
              {users.length} משתמשים רשומים
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        {users.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-slate-400 shadow-sm">
            אין משתמשים
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    שם
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    אימייל
                  </th>
                  <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500 sm:table-cell">
                    הצטרף
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    סטטוס
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {users.map((user) => {
                  const isBusy = busyId === user.id

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {user.full_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600" dir="ltr">
                        {user.email || '—'}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-500 sm:table-cell">
                        {new Date(user.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={user.is_admin ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.is_admin ? 'מנהל' : 'משתמש'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => deleteUser(user.id, user.full_name || '')}
                            disabled={isBusy}
                            title="מחק משתמש"
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Spinner className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
