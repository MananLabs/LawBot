import { motion } from 'framer-motion'
import { FileText, Crown, Clock, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentTemplate_Info } from '@/types'

// =====================================================================
// CATEGORY COLORS
// =====================================================================
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Confidentiality: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  Employment: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  Startup: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  Commercial: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  Corporate: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
}

// =====================================================================
// TEMPLATE CARD
// =====================================================================
interface TemplateCardProps {
  template: DocumentTemplate_Info
  isSelected?: boolean
  onSelect?: () => void
  className?: string
}

export default function TemplateCard({
  template,
  isSelected = false,
  onSelect,
  className,
}: TemplateCardProps) {
  const catColors = categoryColors[template.category] ?? {
    bg: 'bg-white/10',
    text: 'text-white/50',
    border: 'border-white/10',
  }

  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(
        'relative rounded-2xl p-5 cursor-pointer border transition-all duration-200 overflow-hidden',
        isSelected
          ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/10'
          : 'bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15',
        template.is_premium && !isSelected && 'border-yellow-500/15',
        className,
      )}
    >
      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center"
        >
          <Check className="h-3.5 w-3.5 text-white" />
        </motion.div>
      )}

      {/* Premium Badge */}
      {template.is_premium && !isSelected && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/25">
          <Crown className="h-2.5 w-2.5 text-yellow-400" />
          <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider">Pro</span>
        </div>
      )}

      {/* Icon */}
      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center mb-4', catColors.bg)}>
        <FileText className={cn('h-5 w-5', catColors.text)} strokeWidth={1.5} />
      </div>

      {/* Content */}
      <h3 className="text-sm font-semibold text-white/90 mb-2 pr-8">{template.name}</h3>
      <p className="text-xs text-white/45 leading-relaxed mb-4">{template.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* Category */}
        <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-lg border', catColors.bg, catColors.text, catColors.border)}>
          {template.category}
        </span>

        {/* Time */}
        <div className="flex items-center gap-1 text-[10px] text-white/30">
          <Clock className="h-3 w-3" />
          {template.estimated_time}
        </div>
      </div>

      {/* Acts covered */}
      {template.acts_covered.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-[9px] text-white/20 font-semibold uppercase tracking-wider mb-1.5">
            Covers
          </p>
          <div className="flex flex-wrap gap-1">
            {template.acts_covered.slice(0, 2).map((act) => (
              <span
                key={act}
                className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/4 text-white/35"
              >
                {act}
              </span>
            ))}
            {template.acts_covered.length > 2 && (
              <span className="text-[9px] text-white/25">+{template.acts_covered.length - 2} more</span>
            )}
          </div>
        </div>
      )}

      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={isSelected ? { opacity: 1 } : { opacity: 0 }}
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)',
        }}
      />
    </motion.div>
  )
}
