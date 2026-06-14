import { motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, Info, ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/types'

// =====================================================================
// RISK CONFIG
// =====================================================================
const riskConfig: Record<
  RiskLevel,
  {
    label: string
    icon: typeof AlertCircle
    bg: string
    text: string
    border: string
    dot: string
    glow: string
    pulse: boolean
  }
> = {
  critical: {
    label: 'Critical',
    icon: ShieldAlert,
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    glow: 'shadow-red-500/20',
    pulse: true,
  },
  high: {
    label: 'High Risk',
    icon: AlertCircle,
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
    glow: 'shadow-orange-500/20',
    pulse: false,
  },
  medium: {
    label: 'Medium',
    icon: AlertTriangle,
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    dot: 'bg-yellow-500',
    glow: 'shadow-yellow-500/20',
    pulse: false,
  },
  low: {
    label: 'Low Risk',
    icon: ShieldCheck,
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    border: 'border-green-500/30',
    dot: 'bg-green-500',
    glow: 'shadow-green-500/20',
    pulse: false,
  },
  info: {
    label: 'Info',
    icon: Info,
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    glow: 'shadow-blue-500/20',
    pulse: false,
  },
  none: {
    label: 'N/A',
    icon: Info,
    bg: 'bg-white/5',
    text: 'text-white/40',
    border: 'border-white/10',
    dot: 'bg-white/30',
    glow: '',
    pulse: false,
  },
}

// =====================================================================
// RISK BADGE COMPONENT
// =====================================================================
interface RiskBadgeProps {
  level: RiskLevel
  variant?: 'default' | 'dot' | 'pill' | 'large'
  showIcon?: boolean
  className?: string
  animate?: boolean
}

export default function RiskBadge({
  level,
  variant = 'default',
  showIcon = false,
  className,
  animate = false,
}: RiskBadgeProps) {
  const config = riskConfig[level]
  const Icon = config.icon

  if (variant === 'dot') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className="relative flex h-2 w-2">
          {config.pulse && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                config.dot,
              )}
            />
          )}
          <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
        </span>
        <span className={cn('text-sm font-medium', config.text)}>{config.label}</span>
      </div>
    )
  }

  if (variant === 'large') {
    return (
      <motion.div
        initial={animate ? { scale: 0.9, opacity: 0 } : undefined}
        animate={animate ? { scale: 1, opacity: 1 } : undefined}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl border',
          config.bg,
          config.border,
          'shadow-lg',
          config.glow,
          className,
        )}
      >
        <Icon className={cn('h-5 w-5', config.text)} />
        <span className={cn('text-sm font-bold uppercase tracking-wide', config.text)}>
          {config.label}
        </span>
        {config.pulse && (
          <span className="relative flex h-2 w-2 ml-1">
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                config.dot,
              )}
            />
            <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
          </span>
        )}
      </motion.div>
    )
  }

  if (variant === 'pill') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider',
          config.bg,
          config.text,
          className,
        )}
      >
        {showIcon && <Icon className="h-3 w-3" />}
        {config.label}
      </span>
    )
  }

  // Default variant
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
        config.bg,
        config.text,
        config.border,
        className,
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              config.dot,
            )}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', config.dot)} />
      </span>
      {config.label}
    </span>
  )
}

// =====================================================================
// RISK SCORE INDICATOR
// =====================================================================
export function RiskScoreIndicator({
  score,
  size = 'md',
}: {
  score: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const level: RiskLevel =
    score >= 75
      ? 'critical'
      : score >= 50
        ? 'high'
        : score >= 25
          ? 'medium'
          : 'low'

  const config = riskConfig[level]

  const sizeMap = {
    sm: 'text-lg',
    md: 'text-3xl',
    lg: 'text-5xl',
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={cn('font-black tabular-nums', config.text, sizeMap[size])}
      >
        {score}
      </motion.span>
      <RiskBadge level={level} variant="pill" />
    </div>
  )
}
