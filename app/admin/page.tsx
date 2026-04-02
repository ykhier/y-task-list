'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Shield, ShieldOff, Trash2, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  is_admin: boolean
  created_at: string
}

export default function AdminPage() {
  const [users, setUsers]     = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const router = useRouter()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (!res.ok) { setError('שגיאה בטעינת המשתמשים'); setLoading(false); return }
    setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const toggleAdmin = async (id: string, current: boolean) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_admin: !current } : u))
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_admin: !current }),
    })
    if (!res.ok) fetchUsers()
  }

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`למחוק את ${name || 'המשתמש'}? פעולה זו אינה ניתנת לביטול.`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } else {
      const data = await res.json()
      alert(data.error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 p-4 sm:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
            title="חזרה לאפליקציה"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-md shadow-blue-200">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">ניהול משתמשים</h1>
            <p className="text-sm text-slate-500">{users.length} משתמשים רשומים</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center text-slate-400">
            אין משתמשים
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3">שם</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3">אימייל</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">הצטרף</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-4 py-3">סטטוס</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {user.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600" dir="ltr">
                      {user.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden sm:table-cell">
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
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => toggleAdmin(user.id, user.is_admin)}
                          title={user.is_admin ? 'הסר הרשאת מנהל' : 'הגדר כמנהל'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          {user.is_admin
                            ? <ShieldOff className="h-4 w-4" />
                            : <Shield className="h-4 w-4" />
                          }
                        </button>
                        <button
                          onClick={() => deleteUser(user.id, user.full_name || '')}
                          title="מחק משתמש"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
