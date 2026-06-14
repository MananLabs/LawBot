import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-600/20 text-blue-400',
        secondary: 'border-transparent bg-white/10 text-white/60',
        destructive: 'border-transparent bg-red-600/20 text-red-400',
        success: 'border-transparent bg-emerald-600/20 text-emerald-400',
        warning: 'border-transparent bg-amber-600/20 text-amber-400',
        outline: 'border-white/20 text-white/70',
        ghost: 'border-transparent bg-white/5 text-white/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
