'use client'

import { useState } from 'react'
import { Trash2, KeyRound, Pencil, Search, Users, UserCheck, UserPlus, X, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/* ─── Mock data ─── */
interface MockUser {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'user'
  joined: string
  avatar_color: string
}

const MOCK_USERS: MockUser[] = [
  { id: '1', full_name: 'ישראל ישראלי',   email: 'israel@example.com',  role: 'admin', joined: '2025-11-01', avatar_color: 'bg-blue-500' },
  { id: '2', full_name: 'שרה כהן',         email: 'sara@example.com',    role: 'user',  joined: '2025-12-14', avatar_color: 'bg-violet-500' },
  { id: '3', full_name: 'דוד לוי',          email: 'david@example.com',   role: 'user',  joined: '2026-01-03', avatar_color: 'bg-emerald-500' },
  { id: '4', full_name: 'מיכל אברהם',      email: 'michal@example.com',  role: 'user',  joined: '2026-01-29', avatar_color: 'bg-orange-500' },
  { id: '5', full_name: 'יוסי מזרחי',      email: 'yossi@example.com',   role: 'user',  joined: '2026-02-18', avatar_color: 'bg-rose-500' },
  { id: '6', full_name: 'רחל גולדברג',    email: 'rachel@example.com',  role: 'user',  joined: '2026-03-10', avatar_color: 'bg-teal-500' },
]

function formatDate(d: string) {
  return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('')
}

/* ─── Stat card ─── */
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white border border-slate-100 shadow-sm px-5 py-4">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

/* ─── Edit name modal ─── */
function EditNameModal({ user, onClose, onSave }: { user: MockUser | null; onClose: () => void; onSave: (id: string, name: string) => void }) {
  const [name, setName] = useState(user?.full_name ?? '')
  if (!user) return null
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>שינוי שם משתמש</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSave(user.id, name); onClose() }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>שם מלא</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
            <Button type="submit">שמור</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Change password modal ─── */
function ChangePasswordModal({ user, onClose }: { user: MockUser | null; onClose: () => void }) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [saved, setSaved]         = useState(false)
  if (!user) return null
  const match = password && confirm && password === confirm
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1000)
  }
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>שינוי סיסמא — {user.full_name}</DialogTitle>
        </DialogHeader>
        {saved ? (
          <div className="flex flex-col items-center gap-2 py-4 text-green-600">
            <UserCheck className="h-8 w-8" />
            <p className="text-sm font-medium">הסיסמא עודכנה בהצלחה</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>סיסמא חדשה</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" placeholder="••••••••" className="text-left" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>אימות סיסמא</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                dir="ltr"
                placeholder="••••••••"
                className={confirm && !match ? 'border-red-300' : match ? 'border-green-300' : ''}
              />
              {confirm && !match && <p className="text-xs text-red-500">הסיסמאות לא תואמות</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
              <Button type="submit" disabled={!!confirm && !match}>עדכן סיסמא</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ─── Delete confirmation ─── */
function DeleteConfirmModal({ user, onClose, onConfirm }: { user: MockUser | null; onClose: () => void; onConfirm: (id: string) => void }) {
  if (!user) return null
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-red-600">מחיקת משתמש</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            האם אתה בטוח שברצונך למחוק את <span className="font-semibold text-slate-800">{user.full_name}</span>?
            <br />
            <span className="text-red-500">פעולה זו אינה הפיכה.</span>
          </p>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => { onConfirm(user.id); onClose() }}
            >
              מחק משתמש
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Main AdminPanel ─── */
export default function AdminPanel() {
  const [users, setUsers]         = useState<MockUser[]>(MOCK_USERS)
  const [search, setSearch]       = useState('')
  const [editUser, setEditUser]   = useState<MockUser | null>(null)
  const [pwUser, setPwUser]       = useState<MockUser | null>(null)
  const [delUser, setDelUser]     = useState<MockUser | null>(null)

  const filtered = users.filter((u) =>
    u.full_name.includes(search) || u.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleSaveName = (id: string, name: string) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, full_name: name } : u))
  }

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const thisWeek = users.filter((u) => {
    const d = new Date(u.joined)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }).length

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-bold text-slate-800">ניהול משתמשים</h2>
        </div>
        <p className="text-sm text-slate-500">ניהול חשבונות משתמשים במערכת</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={Users}    label="סה״כ משתמשים"    value={users.length} color="bg-blue-500" />
          <StatCard icon={UserPlus} label="חדשים השבוע"      value={thisWeek}     color="bg-emerald-500" />
          <StatCard icon={UserCheck} label="משתמשים פעילים" value={users.length - 1} color="bg-violet-500" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 end-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="חיפוש לפי שם או אימייל..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pe-9 bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute top-1/2 -translate-y-1/2 start-3 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-right px-4 py-3 font-semibold text-slate-600">משתמש</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">הצטרף</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">תפקיד</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                    לא נמצאו משתמשים
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${user.avatar_color}`}>
                          {initials(user.full_name)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{user.full_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Join date */}
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                      {formatDate(user.joined)}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-0.5">
                          <Shield className="h-3 w-3" />
                          אדמין
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5">
                          משתמש
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditUser(user)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="שנה שם"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setPwUser(user)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors cursor-pointer"
                          title="שנה סיסמא"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => setDelUser(user)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="מחק משתמש"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50">
            <p className="text-xs text-slate-400">{filtered.length} מתוך {users.length} משתמשים</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditNameModal      user={editUser} onClose={() => setEditUser(null)} onSave={handleSaveName} />
      <ChangePasswordModal user={pwUser}   onClose={() => setPwUser(null)} />
      <DeleteConfirmModal  user={delUser}  onClose={() => setDelUser(null)} onConfirm={handleDelete} />
    </div>
  )
}
