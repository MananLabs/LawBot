import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-blue-600 text-white shadow-md shadow-blue-900/30 hover:bg-blue-500 active:bg-blue-700',
        destructive:
          'bg-red-600/90 text-white shadow-md shadow-red-900/30 hover:bg-red-500 active:bg-red-700',
        outline:
          'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white active:bg-white/[0.07]',
        secondary:
          'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white active:bg-white/[0.07]',
        ghost:
          'text-white/60 hover:bg-white/8 hover:text-white active:bg-white/5',
        link: 'text-blue-400 underline-offset-4 hover:underline hover:text-blue-300',
        gradient:
          'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-blue-900/40 hover:from-blue-500 hover:to-violet-500 active:from-blue-700 active:to-violet-700',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-xl px-6 text-base',
        xl: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7 rounded-md',
        'icon-lg': 'h-11 w-11 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
