import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ExternalLink, ChevronDown, ChevronUp, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Citation } from '@/types'

// =====================================================================
// SOURCE CARD COMPONENT
// =====================================================================
interface SourceCardProps {
  citation: Citation
  index?: number
  className?: string
  defaultExpanded?: boolean
}

export default function SourceCard({
  citation,
  index,
  className,
  defaultExpanded = false,
}: SourceCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const relevancePercent = Math.round(citation.relevance_score * 100)
  const sourceTitle = citation.act_name ?? citation.document_name ?? 'Unknown Source'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index ?? 0) * 0.05 }}
      className={cn(
        'rounded-xl bg-white/3 border border-white/8 overflow-hidden transition-all',
        expanded && 'border-blue-500/20 bg-blue-500/3',
        className,
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-white/2 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Source Number */}
          {index !== undefined && (
            <div className="h-5 w-5 rounded-md bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-blue-400">{index + 1}</span>
            </div>
          )}

          {/* Icon */}
          {index === undefined && (
            <BookOpen className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          )}

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white/80 truncate">{sourceTitle}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {citation.section_number && (
                <span className="flex items-center gap-0.5 text-[11px] text-blue-400/80">
                  <Hash className="h-2.5 w-2.5" />
                  Section {citation.section_number}
                </span>
              )}
              {citation.section && (
                <span className="text-[11px] text-white/40 truncate max-w-[200px]">
                  {citation.section}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Relevance + Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Relevance Score */}
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1 rounded-full bg-white/8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${relevancePercent}%` }}
                transition={{ duration: 0.8, delay: (index ?? 0) * 0.05 }}
                className={cn(
                  'h-full rounded-full',
                  relevancePercent >= 80
                    ? 'bg-green-500'
                    : relevancePercent >= 60
                      ? 'bg-blue-500'
                      : 'bg-yellow-500',
                )}
              />
            </div>
            <span className="text-[10px] text-white/30 font-mono tabular-nums">
              {relevancePercent}%
            </span>
          </div>

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
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5">
              {/* Excerpt */}
              <div className="mt-3 p-3 rounded-lg bg-white/3 border border-white/5">
                <p className="text-xs text-white/55 leading-relaxed italic">
                  "{citation.text}"
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {citation.document_name && (
                    <span className="text-[10px] text-white/25 bg-white/4 px-2 py-0.5 rounded-md">
                      {citation.document_name}
                    </span>
                  )}
                </div>

                {citation.url && (
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Source
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// =====================================================================
// SOURCE LIST
// =====================================================================
export function SourceList({
  citations,
  className,
}: {
  citations: Citation[]
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
        {citations.length} Source{citations.length !== 1 ? 's' : ''}
      </p>
      {citations.map((citation, i) => (
        <SourceCard
          key={citation.id}
          citation={citation}
          index={i}
        />
      ))}
    </div>
  )
}
