import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import type { ChatSession, Message, MessageRole, MessageStatus } from '@/types'

// =====================================================================
// CHAT STORE INTERFACE
// =====================================================================
interface ChatState {
  // State
  sessions: ChatSession[]
  currentSessionId: string | null
  messages: Record<string, Message[]> // sessionId -> messages
  streamingMessageId: string | null
  streamingContent: string
  isStreaming: boolean
  isLoadingSessions: boolean
  isLoadingMessages: boolean
  hasMoreSessions: boolean
  sessionsPage: number
  error: string | null
  inputValue: string
  selectedDocumentIds: string[]
  isSidebarOpen: boolean
  searchQuery: string

  // Session actions
  setSessions: (sessions: ChatSession[]) => void
  appendSessions: (sessions: ChatSession[]) => void
  addSession: (session: ChatSession) => void
  updateSession: (id: string, updates: Partial<ChatSession>) => void
  removeSession: (id: string) => void
  setCurrentSession: (id: string | null) => void
  pinSession: (id: string, pinned: boolean) => void

  // Message actions
  setMessages: (sessionId: string, messages: Message[]) => void
  addMessage: (sessionId: string, message: Message) => void
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void
  removeMessage: (sessionId: string, messageId: string) => void

  // Streaming actions
  startStreaming: (sessionId: string) => string // Returns temp message ID
  appendStreamChunk: (chunk: string) => void
  finishStreaming: (sessionId: string, finalMessage: Message) => void
  cancelStreaming: () => void

  // UI actions
  setInputValue: (value: string) => void
  toggleDocumentSelection: (docId: string) => void
  clearSelectedDocuments: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  setError: (error: string | null) => void
  setLoadingSessions: (loading: boolean) => void
  setLoadingMessages: (loading: boolean) => void
  setHasMoreSessions: (hasMore: boolean) => void
  incrementSessionsPage: () => void
  resetSessionsPage: () => void

  // Computed
  getCurrentSession: () => ChatSession | null
  getCurrentMessages: () => Message[]
  getSessionMessages: (sessionId: string) => Message[]
  getFilteredSessions: () => ChatSession[]
}

