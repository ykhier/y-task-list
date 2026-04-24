'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Base
        'fixed z-50 bg-white dark:bg-slate-800 duration-300 overflow-y-auto',
        // Animations
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        // Mobile: full-width bottom sheet
        'inset-x-0 bottom-0 rounded-t-2xl border-t border-slate-200 dark:border-slate-700 px-5 pt-9 pb-safe-area-or-6 max-h-[88dvh]',
        'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
        // Desktop: centered modal (overrides mobile)
        'sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:right-auto sm:bottom-auto',
        'sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2',
        'sm:rounded-xl sm:border sm:border-slate-100 dark:sm:border-slate-700 sm:p-6 sm:max-h-[90dvh] sm:shadow-lg dark:sm:shadow-slate-950/50',
        'sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0',
        'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
        className
      )}
      {...props}
    >
      {/* Drag handle — mobile bottom sheet only */}
      <div className="pointer-events-none absolute top-3 inset-x-0 flex justify-center sm:hidden">
        <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>
      {children}
      <DialogPrimitive.Close className="absolute left-4 top-4 rounded-md p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-semibold text-slate-800 dark:text-slate-100', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-slate-500 dark:text-slate-400', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
