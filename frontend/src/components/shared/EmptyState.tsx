import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// =====================================================================
// EMPTY STATE COMPONENT
// =====================================================================
interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'compact' | 'page'
  className?: string
  illustration?: 'documents' | 'chat' | 'compliance' | 'search' | 'error'
}

// =====================================================================
// SVG ILLUSTRATIONS
// =====================================================================
function DocumentsIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-20">
      <rect x="20" y="15" width="60" height="80" rx="6" stroke="#3B82F6" strokeWidth="2" />
      <rect x="30" y="28" width="40" height="3" rx="1.5" fill="#3B82F6" />
      <rect x="30" y="38" width="30" height="3" rx="1.5" fill="#3B82F6" />
      <rect x="30" y="48" width="35" height="3" rx="1.5" fill="#3B82F6" />
      <rect x="30" y="58" width="20" height="3" rx="1.5" fill="#3B82F6" />
      <rect x="35" y="25" width="60" height="80" rx="6" stroke="#06B6D4" strokeWidth="2" strokeOpacity="0.5" />
    </svg>
  )
}

function ChatIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-20">
      <rect x="10" y="25" width="80" height="45" rx="10" stroke="#3B82F6" strokeWidth="2" />
      <path d="M30 70 L20 90 L50 75" fill="#3B82F6" opacity="0.5" />
      <rect x="22" y="38" width="55" height="3" rx="1.5" fill="#3B82F6" />
      <rect x="22" y="48" width="40" height="3" rx="1.5" fill="#06B6D4" />
      <circle cx="90" cy="35" r="18" stroke="#8B5CF6" strokeWidth="2" />
      <rect x="82" y="28" width="16" height="3" rx="1.5" fill="#8B5CF6" />
      <rect x="82" y="36" width="10" height="3" rx="1.5" fill="#8B5CF6" />
    </svg>
  )
}

function SearchIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-20">
      <circle cx="52" cy="52" r="32" stroke="#3B82F6" strokeWidth="2" />
      <path d="M76 76 L100 100" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
      <path d="M42 52 L62 52" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 44 L55 44" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ErrorIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-20">
      <circle cx="60" cy="60" r="40" stroke="#EF4444" strokeWidth="2" />
      <path d="M60 35 L60 65" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="78" r="3" fill="#EF4444" />
    </svg>
  )
}

const illustrations: Record<string, React.FC> = {
  documents: DocumentsIllustration,
  chat: ChatIllustration,
  search: SearchIllustration,
  error: ErrorIllustration,
  compliance: () => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-20">
      <rect x="20" y="20" width="80" height="80" rx="12" stroke="#10B981" strokeWidth="2" />
      <path d="M42 60 L55 73 L78 47" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
}

// =====================================================================
// EMPTY STATE COMPONENT
// =====================================================================
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className,
  illustration,
}: EmptyStateProps) {
  const IllustrationComponent = illustration ? illustrations[illustration] : null

  const containerClass = {
    default: 'py-16',
    compact: 'py-8',
    page: 'min-h-[60vh]',
  }[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        containerClass,
        className,
      )}
    >
      {/* Illustration or Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, type: 'spring' }}
        className="mb-6 relative"
      >
        {/* Background glow */}
        <div className="absolute inset-0 rounded-full bg-blue-500/5 blur-3xl scale-150" />

        {IllustrationComponent ? (
          <IllustrationComponent />
        ) : Icon ? (
          <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-white/3 border border-white/8">
            <Icon className="h-9 w-9 text-white/20" strokeWidth={1} />
          </div>
        ) : (
          <div className="h-20 w-20 rounded-2xl bg-white/3 border border-white/8" />
        )}
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2 mb-8 max-w-sm"
      >
        <h3 className="text-base font-semibold text-white/80">{title}</h3>
        {description && (
          <p className="text-sm text-white/40 leading-relaxed">{description}</p>
        )}
      </motion.div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {action && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={action.onClick}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
            >
              {action.label}
            </motion.button>
          )}
          {secondaryAction && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={secondaryAction.onClick}
              className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-medium hover:bg-white/8 hover:text-white/80 transition-all"
            >
              {secondaryAction.label}
            </motion.button>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
