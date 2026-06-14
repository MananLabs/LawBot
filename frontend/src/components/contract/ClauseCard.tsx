import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Lightbulb, AlertTriangle, FileCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import RiskBadge from '@/components/shared/RiskBadge'
import type { ClauseAnalysis } from '@/types'

// =====================================================================
// CLAUSE CARD
// =====================================================================
interface ClauseCardProps {
  clause: ClauseAnalysis
  index?: number
  defaultExpanded?: boolean
  className?: string
}

export default function ClauseCard({
  clause,
  index,
  defaultExpanded = false,
  className,
}: ClauseCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showAlternative, setShowAlternative] = useState(false)

  const statusConfig = {
    present: { label: 'Present', color: 'text-green-400', bg: 'bg-green-500/10' },
    missing: { label: 'Missing', color: 'text-red-400', bg: 'bg-red-500/10' },
    ambiguous: { label: 'Ambiguous', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    unfavorable: { label: 'Unfavorable', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  }

  const status = statusConfig[clause.status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index ?? 0) * 0.04 }}
      className={cn(
        'rounded-2xl border overflow-hidden transition-all duration-200',
        expanded
          ? 'bg-white/4 border-white/12'
          : 'bg-white/2 border-white/6 hover:bg-white/3 hover:border-white/10',
        className,
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        {/* Clause Number */}
        {index !== undefined && (
          <span className="h-6 w-6 flex items-center justify-center rounded-lg bg-white/5 text-[10px] font-bold text-white/40 shrink-0">
            {index + 1}
          </span>
        )}

        {/* Title + Metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white/85">{clause.title}</p>
            <span className="text-[10px] text-white/30 font-mono bg-white/4 px-1.5 py-0.5 rounded">
              {clause.clause_type.replace('_', ' ')}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs text-white/40 truncate mt-0.5">{clause.analysis}</p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-lg', status.bg, status.color)}>
            {status.label}
          </span>
          <RiskBadge level={clause.risk_level} variant="pill" />
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-white/30" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/30" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/5">
              {/* Original Clause Text */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="h-3.5 w-3.5 text-white/30" />
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    Original Clause
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/3 border border-white/5 font-mono text-xs text-white/55 leading-relaxed max-h-40 overflow-y-auto">
                  {clause.original_text}
                </div>
              </div>

              {/* AI Analysis */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-blue-400" />
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                    Analysis
                  </p>
                </div>
                <p className="text-sm text-white/65 leading-relaxed">{clause.analysis}</p>
              </div>

              {/* Suggestions */}
              {clause.suggestions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
                    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                      Recommendations
                    </p>
                  </div>
                  <ul className="space-y-1.5">
                    {clause.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="h-4 w-4 rounded-full bg-yellow-500/15 flex items-center justify-center text-[9px] font-bold text-yellow-400 shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-white/60 leading-relaxed">{suggestion}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alternative Language */}
              {clause.alternative_language && (
                <div>
                  <button
                    onClick={() => setShowAlternative(!showAlternative)}
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    {showAlternative ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {showAlternative ? 'Hide' : 'Show'} Suggested Alternative Language
                  </button>

                  <AnimatePresence>
                    {showAlternative && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-2"
                      >
                        <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/15 font-mono text-xs text-green-300/70 leading-relaxed">
                          {clause.alternative_language}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
