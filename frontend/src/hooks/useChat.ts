import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useChatStore } from '@/stores/chatStore'
import * as chatApi from '@/api/chat'
import type { ChatSession, Message, SendMessagePayload } from '@/types'

// =====================================================================
// QUERY KEYS
// =====================================================================
export const chatKeys = {
  all: ['chat'] as const,
  sessions: () => [...chatKeys.all, 'sessions'] as const,
  session: (id: string) => [...chatKeys.sessions(), id] as const,
  messages: (sessionId: string) => [...chatKeys.all, 'messages', sessionId] as const,
  templates: () => [...chatKeys.all, 'templates'] as const,
}

// =====================================================================
// CHAT SESSIONS HOOK
// =====================================================================
export function useChatSessions() {
  const {
    setSessions,
    appendSessions,
    setLoadingSessions,
    setHasMoreSessions,
    incrementSessionsPage,
    resetSessionsPage,
    sessions,
    hasMoreSessions,
    isLoadingSessions,
  } = useChatStore()

  const PAGE_SIZE = 20

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: chatKeys.sessions(),
    queryFn: ({ pageParam = 1 }) =>
      chatApi.getChatSessions({
        page: pageParam as number,
        page_size: PAGE_SIZE,
        status: 'active',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.next) return undefined
      return pages.length + 1
    },
  })

  // Sync to Zustand store
  useEffect(() => {
    if (data?.pages) {
      const allSessions = data.pages.flatMap((p) => p.results)
      setSessions(allSessions)
      setHasMoreSessions(!!data.pages[data.pages.length - 1]?.next)
    }
  }, [data, setSessions, setHasMoreSessions])

  useEffect(() => {
    setLoadingSessions(isLoading)
  }, [isLoading, setLoadingSessions])

  return {
    sessions,
    isLoading,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    loadMore: fetchNextPage,
  }
}

// =====================================================================
// SINGLE SESSION HOOK
// =====================================================================
export function useChatSession(sessionId: string | null | undefined) {
  const { updateSession } = useChatStore()

  const { data: session, isLoading } = useQuery({
    queryKey: chatKeys.session(sessionId ?? ''),
    queryFn: () => chatApi.getChatSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 2 * 60 * 1000,
  })

  useEffect(() => {
    if (session && sessionId) {
      updateSession(sessionId, session)
    }
  }, [session, sessionId, updateSession])

  return { session, isLoading }
}

// =====================================================================
// MESSAGES HOOK
// =====================================================================
export function useChatMessages(sessionId: string | null | undefined) {
  const { setMessages, isLoadingMessages, setLoadingMessages } = useChatStore()

  const { data, isLoading, refetch } = useQuery({
    queryKey: chatKeys.messages(sessionId ?? ''),
    queryFn: async () => {
      const result = await chatApi.getMessages(sessionId!, { page_size: 100 })
      return result.results
    },
    enabled: !!sessionId,
    staleTime: 30 * 1000, // 30 seconds
  })

  useEffect(() => {
    if (data && sessionId) {
      setMessages(sessionId, data)
    }
  }, [data, sessionId, setMessages])

  useEffect(() => {
    setLoadingMessages(isLoading)
  }, [isLoading, setLoadingMessages])

  const messages = useChatStore(
    useCallback(
      (state) => (sessionId ? state.messages[sessionId] ?? [] : []),
      [sessionId],
    ),
  )

  return {
    messages,
    isLoading: isLoadingMessages,
    refetch,
  }
}

