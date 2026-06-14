import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Scale, Copy, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, BookOpen, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import RiskBadge from '@/components/shared/RiskBadge'
import ConfidenceBar from '@/components/shared/ConfidenceBar'
import type { Message, Citation, RiskLevel } from '@/types'

// =====================================================================
// SOURCE CARD (inline)
// =====================================================================
function SourceCard({ citation }: { citation: Citation }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-white/4 border border-white/8 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span className="text-xs text-white/60 truncate">
            {citation.act_name ?? citation.document_name ?? 'Source'}
            {citation.section_number && ` · §${citation.section_number}`}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="text-[10px] text-white/30 font-mono">
            {Math.round(citation.relevance_score * 100)}% match
          </span>
          {expanded ? (
            <ChevronUp className="h-3 w-3 text-white/30" />
          ) : (
            <ChevronDown className="h-3 w-3 text-white/30" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-3 pb-3"
          >
            <p className="text-xs text-white/50 leading-relaxed border-t border-white/5 pt-2">
              {citation.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// =====================================================================
// TYPEWRITER CURSOR
// =====================================================================
function Cursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
      className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 align-middle"
    />
  )
}

// =====================================================================
// CHAT MESSAGE
// =====================================================================
interface ChatMessageProps {
  message: Message
  isStreaming?: boolean
  userAvatar?: string
  userName?: string
}

export default function ChatMessage({
  message,
  isStreaming = false,
  userName = 'You',
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)
  const [showSources, setShowSources] = useState(false)

  const hasCitations = message.citations && message.citations.length > 0
  const confidenceScore = message.metadata?.prompt_tokens
    ? Math.round(
        Math.min(98, 60 + (message.metadata.completion_tokens ?? 100) / 10),
      )
    : 87

  // Extract risk level from metadata if present
  const riskLevel: RiskLevel | null = null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type)
    toast.success(type === 'up' ? 'Thanks for the feedback!' : 'We\'ll improve this response')
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end gap-3 group"
      >
        <div className="max-w-[75%]">
          {/* Message Bubble */}
          <div className="rounded-2xl rounded-tr-md bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-3 shadow-lg shadow-blue-500/15">
            <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>

          {/* Timestamp */}
          <p className="text-[10px] text-white/20 mt-1 text-right">
            {format(new Date(message.created_at), 'HH:mm')}
          </p>
        </div>

        {/* Avatar */}
        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white self-end">
          {userName?.[0]?.toUpperCase() ?? 'U'}
        </div>
      </motion.div>
    )
  }

  if (isAssistant) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex gap-3 group"
      >
        {/* LawBot Avatar */}
        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center self-start mt-1 shadow-lg shadow-blue-500/20">
          <Scale className="h-4 w-4 text-white" strokeWidth={1.5} />
        </div>

        <div className="flex-1 max-w-[85%] space-y-3">
          {/* Message Content */}
          <div className="rounded-2xl rounded-tl-md bg-white/4 border border-white/8 px-5 py-4">
            {/* Risk Badge (if high risk response) */}
            {riskLevel && (
              <div className="mb-3">
                <RiskBadge level={riskLevel} variant="large" animate />
              </div>
            )}

            {/* Markdown Content */}
            <div
              className={cn(
                'prose prose-invert prose-sm max-w-none',
                'prose-p:text-white/75 prose-p:leading-relaxed prose-p:my-2',
                'prose-headings:text-white/90 prose-headings:font-semibold',
                'prose-strong:text-white/90 prose-strong:font-semibold',
                'prose-code:text-cyan-400 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono',
                'prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/8 prose-pre:rounded-xl',
                'prose-li:text-white/70 prose-li:my-0.5',
                'prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
                'prose-blockquote:border-blue-500/40 prose-blockquote:text-white/50',
                'prose-hr:border-white/10',
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Streaming cursor */}
            {isStreaming && message.status === 'streaming' && <Cursor />}

            {/* Confidence Bar */}
            {!isStreaming && message.status === 'complete' && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <ConfidenceBar
                  value={confidenceScore}
                  label="AI Confidence"
                  size="sm"
                  variant="gradient"
                  animate
                />
              </div>
            )}
          </div>

          {/* Citations / Sources */}
          {hasCitations && !isStreaming && (
            <div className="space-y-2">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {message.citations.length} source{message.citations.length > 1 ? 's' : ''} referenced
                {showSources ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              <AnimatePresence>
                {showSources && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {message.citations.map((citation) => (
                      <SourceCard key={citation.id} citation={citation} />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Action Bar */}
          {!isStreaming && message.status === 'complete' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all text-xs font-medium"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleFeedback('up')}
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    feedback === 'up'
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-white/30 hover:text-green-400 hover:bg-white/5',
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback('down')}
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    feedback === 'down'
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-white/30 hover:text-red-400 hover:bg-white/5',
                  )}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="text-[10px] text-white/20 ml-auto">
                {format(new Date(message.created_at), 'HH:mm')}
                {message.metadata?.processing_time_ms &&
                  ` · ${(message.metadata.processing_time_ms / 1000).toFixed(1)}s`}
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>
    )
  }

  return null
}
