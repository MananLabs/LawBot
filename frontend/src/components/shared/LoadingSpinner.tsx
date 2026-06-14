import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// =====================================================================
// LOADING SPINNER COMPONENT
// =====================================================================
interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  label?: string
  color?: 'blue' | 'cyan' | 'purple' | 'white'
}

const sizeMap = {
  xs: { container: 'h-4 w-4', border: 'border', label: 'text-xs' },
  sm: { container: 'h-6 w-6', border: 'border', label: 'text-xs' },
  md: { container: 'h-10 w-10', border: 'border-2', label: 'text-sm' },
  lg: { container: 'h-14 w-14', border: 'border-2', label: 'text-base' },
  xl: { container: 'h-20 w-20', border: 'border-[3px]', label: 'text-lg' },
}

const colorMap = {
  blue: {
    ring: 'border-blue-500/20',
    spinner: 'border-t-blue-500',
    glow: 'shadow-blue-500/30',
    text: 'text-blue-400',
  },
  cyan: {
    ring: 'border-cyan-500/20',
    spinner: 'border-t-cyan-500',
    glow: 'shadow-cyan-500/30',
    text: 'text-cyan-400',
  },
  purple: {
    ring: 'border-purple-500/20',
    spinner: 'border-t-purple-500',
    glow: 'shadow-purple-500/30',
    text: 'text-purple-400',
  },
  white: {
    ring: 'border-white/10',
    spinner: 'border-t-white/70',
    glow: 'shadow-white/10',
    text: 'text-white/60',
  },
}

export default function LoadingSpinner({
  size = 'md',
  className,
  label,
  color = 'blue',
}: LoadingSpinnerProps) {
  const s = sizeMap[size]
  const c = colorMap[color]

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative">
        {/* Outer glow pulse */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'absolute inset-0 rounded-full',
            c.glow,
            size === 'xl' || size === 'lg' ? 'shadow-xl' : 'shadow-lg',
          )}
        />

        {/* Ring */}
        <div
          className={cn(
            s.container,
            'rounded-full',
            s.border,
            c.ring,
          )}
        />

        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          className={cn(
            'absolute inset-0 rounded-full',
            s.border,
            'border-transparent',
            c.spinner,
          )}
        />

        {/* Inner pulse for larger sizes */}
        {(size === 'lg' || size === 'xl') && (
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            className={cn(
              'absolute rounded-full border border-transparent',
              color === 'blue'
                ? 'border-t-blue-400/40'
                : color === 'cyan'
                  ? 'border-t-cyan-400/40'
                  : color === 'purple'
                    ? 'border-t-purple-400/40'
                    : 'border-t-white/30',
              size === 'xl' ? 'inset-2' : 'inset-1',
            )}
          />
        )}
      </div>

      {label && (
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(s.label, c.text, 'font-medium tracking-wide')}
        >
          {label}
        </motion.p>
      )}
    </div>
  )
}

// =====================================================================
// PAGE LOADING OVERLAY
// =====================================================================
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0F]"
    >
      <div className="flex flex-col items-center gap-6">
        <LoadingSpinner size="xl" color="blue" />
        <div className="text-center">
          <p className="text-white/60 font-medium">{message}</p>
          <p className="text-white/25 text-sm mt-1">Please wait...</p>
        </div>
      </div>
    </motion.div>
  )
}

// =====================================================================
// INLINE LOADING
// =====================================================================
export function InlineLoader({ text = 'Loading' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/40">
      <LoadingSpinner size="xs" color="white" />
      <span>{text}</span>
    </div>
  )
}

// =====================================================================
// SKELETON LOADER
// =====================================================================
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={cn('rounded-lg bg-white/5', className)}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/3 border border-white/8 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-1/3" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonBlock className="h-3 w-full" />
      <SkeletonBlock className="h-3 w-4/5" />
      <SkeletonBlock className="h-3 w-3/5" />
    </div>
  )
}
