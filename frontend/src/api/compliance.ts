import { apiGet, apiPost, apiPatch } from '@/lib/api'
import type {
  ComplianceProfile,
  ComplianceItem,
  ComplianceDashboard,
  ComplianceCalendarEvent,
  ComplianceUpdate,
  ComplianceCheckPayload,
  ComplianceFramework,
  ComplianceStatus,
  CompliancePriority,
  ActionItem,
  PaginatedResponse,
} from '@/types'

// =====================================================================
// COMPLIANCE PROFILE
// =====================================================================

/**
 * Get the current organization's compliance profile.
 */
export async function getComplianceProfile(): Promise<ComplianceProfile | null> {
  try {
    return await apiGet<ComplianceProfile>('/compliance/profile/')
  } catch {
    return null
  }
}

/**
 * Create or update compliance profile (onboarding).
 */
export async function upsertComplianceProfile(
  payload: ComplianceCheckPayload,
): Promise<ComplianceProfile> {
  return apiPost<ComplianceProfile>('/compliance/profile/', payload)
}

/**
 * Update specific compliance profile fields.
 */
export async function updateComplianceProfile(
  updates: Partial<ComplianceCheckPayload>,
): Promise<ComplianceProfile> {
  return apiPatch<ComplianceProfile>('/compliance/profile/', updates)
}

// =====================================================================
// COMPLIANCE DASHBOARD
// =====================================================================

/**
 * Get the full compliance dashboard with scores, statistics, and upcoming deadlines.
 */
export async function getComplianceDashboard(): Promise<ComplianceDashboard> {
  return apiGet<ComplianceDashboard>('/compliance/dashboard/')
}

/**
 * Refresh compliance scores (trigger re-assessment).
 */
export async function refreshComplianceScore(): Promise<{
  score: number
  updated_at: string
  changes: { framework: string; old_score: number; new_score: number }[]
}> {
  return apiPost('/compliance/refresh-score/')
}

// =====================================================================
// COMPLIANCE ITEMS
// =====================================================================

/**
 * Get all compliance items with filtering.
 */
export async function getComplianceItems(params?: {
  page?: number
  page_size?: number
  framework?: ComplianceFramework
  status?: ComplianceStatus
  priority?: CompliancePriority
  is_overdue?: boolean
  search?: string
  ordering?: string
}): Promise<PaginatedResponse<ComplianceItem>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  if (params?.framework) searchParams.set('framework', params.framework)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.priority) searchParams.set('priority', params.priority)
  if (params?.is_overdue !== undefined)
    searchParams.set('is_overdue', String(params.is_overdue))
  if (params?.search) searchParams.set('search', params.search)
  if (params?.ordering) searchParams.set('ordering', params.ordering)

  const query = searchParams.toString()
  return apiGet<PaginatedResponse<ComplianceItem>>(
    `/compliance/items/${query ? `?${query}` : ''}`,
  )
}

/**
 * Get a single compliance item.
 */
export async function getComplianceItem(itemId: string): Promise<ComplianceItem> {
  return apiGet<ComplianceItem>(`/compliance/items/${itemId}/`)
}

/**
 * Update a compliance item's status.
 */
export async function updateComplianceItemStatus(
  itemId: string,
  status: ComplianceStatus,
  notes?: string,
): Promise<ComplianceItem> {
  return apiPatch<ComplianceItem>(`/compliance/items/${itemId}/`, { status, notes })
}

/**
 * Mark a compliance item as complete.
 */
export async function markComplianceItemComplete(
  itemId: string,
  documents?: string[],
  notes?: string,
): Promise<ComplianceItem> {
  return apiPost<ComplianceItem>(`/compliance/items/${itemId}/complete/`, {
    documents,
    notes,
  })
}

/**
 * Get AI guidance for completing a compliance item.
 */
export async function getComplianceGuidance(
  itemId: string,
): Promise<{
  steps: { step: number; title: string; description: string; documents_needed: string[] }[]
  legal_reference: string
  penalty_if_non_compliant: string
  helpful_resources: { title: string; url: string }[]
}> {
  return apiGet(`/compliance/items/${itemId}/guidance/`)
}

/**
 * Set responsible person for a compliance item.
 */
export async function assignComplianceItem(
  itemId: string,
  responsible_person: string,
  due_date?: string,
): Promise<ComplianceItem> {
  return apiPatch<ComplianceItem>(`/compliance/items/${itemId}/`, {
    responsible_person,
    due_date,
  })
}

