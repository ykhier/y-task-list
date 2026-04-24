import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
        secondary: 'border-transparent bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
        success: 'border-transparent bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
        destructive: 'border-transparent bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
        outline: 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
