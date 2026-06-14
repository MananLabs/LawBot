import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'

// =====================================================================
// ANIMATED COUNTER
// =====================================================================
function useCounter(target: number, duration: number, started: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!started) return
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [started, target, duration])

  return count
}

// =====================================================================
// STATS DATA
// =====================================================================
const stats = [
  {
    value: 10000,
    suffix: '+',
    label: 'Active Users',
    description: 'Founders, lawyers & compliance teams',
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    value: 50000,
    suffix: '+',
    label: 'Contracts Analyzed',
    description: 'Documents reviewed with AI precision',
    gradient: 'from-cyan-500 to-cyan-600',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    value: 99.9,
    suffix: '%',
    label: 'Accuracy Rate',
    description: 'Validated against Indian statutes',
    gradient: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    isDecimal: true,
  },
  {
    value: 500,
    suffix: '+',
    label: 'Legal Templates',
    description: 'Ready-to-use document library',
    gradient: 'from-green-500 to-green-600',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
]

// =====================================================================
// STAT CARD
// =====================================================================
function StatCard({
  stat,
  index,
  started,
}: {
  stat: (typeof stats)[0]
  index: number
  started: boolean
}) {
  const value = stat.isDecimal ? 99.9 : stat.value
  const count = useCounter(stat.isDecimal ? 999 : stat.value, 1800, started)
  const displayValue = stat.isDecimal
    ? started
      ? count === 999
        ? '99.9'
        : (count / 10).toFixed(1)
      : '0.0'
    : count.toLocaleString('en-IN')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={started ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] }}
      className={`relative p-8 rounded-2xl ${stat.bg} border ${stat.border} backdrop-blur-sm text-center group hover:scale-105 transition-transform duration-300`}
    >
      {/* Glowing number */}
      <div className="mb-2">
        <span
          className={`text-5xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent tabular-nums`}
        >
          {displayValue}
        </span>
        <span
          className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
        >
          {stat.suffix}
        </span>
      </div>

      <h3 className="text-base font-semibold text-white/90 mb-1">{stat.label}</h3>
      <p className="text-sm text-white/40">{stat.description}</p>

      {/* Background glow */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
      />
    </motion.div>
  )
}

// =====================================================================
// STATS SECTION
// =====================================================================
export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-20 relative overflow-hidden">
      {/* Glassmorphism background band */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-950/20 via-purple-950/15 to-cyan-950/20" />
      <div className="absolute inset-0 backdrop-blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Trusted by India's best legal & tech teams
          </h2>
          <p className="text-white/40 text-lg">
            Numbers that reflect our commitment to legal excellence
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} index={index} started={isInView} />
          ))}
        </div>
      </div>
    </section>
  )
}
