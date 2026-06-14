import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// =====================================================================
// CONFIDENCE BAR COMPONENT
// =====================================================================
interface ConfidenceBarProps {
  value: number // 0-100
  label?: string
  showLabel?: boolean
  showPercentage?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'gradient' | 'segmented'
  className?: string
  animate?: boolean
  delay?: number
}

function getConfidenceColor(value: number) {
  if (value >= 85) return { bar: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/30' }
  if (value >= 65) return { bar: 'bg-blue-500', text: 'text-blue-400', glow: 'shadow-blue-500/30' }
  if (value >= 40) return { bar: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/30' }
  return { bar: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/30' }
}

function getConfidenceLabel(value: number) {
  if (value >= 90) return 'Very High'
  if (value >= 75) return 'High'
  if (value >= 55) return 'Moderate'
  if (value >= 35) return 'Low'
  return 'Very Low'
}

const sizeMap = {
  sm: { bar: 'h-1', text: 'text-xs' },
  md: { bar: 'h-1.5', text: 'text-xs' },
  lg: { bar: 'h-2.5', text: 'text-sm' },
}

export default function ConfidenceBar({
  value,
  label,
  showLabel = true,
  showPercentage = true,
  size = 'md',
  variant = 'gradient',
  className,
  animate = true,
  delay = 0,
}: ConfidenceBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value))
  const colors = getConfidenceColor(clampedValue)
  const s = sizeMap[size]
  const confidenceLabel = getConfidenceLabel(clampedValue)

  if (variant === 'segmented') {
    const segments = 10
    const filledSegments = Math.round((clampedValue / 100) * segments)

    return (
      <div className={cn('space-y-1.5', className)}>
        {(showLabel || showPercentage) && (
          <div className="flex items-center justify-between">
            {showLabel && (
              <span className={cn(s.text, 'text-white/50 font-medium')}>
                {label ?? 'Confidence'}
              </span>
            )}
            {showPercentage && (
              <span className={cn(s.text, colors.text, 'font-bold')}>
                {clampedValue}%
              </span>
            )}
          </div>
        )}
        <div className="flex gap-0.5">
          {[...Array(segments)].map((_, i) => (
            <motion.div
              key={i}
              initial={animate ? { opacity: 0, scaleY: 0 } : undefined}
              animate={animate ? { opacity: 1, scaleY: 1 } : undefined}
              transition={{ delay: delay + i * 0.04, duration: 0.2 }}
              className={cn(
                'flex-1 rounded-sm',
                size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-3',
                i < filledSegments ? colors.bar : 'bg-white/8',
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {(showLabel || showPercentage) && (
        <div className="flex items-center justify-between">
          {showLabel && (
            <span className={cn(s.text, 'text-white/50 font-medium')}>
              {label ?? `Confidence · ${confidenceLabel}`}
            </span>
          )}
          {showPercentage && (
            <span className={cn(s.text, colors.text, 'font-bold tabular-nums')}>
              {clampedValue}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div className={cn(s.bar, 'w-full rounded-full bg-white/8 overflow-hidden')}>
        {/* Fill */}
        <motion.div
          initial={animate ? { width: 0 } : undefined}
          animate={animate ? { width: `${clampedValue}%` } : undefined}
          transition={{
            delay,
            duration: 1,
            ease: [0.4, 0, 0.2, 1],
          }}
          className={cn(
            s.bar,
            'rounded-full relative',
            variant === 'gradient'
              ? 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-400'
              : colors.bar,
            `shadow-sm ${colors.glow}`,
          )}
        >
          {/* Shimmer */}
          <motion.div
            animate={{ x: ['−100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: delay + 1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          />
        </motion.div>
      </div>
    </div>
  )
}

// =====================================================================
// MULTI-METRIC CONFIDENCE DISPLAY
// =====================================================================
interface MetricConfidence {
  label: string
  value: number
}

export function ConfidenceMetrics({ metrics }: { metrics: MetricConfidence[] }) {
  return (
    <div className="space-y-3">
      {metrics.map((metric, i) => (
        <ConfidenceBar
          key={metric.label}
          value={metric.value}
          label={metric.label}
          size="sm"
          variant="gradient"
          animate
          delay={i * 0.1}
        />
      ))}
    </div>
  )
}
