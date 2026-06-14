import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// =====================================================================
// RISK MATRIX DATA
// =====================================================================
interface RiskCell {
  category: string
  likelihood: number // 1-5
  impact: number // 1-5
  score: number // computed
  label: string
}

interface RiskMatrixProps {
  data?: RiskCell[]
  className?: string
}

// =====================================================================
// DEFAULT RISK DATA
// =====================================================================
const defaultRiskData: RiskCell[] = [
  { category: 'IP & Ownership', likelihood: 3, impact: 5, score: 75, label: 'HIGH' },
  { category: 'Liability Cap', likelihood: 4, impact: 4, score: 80, label: 'CRITICAL' },
  { category: 'Termination', likelihood: 2, impact: 3, score: 30, label: 'LOW' },
  { category: 'Confidentiality', likelihood: 1, impact: 5, score: 25, label: 'MEDIUM' },
  { category: 'Payment Terms', likelihood: 3, impact: 3, score: 45, label: 'MEDIUM' },
  { category: 'Indemnity', likelihood: 2, impact: 5, score: 50, label: 'HIGH' },
  { category: 'Governing Law', likelihood: 1, impact: 2, score: 10, label: 'LOW' },
  { category: 'Force Majeure', likelihood: 2, impact: 3, score: 30, label: 'LOW' },
]

// =====================================================================
// CELL COLOR
// =====================================================================
function getCellColor(likelihood: number, impact: number) {
  const score = likelihood * impact
  if (score >= 16) return { bg: 'bg-red-500/80', text: 'text-white', border: 'border-red-400/50' }
  if (score >= 9) return { bg: 'bg-orange-500/70', text: 'text-white', border: 'border-orange-400/50' }
  if (score >= 4) return { bg: 'bg-yellow-500/60', text: 'text-white', border: 'border-yellow-400/50' }
  return { bg: 'bg-green-500/60', text: 'text-white', border: 'border-green-400/50' }
}

// =====================================================================
// RISK HEATMAP (5x5 grid)
// =====================================================================
function RiskHeatmap({ data }: { data: RiskCell[] }) {
  const LIKELIHOOD_LABELS = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain']
  const IMPACT_LABELS = ['Negligible', 'Minor', 'Moderate', 'Major', 'Catastrophic']

  // Build a 5x5 grid (likelihood 1-5, impact 1-5)
  const grid: (RiskCell | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null))

  data.forEach((cell) => {
    const l = cell.likelihood - 1
    const i = cell.impact - 1
    if (l >= 0 && l < 5 && i >= 0 && i < 5) {
      grid[4 - l][i] = cell // Invert likelihood for display (high at top)
    }
  })

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[480px]">
        {/* Column Headers (Impact) */}
        <div className="flex gap-1 ml-24 mb-1">
          {IMPACT_LABELS.map((label, i) => (
            <div
              key={label}
              className="flex-1 text-center text-[9px] text-white/30 font-medium uppercase tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex">
          {/* Row Headers (Likelihood) */}
          <div className="flex flex-col gap-1 w-24 shrink-0">
            {LIKELIHOOD_LABELS.slice().reverse().map((label) => (
              <div
                key={label}
                className="h-12 flex items-center justify-end pr-2 text-[9px] text-white/30 font-medium uppercase tracking-wide text-right"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="flex-1 space-y-1">
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="flex gap-1">
                {row.map((cell, colIdx) => {
                  const likelihood = 5 - rowIdx
                  const impact = colIdx + 1
                  const colors = getCellColor(likelihood, impact)

                  return (
                    <motion.div
                      key={colIdx}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: (rowIdx * 5 + colIdx) * 0.02 }}
                      className={cn(
                        'flex-1 h-12 rounded-lg border flex flex-col items-center justify-center gap-0.5 relative overflow-hidden transition-all',
                        colors.bg,
                        colors.border,
                        cell ? 'cursor-pointer hover:scale-105' : 'opacity-20',
                      )}
                      title={cell ? `${cell.category}: ${cell.label}` : undefined}
                    >
                      {cell && (
                        <>
                          <span className={cn('text-[8px] font-bold uppercase leading-none', colors.text)}>
                            {cell.label}
                          </span>
                          <span className={cn('text-[7px] leading-none opacity-80 px-1 text-center', colors.text)}>
                            {cell.category.length > 10 ? cell.category.slice(0, 10) + '…' : cell.category}
                          </span>
                        </>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Axis Labels */}
        <div className="flex justify-between mt-2 ml-24">
          <span className="text-[10px] text-white/25 font-medium">← Low Impact</span>
          <span className="text-[10px] text-white/25 font-medium">High Impact →</span>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// RISK MATRIX BAR CHART
// =====================================================================
function RiskBars({ data }: { data: RiskCell[] }) {
  const sorted = [...data].sort((a, b) => b.score - a.score)

  return (
    <div className="space-y-3">
      {sorted.map((item, i) => {
        const color =
          item.score >= 70
            ? { bar: 'bg-red-500', text: 'text-red-400' }
            : item.score >= 45
              ? { bar: 'bg-orange-500', text: 'text-orange-400' }
              : item.score >= 25
                ? { bar: 'bg-yellow-500', text: 'text-yellow-400' }
                : { bar: 'bg-green-500', text: 'text-green-400' }

        return (
          <div key={item.category} className="flex items-center gap-3">
            <span className="text-xs text-white/50 w-32 shrink-0 truncate">{item.category}</span>
            <div className="flex-1 h-2 rounded-full bg-white/6 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 0.8, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }}
                className={cn('h-full rounded-full', color.bar)}
              />
            </div>
            <span className={cn('text-xs font-bold tabular-nums w-8 text-right', color.text)}>
              {item.score}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// =====================================================================
// RISK MATRIX COMPONENT
// =====================================================================
export default function RiskMatrix({ data = defaultRiskData, className }: RiskMatrixProps) {
  return (
    <div className={cn('rounded-2xl bg-white/3 border border-white/8 p-6 space-y-6', className)}>
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-white/80 mb-1">Risk Matrix</h3>
        <p className="text-xs text-white/40">Likelihood vs. Impact analysis across contract categories</p>
      </div>

      {/* Heatmap */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-3">
          Heatmap View
        </p>
        <RiskHeatmap data={data} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-white/40">
        {[
          { color: 'bg-green-500/60', label: 'Low (1-3)' },
          { color: 'bg-yellow-500/60', label: 'Medium (4-8)' },
          { color: 'bg-orange-500/70', label: 'High (9-15)' },
          { color: 'bg-red-500/80', label: 'Critical (16-25)' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn('h-2.5 w-4 rounded-sm', item.color)} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Bar Chart */}
      <div>
        <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-4">
          Risk Score by Category
        </p>
        <RiskBars data={data} />
      </div>
    </div>
  )
}
