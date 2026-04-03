'use client'

import { Check } from 'lucide-react'

export default function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8 תווים', ok: password.length >= 8 },
    { label: 'אות גדולה', ok: /[A-Z]/.test(password) },
    { label: 'מספר', ok: /\d/.test(password) },
  ]
  if (!password) return null
  const passed = checks.filter((c) => c.ok).length
  const barColor = passed === 1 ? 'bg-red-400' : passed === 2 ? 'bg-amber-400' : 'bg-green-500'

  return (
    <div className="mt-2 flex flex-col gap-2">
      {/* strength bar */}
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < passed ? barColor : 'bg-slate-100'}`}
          />
        ))}
      </div>
      {/* requirement pills */}
      <div className="flex gap-1.5 flex-wrap">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-200 ${
              c.ok
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-slate-50 text-slate-400 border border-slate-200'
            }`}
          >
            <Check className={`h-2.5 w-2.5 transition-opacity ${c.ok ? 'opacity-100' : 'opacity-0'}`} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}
