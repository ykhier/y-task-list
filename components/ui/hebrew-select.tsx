'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const HebrewSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectTrigger>,
  React.ComponentPropsWithoutRef<typeof SelectTrigger>
>(({ className, children, ...props }, ref) => (
  <SelectTrigger
    ref={ref}
    dir="rtl"
    className={cn(
      'relative text-right pl-9 [&>span]:w-full [&>span]:text-right [&>svg]:absolute [&>svg]:left-3 [&>svg]:right-auto',
      className
    )}
    {...props}
  >
    {children}
  </SelectTrigger>
))
HebrewSelectTrigger.displayName = 'HebrewSelectTrigger'

const HebrewSelectValue = React.forwardRef<
  React.ElementRef<typeof SelectValue>,
  React.ComponentPropsWithoutRef<typeof SelectValue>
>((props, ref) => <SelectValue ref={ref} {...props} />)
HebrewSelectValue.displayName = 'HebrewSelectValue'

const HebrewSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectContent>,
  React.ComponentPropsWithoutRef<typeof SelectContent>
>(({ className, children, ...props }, ref) => (
  <SelectContent
    ref={ref}
    dir="rtl"
    className={cn('text-right', className)}
    {...props}
  >
    {children}
  </SelectContent>
))
HebrewSelectContent.displayName = 'HebrewSelectContent'

const HebrewSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectItem>,
  React.ComponentPropsWithoutRef<typeof SelectItem>
>(({ className, children, ...props }, ref) => (
  <SelectItem
    ref={ref}
    className={cn('justify-end pr-8 pl-2 text-right', className)}
    {...props}
  >
    {children}
  </SelectItem>
))
HebrewSelectItem.displayName = 'HebrewSelectItem'

export {
  HebrewSelectTrigger,
  HebrewSelectValue,
  HebrewSelectContent,
  HebrewSelectItem,
}
