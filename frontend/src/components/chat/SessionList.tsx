import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, MessageSquare, Pin, Trash2, Edit3, Check, X, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chatStore'
import type { ChatSession } from '@/types'

// =====================================================================
// SESSION ITEM
// =====================================================================
interface SessionItemProps {
  session: ChatSession
  isActive: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onPin: (id: string, pinned: boolean) => void
}

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onPin,
}: SessionItemProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleRenameSubmit = () => {
    if (editTitle.trim()) {
      onRename(session.id, editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleDeleteClick = () => {
    if (confirmDelete) {
      onDelete(session.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setConfirmDelete(false)
      }}
      onClick={() => !isEditing && onSelect(session.id)}
      className={cn(
        'group relative flex items-start gap-2.5 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150',
        isActive
          ? 'bg-blue-500/12 border border-blue-500/20'
          : 'hover:bg-white/4 border border-transparent',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'mt-0.5 h-6 w-6 shrink-0 flex items-center justify-center rounded-lg transition-colors',
          isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/30',
        )}
      >
        {session.pinned ? (
          <Pin className="h-3.5 w-3.5" />
        ) : (
          <MessageSquare className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div
            className="flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') setIsEditing(false)
              }}
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 text-xs text-white outline-none focus:border-blue-500/40"
            />
            <button
              onClick={handleRenameSubmit}
              className="h-5 w-5 flex items-center justify-center text-green-400 hover:bg-green-500/10 rounded"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="h-5 w-5 flex items-center justify-center text-white/30 hover:bg-white/5 rounded"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <p
            className={cn(
              'text-xs font-medium truncate leading-snug',
              isActive ? 'text-white/90' : 'text-white/65',
            )}
          >
            {session.title || 'New Chat'}
          </p>
        )}

        {!isEditing && (
          <>
            {session.last_message && (
              <p className="text-[10px] text-white/30 truncate mt-0.5 leading-snug">
                {session.last_message}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="h-2.5 w-2.5 text-white/20" />
              <span className="text-[10px] text-white/25">
                {session.last_message_at
                  ? formatDistanceToNow(new Date(session.last_message_at), { addSuffix: true })
                  : 'Just now'}
              </span>
              {session.messages_count > 0 && (
                <>
                  <span className="text-white/15">·</span>
                  <span className="text-[10px] text-white/25">{session.messages_count} msgs</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <AnimatePresence>
        {isHovered && !isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-2 top-2 flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onPin(session.id, !session.pinned)}
              title={session.pinned ? 'Unpin' : 'Pin'}
              className={cn(
                'h-6 w-6 flex items-center justify-center rounded-md transition-all',
                session.pinned
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5',
              )}
            >
              <Pin className="h-3 w-3" />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 flex items-center justify-center rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
            >
              <Edit3 className="h-3 w-3" />
            </button>
            <button
              onClick={handleDeleteClick}
              className={cn(
                'h-6 w-6 flex items-center justify-center rounded-md transition-all',
                confirmDelete
                  ? 'text-red-400 bg-red-500/15'
                  : 'text-white/30 hover:text-red-400 hover:bg-white/5',
              )}
              title={confirmDelete ? 'Click again to confirm' : 'Delete'}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// =====================================================================
// SESSION LIST
// =====================================================================
interface SessionListProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onPin: (id: string, pinned: boolean) => void
  className?: string
}

export default function SessionList({
  sessions,
  currentSessionId,
  onSelect,
  onNewChat,
  onDelete,
  onRename,
  onPin,
  className,
}: SessionListProps) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.last_message?.toLowerCase().includes(search.toLowerCase()),
      )
    : sessions

  const pinned = filtered.filter((s) => s.pinned)
  const unpinned = filtered.filter((s) => !s.pinned)

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="p-3 border-b border-white/5 shrink-0">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </motion.button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/4 border border-white/6">
          <Search className="h-3.5 w-3.5 text-white/25 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-xs text-white/70 placeholder:text-white/25 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/50">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4">
        {/* Pinned */}
        {pinned.length > 0 && (
          <div>
            <p className="px-3 py-1.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">
              Pinned
            </p>
            <AnimatePresence>
              {pinned.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onRename={onRename}
                  onPin={onPin}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Recent */}
        {unpinned.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <p className="px-3 py-1.5 text-[10px] font-semibold text-white/25 uppercase tracking-wider">
                Recent
              </p>
            )}
            <AnimatePresence>
              {unpinned.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onRename={onRename}
                  onPin={onPin}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-8 w-8 text-white/10 mb-3" />
            <p className="text-xs text-white/30">
              {search ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