// =====================================================================
// ZUSTAND STORE
// =====================================================================
export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    // ---------------------------------------------------------------
    // INITIAL STATE
    // ---------------------------------------------------------------
    sessions: [],
    currentSessionId: null,
    messages: {},
    streamingMessageId: null,
    streamingContent: '',
    isStreaming: false,
    isLoadingSessions: false,
    isLoadingMessages: false,
    hasMoreSessions: false,
    sessionsPage: 1,
    error: null,
    inputValue: '',
    selectedDocumentIds: [],
    isSidebarOpen: true,
    searchQuery: '',

    // ---------------------------------------------------------------
    // SESSION ACTIONS
    // ---------------------------------------------------------------
    setSessions: (sessions) => set({ sessions }),

    appendSessions: (sessions) =>
      set((state) => ({
        sessions: [
          ...state.sessions,
          // Avoid duplicates
          ...sessions.filter((s) => !state.sessions.find((existing) => existing.id === s.id)),
        ],
      })),

    addSession: (session) =>
      set((state) => ({
        sessions: [session, ...state.sessions],
      })),

    updateSession: (id, updates) =>
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      })),

    removeSession: (id) =>
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([key]) => key !== id),
        ),
      })),

    setCurrentSession: (id) =>
      set({
        currentSessionId: id,
        streamingContent: '',
        streamingMessageId: null,
        isStreaming: false,
      }),

    pinSession: (id, pinned) =>
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === id ? { ...s, pinned } : s,
        ),
      })),

    // ---------------------------------------------------------------
    // MESSAGE ACTIONS
    // ---------------------------------------------------------------
    setMessages: (sessionId, messages) =>
      set((state) => ({
        messages: { ...state.messages, [sessionId]: messages },
      })),

    addMessage: (sessionId, message) =>
      set((state) => {
        const existing = state.messages[sessionId] ?? []
        // Avoid duplicate messages
        const alreadyExists = existing.some((m) => m.id === message.id)
        if (alreadyExists) return {}

        return {
          messages: {
            ...state.messages,
            [sessionId]: [...existing, message],
          },
        }
      }),

    updateMessage: (sessionId, messageId, updates) =>
      set((state) => {
        const sessionMessages = state.messages[sessionId]
        if (!sessionMessages) return {}

        return {
          messages: {
            ...state.messages,
            [sessionId]: sessionMessages.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m,
            ),
          },
        }
      }),

    removeMessage: (sessionId, messageId) =>
      set((state) => {
        const sessionMessages = state.messages[sessionId]
        if (!sessionMessages) return {}

        return {
          messages: {
            ...state.messages,
            [sessionId]: sessionMessages.filter((m) => m.id !== messageId),
          },
        }
      }),

    // ---------------------------------------------------------------
    // STREAMING ACTIONS
    // ---------------------------------------------------------------
    startStreaming: (sessionId: string): string => {
      const tempId = `streaming-${generateId()}`
      const now = new Date().toISOString()

      // Create a placeholder streaming message
      const streamingMessage: Message = {
        id: tempId,
        session_id: sessionId,
        role: 'assistant' as MessageRole,
        content: '',
        status: 'streaming' as MessageStatus,
        metadata: {},
        citations: [],
        created_at: now,
        updated_at: now,
      }

      set((state) => {
        const existing = state.messages[sessionId] ?? []
        return {
          streamingMessageId: tempId,
          streamingContent: '',
          isStreaming: true,
          messages: {
            ...state.messages,
            [sessionId]: [...existing, streamingMessage],
          },
        }
      })

      return tempId
    },

    appendStreamChunk: (chunk: string) =>
      set((state) => {
        const { streamingMessageId, streamingContent, currentSessionId } = state
        if (!streamingMessageId || !currentSessionId) return {}

        const newContent = streamingContent + chunk
        const sessionMessages = state.messages[currentSessionId] ?? []

        return {
          streamingContent: newContent,
          messages: {
            ...state.messages,
            [currentSessionId]: sessionMessages.map((m) =>
              m.id === streamingMessageId ? { ...m, content: newContent } : m,
            ),
          },
        }
      }),

    finishStreaming: (sessionId: string, finalMessage: Message) =>
      set((state) => {
        const { streamingMessageId } = state
        const sessionMessages = state.messages[sessionId] ?? []

        return {
          streamingMessageId: null,
          streamingContent: '',
          isStreaming: false,
          messages: {
            ...state.messages,
            [sessionId]: sessionMessages.map((m) =>
              m.id === streamingMessageId ? { ...finalMessage } : m,
            ),
          },
        }
      }),

    cancelStreaming: () =>
      set((state) => {
        const { streamingMessageId, currentSessionId, streamingContent } = state
        if (!streamingMessageId || !currentSessionId) {
          return { isStreaming: false, streamingContent: '', streamingMessageId: null }
        }

        const sessionMessages = state.messages[currentSessionId] ?? []
        const now = new Date().toISOString()

        return {
          streamingMessageId: null,
          streamingContent: '',
          isStreaming: false,
          messages: {
            ...state.messages,
            [currentSessionId]: sessionMessages.map((m) =>
              m.id === streamingMessageId
                ? {
                    ...m,
                    content: streamingContent || '(Response cancelled)',
                    status: 'complete' as MessageStatus,
                    updated_at: now,
                  }
                : m,
            ),
          },
        }
      }),

    // ---------------------------------------------------------------
    // UI ACTIONS
    // ---------------------------------------------------------------
    setInputValue: (value) => set({ inputValue: value }),

    toggleDocumentSelection: (docId) =>
      set((state) => ({
        selectedDocumentIds: state.selectedDocumentIds.includes(docId)
          ? state.selectedDocumentIds.filter((id) => id !== docId)
          : [...state.selectedDocumentIds, docId],
      })),

    clearSelectedDocuments: () => set({ selectedDocumentIds: [] }),

    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

    setSidebarOpen: (open) => set({ isSidebarOpen: open }),

    setSearchQuery: (query) => set({ searchQuery: query }),

    setError: (error) => set({ error }),

    setLoadingSessions: (loading) => set({ isLoadingSessions: loading }),

    setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

    setHasMoreSessions: (hasMore) => set({ hasMoreSessions: hasMore }),

    incrementSessionsPage: () => set((state) => ({ sessionsPage: state.sessionsPage + 1 })),

    resetSessionsPage: () => set({ sessionsPage: 1 }),

    // ---------------------------------------------------------------
    // COMPUTED SELECTORS
    // ---------------------------------------------------------------
    getCurrentSession: () => {
      const { sessions, currentSessionId } = get()
      if (!currentSessionId) return null
      return sessions.find((s) => s.id === currentSessionId) ?? null
    },

    getCurrentMessages: () => {
      const { messages, currentSessionId } = get()
      if (!currentSessionId) return []
      return messages[currentSessionId] ?? []
    },

    getSessionMessages: (sessionId: string) => {
      return get().messages[sessionId] ?? []
    },

    getFilteredSessions: () => {
      const { sessions, searchQuery } = get()
      if (!searchQuery.trim()) return sessions

      const query = searchQuery.toLowerCase()
      return sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.last_message?.toLowerCase().includes(query) ||
          s.tags.some((tag) => tag.toLowerCase().includes(query)),
      )
    },
  })),
)

// =====================================================================
// SELECTORS
// =====================================================================
export const selectSessions = (state: ChatState) => state.sessions
export const selectCurrentSessionId = (state: ChatState) => state.currentSessionId
export const selectIsStreaming = (state: ChatState) => state.isStreaming
export const selectInputValue = (state: ChatState) => state.inputValue
export const selectIsSidebarOpen = (state: ChatState) => state.isSidebarOpen
export const selectSelectedDocumentIds = (state: ChatState) => state.selectedDocumentIds
export const selectSearchQuery = (state: ChatState) => state.searchQuery
