import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Calendar, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ComplianceItem, CompliancePriority } from '@/types'

// =====================================================================
// PRIORITY CONFIG
// =====================================================================
const priorityConfig: Record<CompliancePriority, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'Critical', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/25' },
  high: { label: 'High', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/25' },
  medium: { label: 'Medium', bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/25' },
  low: { label: 'Low', bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/25' },
}

const statusConfig = {
  compliant: { label: 'Compliant', bg: 'bg-green-500/10', text: 'text-green-400', dot: 'bg-green-500' },
  non_compliant: { label: 'Non-Compliant', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
  needs_review: { label: 'Needs Review', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  not_applicable: { label: 'N/A', bg: 'bg-white/5', text: 'text-white/30', dot: 'bg-white/20' },
}

// =====================================================================
// COMPLIANCE CARD
// =====================================================================
interface ComplianceCardProps {
  item: ComplianceItem
  index?: number
  onComplete?: (id: string) => void
  className?: string
}

export default function ComplianceCard({
  item,
  index,
  onComplete,
  className,
}: ComplianceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [completing, setCompleting] = useState(false)

  const priority = priorityConfig[item.priority]
  const status = statusConfig[item.status]
  const isOverdue = item.is_overdue || (item.due_date ? isPast(new Date(item.due_date)) : false)
  const completedCount = item.action_items.filter((a) => a.completed).length

  const handleComplete = async () => {
    setCompleting(true)
    await new Promise((r) => setTimeout(r, 800))
    onComplete?.(item.id)
    setCompleting(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index ?? 0) * 0.05 }}
      className={cn(
        'rounded-2xl border overflow-hidden transition-all duration-200',
        isOverdue && item.status !== 'compliant'
          ? 'border-red-500/20 bg-red-500/3'
          : expanded
            ? 'border-white/12 bg-white/4'
            : 'border-white/6 bg-white/2 hover:bg-white/3 hover:border-white/10',
        className,
      )}
    >
      {/* Overdue indicator */}
      {isOverdue && item.status !== 'compliant' && (
        <div className="h-0.5 bg-gradient-to-r from-red-500 to-orange-500" />
      )}

      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Status dot */}
        <div className="mt-1 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            {item.status === 'non_compliant' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
            )}
            <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', status.dot)} />
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white/85 leading-snug">{item.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md', status.bg, status.text)}>
                  {status.label}
                </span>
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md border', priority.bg, priority.text, priority.border)}>
                  {priority.label}
                </span>
                <span className="text-[10px] text-white/30 bg-white/4 px-2 py-0.5 rounded-md">
                  {item.category}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {item.status !== 'compliant' && onComplete && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleComplete}
                  disabled={completing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/15 transition-all disabled:opacity-50"
                >
                  {completing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      className="h-3.5 w-3.5 border border-green-400/50 border-t-green-400 rounded-full"
                    />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {completing ? 'Marking...' : 'Mark Done'}
                </motion.button>
              )}

              <button
                onClick={() => setExpanded(!expanded)}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Due Date */}
          {item.due_date && (
            <div className="flex items-center gap-1.5 mt-2">
              <Calendar className={cn('h-3 w-3', isOverdue ? 'text-red-400' : 'text-white/30')} />
              <span className={cn('text-xs', isOverdue ? 'text-red-400 font-semibold' : 'text-white/35')}>
                {isOverdue
                  ? `Overdue by ${formatDistanceToNow(new Date(item.due_date))}`
                  : `Due ${format(new Date(item.due_date), 'dd MMM yyyy')}`}
              </span>
              {isOverdue && <AlertTriangle className="h-3 w-3 text-red-400" />}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4 border-t border-white/5 space-y-4"
        >
          {/* Description */}
          <div className="pt-4">
            <p className="text-xs text-white/55 leading-relaxed">{item.description}</p>
          </div>

          {/* Legal Reference */}
          <div className="flex items-start gap-2">
            <ExternalLink className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-0.5">
                Legal Reference
              </p>
              <p className="text-xs text-blue-400">{item.legal_reference}</p>
            </div>
          </div>

          {/* Penalty */}
          {item.penalty && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold text-red-400/80 uppercase tracking-wider mb-0.5">
                  Penalty Risk
                </p>
                <p className="text-xs text-white/55">{item.penalty}</p>
              </div>
            </div>
          )}

          {/* Action Items */}
          {item.action_items.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                Action Items ({completedCount}/{item.action_items.length})
              </p>
              <div className="space-y-2">
                {item.action_items.map((action) => (
                  <div key={action.id} className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'h-4 w-4 rounded-full border flex items-center justify-center shrink-0',
                        action.completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-white/15',
                      )}
                    >
                      {action.completed && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span
                      className={cn(
                        'text-xs',
                        action.completed ? 'text-white/35 line-through' : 'text-white/60',
                      )}
                    >
                      {action.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Required */}
          {item.documents_required.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">
                Documents Required
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.documents_required.map((doc) => (
                  <span
                    key={doc}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/4 text-white/45 border border-white/5"
                  >
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
