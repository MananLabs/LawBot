import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// =====================================================================
// SCORE GAUGE COMPONENT
// =====================================================================
interface ScoreGaugeProps {
  score: number // 0-100
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  label?: string
  className?: string
  animate?: boolean
}

function getScoreInfo(score: number) {
  if (score >= 85) return { label: 'Excellent', color: '#22C55E', gradient: ['#22C55E', '#16A34A'], glow: 'shadow-green-500/30' }
  if (score >= 70) return { label: 'Good', color: '#3B82F6', gradient: ['#3B82F6', '#2563EB'], glow: 'shadow-blue-500/30' }
  if (score >= 50) return { label: 'Needs Attention', color: '#EAB308', gradient: ['#EAB308', '#CA8A04'], glow: 'shadow-yellow-500/30' }
  if (score >= 30) return { label: 'At Risk', color: '#F97316', gradient: ['#F97316', '#EA580C'], glow: 'shadow-orange-500/30' }
  return { label: 'Critical', color: '#EF4444', gradient: ['#EF4444', '#DC2626'], glow: 'shadow-red-500/30' }
}

const sizeConfig = {
  sm: { svgSize: 100, r: 38, strokeWidth: 6, textSize: 'text-2xl', labelSize: 'text-[10px]' },
  md: { svgSize: 150, r: 58, strokeWidth: 8, textSize: 'text-4xl', labelSize: 'text-xs' },
  lg: { svgSize: 200, r: 80, strokeWidth: 10, textSize: 'text-5xl', labelSize: 'text-sm' },
  xl: { svgSize: 260, r: 105, strokeWidth: 12, textSize: 'text-6xl', labelSize: 'text-base' },
}

export default function ScoreGauge({
  score,
  size = 'lg',
  showLabel = true,
  label = 'Compliance Score',
  className,
  animate = true,
}: ScoreGaugeProps) {
  const info = getScoreInfo(score)
  const cfg = sizeConfig[size]
  const center = cfg.svgSize / 2

  // Arc calculations (3/4 circle, starting from bottom-left)
  const startAngle = 135 // degrees
  const endAngle = 405 // 135 + 270 degrees
  const totalAngle = 270

  const arcLength = (2 * Math.PI * cfg.r * totalAngle) / 360
  const fillLength = (score / 100) * arcLength

  // SVG arc path
  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: center + cfg.r * Math.cos(rad),
      y: center + cfg.r * Math.sin(rad),
    }
  }

  const describeArc = (startDeg: number, endDeg: number) => {
    const start = polarToCartesian(startDeg)
    const end = polarToCartesian(endDeg)
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${cfg.r} ${cfg.r} 0 ${large} 1 ${end.x} ${end.y}`
  }

  const bgPath = describeArc(startAngle, endAngle)
  const filledEndAngle = startAngle + (totalAngle * score) / 100

  const gradientId = `gauge-gradient-${size}`

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative">
        <svg
          width={cfg.svgSize}
          height={cfg.svgSize}
          viewBox={`0 0 ${cfg.svgSize} ${cfg.svgSize}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={info.gradient[0]} />
              <stop offset="100%" stopColor={info.gradient[1]} />
            </linearGradient>

            {/* Glow filter */}
            <filter id={`glow-${size}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Track */}
          <path
            d={bgPath}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="round"
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = startAngle + (totalAngle * tick) / 100
            const outer = polarToCartesian(angle)
            const innerR = cfg.r - cfg.strokeWidth / 2 - 4
            const cos = Math.cos(((angle - 90) * Math.PI) / 180)
            const sin = Math.sin(((angle - 90) * Math.PI) / 180)
            const inner = {
              x: center + innerR * cos,
              y: center + innerR * sin,
            }
            return (
              <line
                key={tick}
                x1={outer.x}
                y1={outer.y}
                x2={inner.x}
                y2={inner.y}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )
          })}

          {/* Progress Arc */}
          {score > 0 && (
            <motion.path
              d={describeArc(startAngle, Math.max(startAngle + 1, filledEndAngle))}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={cfg.strokeWidth}
              strokeLinecap="round"
              filter={`url(#glow-${size})`}
              initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
              animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
              transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
              style={{
                strokeDasharray: arcLength,
                strokeDashoffset: animate ? arcLength : arcLength - fillLength,
              }}
            />
          )}

          {/* Center Text */}
          <text
            x={center}
            y={center - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={info.color}
            fontSize={cfg.textSize === 'text-2xl' ? 24 : cfg.textSize === 'text-4xl' ? 36 : cfg.textSize === 'text-5xl' ? 48 : cfg.textSize === 'text-6xl' ? 56 : 56}
            fontWeight="900"
            fontFamily="system-ui"
          >
            {score}
          </text>
          <text
            x={center}
            y={center + (cfg.svgSize === 100 ? 12 : cfg.svgSize === 150 ? 18 : cfg.svgSize === 200 ? 24 : 30)}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={cfg.svgSize === 100 ? 9 : cfg.svgSize === 150 ? 11 : 13}
            fontFamily="system-ui"
          >
            out of 100
          </text>
        </svg>

        {/* Glow effect */}
        <div
          className={cn('absolute inset-0 rounded-full opacity-20 blur-3xl pointer-events-none')}
          style={{ background: info.color }}
        />
      </div>

      {/* Labels */}
      {showLabel && (
        <div className="text-center">
          <p
            className={cn('font-bold', cfg.labelSize === 'text-[10px]' ? 'text-xs' : cfg.labelSize)}
            style={{ color: info.color }}
          >
            {info.label}
          </p>
          {label && (
            <p className="text-xs text-white/35 mt-0.5">{label}</p>
          )}
        </div>
      )}
    </div>
  )
}

// =====================================================================
// MINI GAUGE (for dashboard cards)
// =====================================================================
export function MiniGauge({ score, className }: { score: number; className?: string }) {
  const info = getScoreInfo(score)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative h-8 w-8">
        <svg viewBox="0 0 32 32" className="h-full w-full -rotate-90">
          <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
          <motion.circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke={info.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 12}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 12 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 12 * (1 - score / 100) }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-bold" style={{ color: info.color }}>
          {score}%
        </p>
        <p className="text-[10px] text-white/30">{info.label}</p>
      </div>
    </div>
  )
}