// =====================================================================
// SEND MESSAGE HOOK (with streaming)
// =====================================================================
export function useSendMessage() {
  const navigate = useNavigate()
  const abortControllerRef = useRef<AbortController | null>(null)

  const {
    currentSessionId,
    addMessage,
    addSession,
    updateSession,
    startStreaming,
    appendStreamChunk,
    finishStreaming,
    cancelStreaming,
    setInputValue,
    clearSelectedDocuments,
    selectedDocumentIds,
    isStreaming,
  } = useChatStore()

  const queryClient = useQueryClient()

  /**
   * Send a message with streaming AI response.
   */
  const sendMessage = useCallback(
    async (content: string, sessionId?: string): Promise<void> => {
      if (!content.trim() || isStreaming) return

      const targetSessionId = sessionId || currentSessionId
      const now = new Date().toISOString()

      // Create optimistic user message
      const tempUserMessageId = `temp-user-${Date.now()}`
      const userMessage: Message = {
        id: tempUserMessageId,
        session_id: targetSessionId ?? 'new',
        role: 'user',
        content: content.trim(),
        status: 'complete',
        metadata: {},
        citations: [],
        created_at: now,
        updated_at: now,
      }

      // Add user message immediately
      if (targetSessionId) {
        addMessage(targetSessionId, userMessage)
      }

      // Start streaming placeholder for assistant
      const streamingId = targetSessionId ? startStreaming(targetSessionId) : null

      // Clear input
      setInputValue('')

      // Setup abort controller
      abortControllerRef.current = new AbortController()

      const payload: SendMessagePayload = {
        session_id: targetSessionId ?? undefined,
        content: content.trim(),
        document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
        stream: true,
      }

      let newSession: ChatSession | null = null
      let finalSessionId = targetSessionId

      try {
        await chatApi.sendMessageStream(
          payload,
          {
            onChunk: (chunk: string) => {
              appendStreamChunk(chunk)
            },

            onComplete: async () => {
              // After streaming completes, fetch the actual saved message
              try {
                if (finalSessionId) {
                  const messages = await chatApi.getMessages(finalSessionId, { page_size: 5 })
                  const lastAssistantMessage = messages.results
                    .reverse()
                    .find((m) => m.role === 'assistant')

                  if (lastAssistantMessage && streamingId) {
                    finishStreaming(finalSessionId, lastAssistantMessage)
                  } else {
                    cancelStreaming()
                  }

                  // Refresh session metadata
                  queryClient.invalidateQueries({
                    queryKey: chatKeys.session(finalSessionId),
                  })
                  queryClient.invalidateQueries({ queryKey: chatKeys.sessions() })
                } else {
                  cancelStreaming()
                }
              } catch {
                cancelStreaming()
              }
            },

            onError: (error: Error) => {
              cancelStreaming()
              toast.error(`Failed to get response: ${error.message}`)
            },

            onSessionCreated: (session: ChatSession) => {
              newSession = session
              finalSessionId = session.id

              // Add to store and navigate
              addSession(session)
              navigate(`/chat/${session.id}`, { replace: true })

              // Initialize messages for new session
              if (streamingId) {
                // Move streaming state to new session
                const currentState = useChatStore.getState()
                const streamingMsg = currentState.messages['new']?.find(
                  (m) => m.id === streamingId,
                )
                if (streamingMsg) {
                  addMessage(session.id, { ...userMessage, session_id: session.id })
                  addMessage(session.id, { ...streamingMsg, session_id: session.id })
                }
              }
            },
          },
          abortControllerRef.current.signal,
        )
      } catch (error) {
        cancelStreaming()
        if (error instanceof Error && error.name !== 'AbortError') {
          toast.error('Failed to send message. Please try again.')
        }
      }

      clearSelectedDocuments()
    },
    [
      isStreaming,
      currentSessionId,
      selectedDocumentIds,
      addMessage,
      addSession,
      startStreaming,
      appendStreamChunk,
      finishStreaming,
      cancelStreaming,
      setInputValue,
      clearSelectedDocuments,
      navigate,
      queryClient,
    ],
  )

  /**
   * Cancel an ongoing streaming response.
   */
  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort()
    cancelStreaming()
  }, [cancelStreaming])

  return {
    sendMessage,
    cancelStream,
    isStreaming,
  }
}

// =====================================================================
// SESSION MANAGEMENT HOOK
// =====================================================================
export function useSessionManagement() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { removeSession, updateSession, setCurrentSession } = useChatStore()

  const createSessionMutation = useMutation({
    mutationFn: chatApi.createChatSession,
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.sessions() })
      navigate(`/chat/${session.id}`)
    },
    onError: () => {
      toast.error('Failed to create new chat. Please try again.')
    },
  })

  const deleteSessionMutation = useMutation({
    mutationFn: chatApi.deleteChatSession,
    onSuccess: (_, sessionId) => {
      removeSession(sessionId)
      queryClient.invalidateQueries({ queryKey: chatKeys.sessions() })
      navigate('/chat')
      toast.success('Chat deleted.')
    },
    onError: () => {
      toast.error('Failed to delete chat. Please try again.')
    },
  })

  const renameSessionMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      chatApi.updateChatSession(id, { title }),
    onSuccess: (session) => {
      updateSession(session.id, session)
      toast.success('Chat renamed.')
    },
    onError: () => {
      toast.error('Failed to rename chat.')
    },
  })

  const pinSessionMutation = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      chatApi.togglePinSession(id, pinned),
    onSuccess: (session) => {
      updateSession(session.id, session)
    },
    onError: () => {
      toast.error('Failed to update pin status.')
    },
  })

  const archiveSessionMutation = useMutation({
    mutationFn: chatApi.archiveChatSession,
    onSuccess: (session) => {
      removeSession(session.id)
      queryClient.invalidateQueries({ queryKey: chatKeys.sessions() })
      navigate('/chat')
      toast.success('Chat archived.')
    },
    onError: () => {
      toast.error('Failed to archive chat.')
    },
  })

  const exportSessionMutation = useMutation({
    mutationFn: ({ id, format }: { id: string; format: 'pdf' | 'txt' | 'docx' }) =>
      chatApi.exportChatSession(id, format),
    onSuccess: (blob, variables) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lawbot-chat.${variables.format}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Chat exported successfully.')
    },
    onError: () => {
      toast.error('Failed to export chat.')
    },
  })

  return {
    createSession: (payload?: Parameters<typeof chatApi.createChatSession>[0]) =>
      createSessionMutation.mutate(payload ?? {}),
    isCreatingSession: createSessionMutation.isPending,

    deleteSession: deleteSessionMutation.mutate,
    isDeletingSession: deleteSessionMutation.isPending,

    renameSession: renameSessionMutation.mutate,
    isRenamingSession: renameSessionMutation.isPending,

    pinSession: pinSessionMutation.mutate,
    archiveSession: archiveSessionMutation.mutate,
    exportSession: exportSessionMutation.mutate,
    isExporting: exportSessionMutation.isPending,
  }
}

// =====================================================================
// QUESTION TEMPLATES HOOK
// =====================================================================
export function useQuestionTemplates(category?: string) {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: [...chatKeys.templates(), category],
    queryFn: () => chatApi.getQuestionTemplates(category),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  return { templates, isLoading }
}
