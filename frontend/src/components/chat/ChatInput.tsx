import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Paperclip, X, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

// =====================================================================
// SUGGESTED PROMPTS
// =====================================================================
const SUGGESTED_PROMPTS = [
  'What are the key clauses in an NDA under Indian law?',
  'Explain Section 138 of Companies Act 2013',
  'What are GST compliance requirements for startups?',
  'How to structure ESOP in a private company?',
  'What is the FEMA limit for outward remittance?',
  'Explain director KYC requirements under MCA',
]

// =====================================================================
// CHAT INPUT COMPONENT
// =====================================================================
interface ChatInputProps {
  onSend: (content: string, files?: File[]) => void
  onStop?: () => void
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
}

export default function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
  placeholder = 'Ask LawBot about Indian corporate law...',
  maxLength = 4000,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Auto-resize textarea
  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
  }, [value])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed && attachedFiles.length === 0) return
    if (isStreaming || disabled) return

    onSend(trimmed, attachedFiles.length > 0 ? attachedFiles : undefined)
    setValue('')
    setAttachedFiles([])
    setShowSuggestions(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, attachedFiles, isStreaming, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)])
      e.target.value = ''
    }
  }

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const useSuggestion = (prompt: string) => {
    setValue(prompt)
    setShowSuggestions(false)
    textareaRef.current?.focus()
  }

  const charsLeft = maxLength - value.length
  const isNearLimit = charsLeft < 200
  const isOverLimit = charsLeft < 0
  const canSend = (value.trim().length > 0 || attachedFiles.length > 0) && !isOverLimit && !disabled

  return (
    <div className={cn('relative', className)}>
      {/* Suggestion Chips */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full mb-3 left-0 right-0 flex flex-wrap gap-2 pb-1"
          >
            {SUGGESTED_PROMPTS.map((prompt) => (
              <motion.button
                key={prompt}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => useSuggestion(prompt)}
                className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white/80 hover:bg-white/8 hover:border-white/15 transition-all truncate max-w-full text-left"
              >
                {prompt}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Container */}
      <motion.div
        animate={{
          borderColor: isFocused
            ? 'rgba(59, 130, 246, 0.5)'
            : isStreaming
              ? 'rgba(6, 182, 212, 0.3)'
              : 'rgba(255,255,255,0.08)',
          boxShadow: isFocused
            ? '0 0 0 3px rgba(59, 130, 246, 0.1), 0 0 20px rgba(59,130,246,0.08)'
            : '0 0 0 0px transparent',
        }}
        className="rounded-2xl bg-white/3 border overflow-hidden"
      >
        {/* Attached Files Preview */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 px-4 pt-3 pb-1"
            >
              {attachedFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-blue-400/60 hover:text-blue-300 ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea */}
        <div className="flex items-end gap-2 px-4 py-3">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (e.target.value.length === 0 && !showSuggestions) {
                setShowSuggestions(false)
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true)
              if (!value) setShowSuggestions(true)
            }}
            onBlur={() => {
              setIsFocused(false)
              setTimeout(() => setShowSuggestions(false), 200)
            }}
            disabled={disabled}
            placeholder={isStreaming ? 'LawBot is responding...' : placeholder}
            rows={1}
            maxLength={maxLength}
            className={cn(
              'flex-1 resize-none bg-transparent text-sm text-white/85 placeholder:text-white/25 outline-none leading-relaxed',
              'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent',
              (disabled || isStreaming) && 'opacity-50 cursor-not-allowed',
            )}
            style={{ minHeight: '24px', maxHeight: '200px' }}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0 pb-0.5">
            {/* Attach */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isStreaming}
              className="h-8 w-8 flex items-center justify-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all disabled:opacity-40"
            >
              <Paperclip className="h-4 w-4" />
            </motion.button>

            {/* Send / Stop */}
            {isStreaming ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStop}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={canSend ? { scale: 1.05 } : undefined}
                whileTap={canSend ? { scale: 0.95 } : undefined}
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  'h-8 w-8 flex items-center justify-center rounded-xl transition-all',
                  canSend
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                    : 'bg-white/5 text-white/20 cursor-not-allowed',
                )}
              >
                <Send className="h-4 w-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between px-4 pb-2">
          <p className="text-[10px] text-white/20">
            Shift+Enter for new line · Enter to send
          </p>
          {isNearLimit && (
            <span
              className={cn(
                'text-[10px] font-mono tabular-nums',
                isOverLimit ? 'text-red-400' : 'text-yellow-400/70',
              )}
            >
              {charsLeft}
            </span>
          )}
        </div>
      </motion.div>

      {/* Streaming indicator */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mt-2 px-1"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  className="h-1.5 w-1.5 rounded-full bg-blue-400"
                />
              ))}
            </div>
            <span className="text-xs text-white/30">LawBot is thinking...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
