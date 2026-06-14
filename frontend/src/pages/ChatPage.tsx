import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Scale,
  MessageSquare,
  Plus,
  Search,
  FileSearch,
  FileText,
  ClipboardCheck,
  ArrowRight,
  Sparkles,
  Home,
} from 'lucide-react'
import { useChatSessions, useSessionManagement } from '@/hooks/useChat'
import { useChatStore } from '@/stores/chatStore'
import { formatRelativeTime } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const SUGGESTED_QUESTIONS = [
  { text: 'What are the requirements for incorporating a private limited company in India?', icon: '🏢' },
  { text: 'Explain ESOP regulations under Companies Act 2013 for startups', icon: '📈' },
  { text: 'What are SEBI disclosure requirements for a Series A fundraise?', icon: '💰' },
  { text: 'Draft a Non-Disclosure Agreement for a vendor relationship', icon: '📄' },
  { text: 'What are the penalties for GST non-compliance for SMEs?', icon: '⚖️' },
  { text: 'Explain FEMA regulations for receiving foreign investment', icon: '🌐' },
]

export default function ChatPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { sessions, isLoading } = useChatSessions()
  const { createSession, isCreatingSession } = useSessionManagement()
  const { setCurrentSession, searchQuery, setSearchQuery } = useChatStore()

  useEffect(() => {
    setCurrentSession(null)
  }, [setCurrentSession])

  const handleNewChat = () => {
    createSession({ title: 'New Conversation' })
  }

  const handleSuggestedQuestion = (question: string) => {
    createSession({ title: question.slice(0, 60) + '...' })
  }

  const recentSessions = sessions.slice(0, 5)

  return (
    <div className="flex min-h-screen bg-dark">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-white/5 bg-dark-100">
        <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-400" />
            <span className="gradient-text font-bold">LawBot</span>
          </Link>
        </div>

        <div className="p-3">
          <button
            onClick={handleNewChat}
            disabled={isCreatingSession}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold disabled:opacity-60"
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
              placeholder="Search conversations..."
              className="input-dark w-full py-2 pl-9 text-xs"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {/* Nav links */}
          <div className="mb-4 space-y-1">
            <Link to="/dashboard" className="sidebar-item">
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="sidebar-item active">
              <MessageSquare className="h-4 w-4" />
              Chat
            </div>
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

          {/* Recent chats */}
          {recentSessions.length > 0 && (
            <div>
              <div className="mb-1 px-2 text-xs font-medium text-white/25 uppercase tracking-wider">
                Recent
              </div>
              <div className="space-y-0.5">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    to={`/chat/${session.id}`}
                    className="flex flex-col gap-0.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="truncate text-xs font-medium text-white/70">
                      {session.title}
                    </span>
                    <span className="text-xs text-white/30">
                      {session.last_message_at
                        ? formatRelativeTime(session.last_message_at)
                        : 'Just now'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white">
              {user?.first_name?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-medium text-white/80">
                {user?.full_name ?? 'User'}
              </div>
              <div className="text-xs text-white/35 capitalize">{user?.subscription?.tier ?? 'free'} plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 mesh-bg opacity-50" />
        <div className="absolute inset-0 dot-bg opacity-10" />
        <div className="absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-blue-500/6 blur-3xl" />
        <div className="absolute right-1/3 bottom-1/3 h-48 w-48 rounded-full bg-purple-500/5 blur-3xl" />

        <div className="relative z-10 w-full max-w-2xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Icon */}
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20">
              <Sparkles className="h-8 w-8 text-blue-400" />
            </div>

            <h1 className="mb-3 text-3xl font-bold text-white">
              How can I help you today?
            </h1>
            <p className="mb-10 text-white/45">
              Ask me anything about Indian corporate law, compliance, contracts, or get help drafting legal documents.
            </p>

            {/* Suggested questions */}
            <div className="grid gap-2.5 text-left sm:grid-cols-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  onClick={() => handleSuggestedQuestion(q.text)}
                  className="group flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.025] p-3.5 text-left transition-all hover:border-blue-500/20 hover:bg-blue-500/5"
                >
                  <span className="text-lg">{q.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/65 leading-relaxed line-clamp-2">{q.text}</p>
                  </div>
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/20 transition-colors group-hover:text-blue-400" />
                </motion.button>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8"
            >
              <button
                onClick={handleNewChat}
                disabled={isCreatingSession}
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                Start New Conversation
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
