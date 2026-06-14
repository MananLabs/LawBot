import { apiGet, apiPost, apiPatch, apiDelete, streamRequest } from '@/lib/api'
import type {
  ChatSession,
  Message,
  SendMessagePayload,
  SendMessageResponse,
  CreateSessionPayload,
  PaginatedResponse,
} from '@/types'

// =====================================================================
// CHAT SESSION ENDPOINTS
// =====================================================================

/**
 * Get all chat sessions for the current user.
 */
export async function getChatSessions(params?: {
  page?: number
  page_size?: number
  status?: 'active' | 'archived'
  search?: string
  pinned?: boolean
}): Promise<PaginatedResponse<ChatSession>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  if (params?.status) searchParams.set('status', params.status)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.pinned !== undefined) searchParams.set('pinned', String(params.pinned))

  const query = searchParams.toString()
  return apiGet<PaginatedResponse<ChatSession>>(`/chat/sessions/${query ? `?${query}` : ''}`)
}

/**
 * Get a single chat session by ID.
 */
export async function getChatSession(sessionId: string): Promise<ChatSession> {
  return apiGet<ChatSession>(`/chat/sessions/${sessionId}/`)
}

/**
 * Create a new chat session.
 */
export async function createChatSession(payload: CreateSessionPayload): Promise<ChatSession> {
  return apiPost<ChatSession>('/chat/sessions/', payload)
}

/**
 * Update a chat session (title, tags, pinned status, etc.)
 */
export async function updateChatSession(
  sessionId: string,
  updates: Partial<Pick<ChatSession, 'title' | 'tags' | 'pinned' | 'status'>>,
): Promise<ChatSession> {
  return apiPatch<ChatSession>(`/chat/sessions/${sessionId}/`, updates)
}

/**
 * Archive a chat session.
 */
export async function archiveChatSession(sessionId: string): Promise<ChatSession> {
  return apiPost<ChatSession>(`/chat/sessions/${sessionId}/archive/`)
}

/**
 * Delete a chat session permanently.
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  return apiDelete<void>(`/chat/sessions/${sessionId}/`)
}

/**
 * Pin or unpin a chat session.
 */
export async function togglePinSession(sessionId: string, pinned: boolean): Promise<ChatSession> {
  return apiPatch<ChatSession>(`/chat/sessions/${sessionId}/`, { pinned })
}

/**
 * Generate/update a session title from its messages.
 */
export async function generateSessionTitle(
  sessionId: string,
): Promise<{ title: string }> {
  return apiPost<{ title: string }>(`/chat/sessions/${sessionId}/generate-title/`)
}

/**
 * Export a chat session as PDF or text.
 */
export async function exportChatSession(
  sessionId: string,
  format: 'pdf' | 'txt' | 'docx',
): Promise<Blob> {
  const { api } = await import('@/lib/api')
  const response = await api.get(`/chat/sessions/${sessionId}/export/?format=${format}`, {
    responseType: 'blob',
  })
  return response.data
}

// =====================================================================
// MESSAGE ENDPOINTS
// =====================================================================

/**
 * Get messages for a chat session.
 */
export async function getMessages(
  sessionId: string,
  params?: {
    page?: number
    page_size?: number
  },
): Promise<PaginatedResponse<Message>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))

  const query = searchParams.toString()
  return apiGet<PaginatedResponse<Message>>(
    `/chat/sessions/${sessionId}/messages/${query ? `?${query}` : ''}`,
  )
}

/**
 * Send a message without streaming (returns complete response).
 */
export async function sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
  return apiPost<SendMessageResponse>('/chat/messages/', {
    ...payload,
    stream: false,
  })
}

/**
 * Send a message with streaming response.
 * Uses SSE (Server-Sent Events) for real-time token delivery.
 */
export async function sendMessageStream(
  payload: SendMessagePayload,
  callbacks: {
    onChunk: (chunk: string) => void
    onComplete: (message?: Message) => void
    onError: (error: Error) => void
    onSessionCreated?: (session: ChatSession) => void
  },
  signal?: AbortSignal,
): Promise<void> {
  // Use streaming fetch — not axios (which doesn't support true streaming)
  await streamRequest({
    url: '/chat/messages/stream/',
    body: { ...payload, stream: true },
    onChunk: callbacks.onChunk,
    onComplete: callbacks.onComplete,
    onError: callbacks.onError,
    signal,
  })
}

/**
 * Delete a specific message.
 */
export async function deleteMessage(sessionId: string, messageId: string): Promise<void> {
  return apiDelete<void>(`/chat/sessions/${sessionId}/messages/${messageId}/`)
}

/**
 * Regenerate the last assistant response.
 */
export async function regenerateMessage(
  sessionId: string,
  messageId: string,
  callbacks: {
    onChunk: (chunk: string) => void
    onComplete: () => void
    onError: (error: Error) => void
  },
  signal?: AbortSignal,
): Promise<void> {
  await streamRequest({
    url: `/chat/sessions/${sessionId}/messages/${messageId}/regenerate/`,
    body: {},
    onChunk: callbacks.onChunk,
    onComplete: callbacks.onComplete,
    onError: callbacks.onError,
    signal,
  })
}

/**
 * Rate a message (thumbs up/down).
 */
export async function rateMessage(
  sessionId: string,
  messageId: string,
  rating: 'helpful' | 'not_helpful',
  feedback?: string,
): Promise<void> {
  return apiPost<void>(`/chat/sessions/${sessionId}/messages/${messageId}/rate/`, {
    rating,
    feedback,
  })
}

/**
 * Copy a message content (track usage analytics).
 */
export async function trackMessageCopy(sessionId: string, messageId: string): Promise<void> {
  return apiPost<void>(`/chat/sessions/${sessionId}/messages/${messageId}/copy/`)
}

// =====================================================================
// LEGAL QUICK ACTIONS
// =====================================================================

/**
 * Ask a quick legal question without creating a session.
 */
export async function quickLegalQuery(
  question: string,
  jurisdiction?: string,
): Promise<{ answer: string; citations: Message['citations'] }> {
  return apiPost('/chat/quick-query/', { question, jurisdiction })
}

/**
 * Get suggested follow-up questions for context.
 */
export async function getSuggestedQuestions(
  sessionId: string,
): Promise<{ questions: string[] }> {
  return apiGet(`/chat/sessions/${sessionId}/suggestions/`)
}

/**
 * Get popular legal question templates.
 */
export async function getQuestionTemplates(category?: string): Promise<
  {
    id: string
    category: string
    question: string
    description: string
  }[]
> {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  return apiGet(`/chat/templates/${query}`)
}
