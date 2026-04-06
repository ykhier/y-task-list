import Spinner from '@/components/ui/Spinner'

export default function AdminLoading() {
  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50"
      dir="rtl"
    >
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
        <div className="rounded-3xl border border-white/80 bg-white/85 px-8 py-7 shadow-xl shadow-slate-200/70 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Spinner className="h-6 w-6" />
            </div>
            <div className="text-right">
              <p className="text-base font-semibold text-slate-800">
                טוען את דף הניהול
              </p>
              <p className="text-sm text-slate-500">
                מביא את המשתמשים וההרשאות שלך
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