// =====================================================================
// ACTION ITEMS
// =====================================================================

/**
 * Update an action item within a compliance item.
 */
export async function updateActionItem(
  complianceItemId: string,
  actionItemId: string,
  updates: Partial<Pick<ActionItem, 'completed' | 'due_date'>>,
): Promise<ActionItem> {
  return apiPatch<ActionItem>(
    `/compliance/items/${complianceItemId}/actions/${actionItemId}/`,
    updates,
  )
}

/**
 * Toggle an action item completion.
 */
export async function toggleActionItem(
  complianceItemId: string,
  actionItemId: string,
): Promise<ActionItem> {
  return apiPost<ActionItem>(
    `/compliance/items/${complianceItemId}/actions/${actionItemId}/toggle/`,
  )
}

// =====================================================================
// COMPLIANCE CALENDAR
// =====================================================================

/**
 * Get upcoming compliance deadlines.
 */
export async function getComplianceCalendar(params?: {
  start_date?: string
  end_date?: string
  framework?: ComplianceFramework
  priority?: CompliancePriority
}): Promise<ComplianceCalendarEvent[]> {
  const searchParams = new URLSearchParams()
  if (params?.start_date) searchParams.set('start_date', params.start_date)
  if (params?.end_date) searchParams.set('end_date', params.end_date)
  if (params?.framework) searchParams.set('framework', params.framework)
  if (params?.priority) searchParams.set('priority', params.priority)

  const query = searchParams.toString()
  return apiGet<ComplianceCalendarEvent[]>(`/compliance/calendar/${query ? `?${query}` : ''}`)
}

/**
 * Get overdue compliance items.
 */
export async function getOverdueItems(): Promise<ComplianceItem[]> {
  return apiGet<ComplianceItem[]>('/compliance/items/overdue/')
}

/**
 * Get items due within the next N days.
 */
export async function getUpcomingItems(days: number = 30): Promise<ComplianceItem[]> {
  return apiGet<ComplianceItem[]>(`/compliance/items/upcoming/?days=${days}`)
}

// =====================================================================
// COMPLIANCE UPDATES / NEWS
// =====================================================================

/**
 * Get recent regulatory updates and amendments.
 */
export async function getComplianceUpdates(params?: {
  page?: number
  page_size?: number
  framework?: ComplianceFramework
  type?: ComplianceUpdate['type']
}): Promise<PaginatedResponse<ComplianceUpdate>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  if (params?.framework) searchParams.set('framework', params.framework)
  if (params?.type) searchParams.set('type', params.type)

  const query = searchParams.toString()
  return apiGet<PaginatedResponse<ComplianceUpdate>>(
    `/compliance/updates/${query ? `?${query}` : ''}`,
  )
}

/**
 * Get impact analysis of a regulatory update on the user's profile.
 */
export async function getUpdateImpactAnalysis(updateId: string): Promise<{
  affected_items: string[]
  action_required: boolean
  urgency: 'immediate' | 'within_30_days' | 'informational'
  recommended_actions: string[]
}> {
  return apiGet(`/compliance/updates/${updateId}/impact/`)
}

// =====================================================================
// REPORTING
// =====================================================================

/**
 * Generate a compliance report.
 */
export async function generateComplianceReport(params: {
  framework?: ComplianceFramework
  include_recommendations?: boolean
  format: 'pdf' | 'xlsx'
  date_range?: { start: string; end: string }
}): Promise<Blob> {
  const { api } = await import('@/lib/api')
  const response = await api.post(
    '/compliance/reports/generate/',
    params,
    { responseType: 'blob' },
  )
  return response.data
}

/**
 * Get compliance score history over time.
 */
export async function getScoreHistory(months: number = 6): Promise<
  {
    month: string
    overall_score: number
    framework_scores: { framework: ComplianceFramework; score: number }[]
  }[]
> {
  return apiGet(`/compliance/score-history/?months=${months}`)
}

/**
 * Check a specific document for compliance issues.
 */
export async function checkDocumentCompliance(
  documentId: string,
  frameworks?: ComplianceFramework[],
): Promise<{
  issues: import('@/types').ComplianceIssue[]
  compliant_areas: string[]
  overall_status: ComplianceStatus
  recommendations: string[]
}> {
  return apiPost('/compliance/check-document/', {
    document_id: documentId,
    frameworks,
  })
}
