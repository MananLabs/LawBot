import { useEffect, useRef, useCallback, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Scale,
  Send,
  Square,
  Plus,
  Home,
  MessageSquare,
  FileSearch,
  FileText,
  ClipboardCheck,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RotateCcw,
  Paperclip,
  ChevronDown,
  Search,
} from 'lucide-react'
import { useChatSessions, useChatMessages, useSendMessage, useSessionManagement } from '@/hooks/useChat'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { formatRelativeTime, copyToClipboard, cn } from '@/lib/utils'
import type { Message } from '@/types'
import { toast } from 'sonner'

// ───────────────────────────────────────────────────────────────────
// Message Bubble Component
// ───────────────────────────────────────────────────────────────────
function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const isUser = message.role === 'user'
  const isStreaming = message.status === 'streaming'

  const handleCopy = async () => {
    await copyToClipboard(message.content)
    toast.success('Copied to clipboard')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn('group flex gap-3', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Avatar — AI only */}
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 shadow-glow">
          <Scale className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div className={cn('max-w-[75%] space-y-2', isUser && 'items-end')}>
        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isUser
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm shadow-glow'
              : 'glass text-white/85 rounded-tl-sm prose-dark',
          )}
        >
          {isUser ? (
            message.content
          ) : (
            <div className="prose-dark text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-typing-cursor bg-blue-400" />
              )}
            </div>
          )}
        </div>

        {/* Action buttons — AI messages only */}
        {!isUser && !isStreaming && message.content && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
            <button className="rounded-md p-1 text-white/30 hover:bg-white/5 hover:text-white/60 transition-colors">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button className="rounded-md p-1 text-white/30 hover:bg-white/5 hover:text-white/60 transition-colors">
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            {isLast && (
              <button className="rounded-md p-1 text-white/30 hover:bg-white/5 hover:text-white/60 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className={cn(
          'text-xs text-white/20 px-1',
          isUser && 'text-right'
        )}>
          {formatRelativeTime(message.created_at)}
        </p>
      </div>

      {/* Avatar — User */}
      {isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/30 text-xs font-bold text-blue-300">
          U
        </div>
      )}
    </motion.div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Message Input
// ───────────────────────────────────────────────────────────────────
function MessageInput({
  onSend,
  onCancel,
  isStreaming,
}: {
  onSend: (content: string) => void
  onCancel: () => void
  isStreaming: boolean
}) {
  const { inputValue, setInputValue } = useChatStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isStreaming) return
    onSend(inputValue.trim())
  }, [inputValue, isStreaming, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [inputValue])

  return (
    <div className="border-t border-white/5 bg-dark/90 backdrop-blur-xl p-4">
      <div className="mx-auto max-w-3xl">
        <div className="glass-card flex items-end gap-3 rounded-2xl p-3">
          <button className="mb-1 rounded-lg p-1.5 text-white/30 hover:bg-white/5 hover:text-white/60 transition-colors">
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Indian corporate law, contracts, compliance..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder-white/30 outline-none"
            style={{ maxHeight: '150px' }}
          />

          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/25 transition-colors"
              >
                <Square className="h-3 w-3 fill-current" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                  inputValue.trim()
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5'
                    : 'bg-white/5 text-white/20 cursor-not-allowed',
                )}
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-white/20">
          LawBot can make mistakes. Always verify legal advice with a qualified professional.
        </p>
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────────
// Main Chat Session Page
// ───────────────────────────────────────────────────────────────────
export default function ChatSessionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const { user } = useAuthStore()
  const { sessions } = useChatSessions()
  const { messages, isLoading: isLoadingMessages } = useChatMessages(id)
  const { sendMessage, cancelStream, isStreaming } = useSendMessage()
  const { createSession } = useSessionManagement()
  const { setCurrentSession, searchQuery, setSearchQuery } = useChatStore()

  const currentSession = sessions.find((s) => s.id === id)

  useEffect(() => {
    if (id) setCurrentSession(id)
    return () => setCurrentSession(null)
  }, [id, setCurrentSession])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Show/hide scroll-to-bottom button
  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (container) {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      setShowScrollBtn(distFromBottom > 200)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content, id)
    },
    [sendMessage, id],
  )

  const recentSessions = sessions.slice(0, 8)

  return (
    <div className="flex h-screen bg-dark overflow-hidden">
      {/* Sidebar */}
      <div className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-dark-100">
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-400" />
            <span className="gradient-text font-bold">LawBot</span>
          </Link>
        </div>

        <div className="p-3">
          <button
            onClick={() => createSession({ title: 'New Conversation' })}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="input-dark w-full py-2 pl-9 text-xs"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1 no-scrollbar">
          <div className="mb-3 space-y-0.5">
            <Link to="/dashboard" className="sidebar-item">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <Link to="/chat" className="sidebar-item active">
              <MessageSquare className="h-4 w-4" />
              Chat
            </Link>
            <Link to="/contracts" className="sidebar-item">
              <FileSearch className="h-4 w-4" />
              Contracts
            </Link>
            <Link to="/generate" className="sidebar-item">
              <FileText className="h-4 w-4" />
              Generate
            </Link>
            <Link to="/compliance" className="sidebar-item">
              <ClipboardCheck className="h-4 w-4" />
              Compliance
            </Link>
          </div>

          {recentSessions.length > 0 && (
            <div>
              <div className="mb-1 px-2 text-xs font-medium text-white/25 uppercase tracking-wider">
                Conversations
              </div>
              <div className="space-y-0.5">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    to={`/chat/${session.id}`}
                    className={cn(
                      'block truncate rounded-lg px-2 py-2 text-xs transition-colors',
                      session.id === id
                        ? 'bg-blue-500/10 text-blue-300'
                        : 'text-white/55 hover:bg-white/[0.04] hover:text-white/80',
                    )}
                  >
                    {session.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white">
              {user?.first_name?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-medium text-white/80">
                {user?.full_name ?? 'User'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 bg-dark/80 px-6 backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-white">
              {currentSession?.title ?? 'Legal Consultation'}
            </h1>
            <p className="text-xs text-white/35">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6 scroll-area"
        >
          <div className="mx-auto max-w-3xl space-y-6">
            {isLoadingMessages ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20">
                  <MessageSquare className="h-7 w-7 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Start the conversation</h3>
                <p className="mt-1 text-sm text-white/40">
                  Ask any question about Indian corporate law, contracts, or compliance.
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((message, i) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isLast={i === messages.length - 1}
                  />
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={scrollToBottom}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-white/10 bg-dark-200/90 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm hover:text-white transition-colors shadow-glass"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Scroll to bottom
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input */}
        <MessageInput
          onSend={handleSend}
          onCancel={cancelStream}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}
