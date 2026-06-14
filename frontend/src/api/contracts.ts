import { apiGet, apiPost, apiDelete } from '@/lib/api'
import type {
  ContractAnalysis,
  AnalyzeContractPayload,
  RiskFlag,
  ClauseAnalysis,
  PaginatedResponse,
} from '@/types'

// =====================================================================
// CONTRACT ANALYSIS ENDPOINTS
// =====================================================================

/**
 * Get all contract analyses for the current user.
 */
export async function getContractAnalyses(params?: {
  page?: number
  page_size?: number
  status?: ContractAnalysis['status']
  risk_level?: ContractAnalysis['overall_risk_level']
  search?: string
  ordering?: string
}): Promise<PaginatedResponse<ContractAnalysis>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  if (params?.status) searchParams.set('status', params.status)
  if (params?.risk_level) searchParams.set('risk_level', params.risk_level)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.ordering) searchParams.set('ordering', params.ordering)

  const query = searchParams.toString()
  return apiGet<PaginatedResponse<ContractAnalysis>>(`/contracts/analyses/${query ? `?${query}` : ''}`)
}

/**
 * Get a single contract analysis by ID.
 */
export async function getContractAnalysis(analysisId: string): Promise<ContractAnalysis> {
  return apiGet<ContractAnalysis>(`/contracts/analyses/${analysisId}/`)
}

/**
 * Get the contract analysis for a specific document.
 */
export async function getDocumentAnalysis(documentId: string): Promise<ContractAnalysis | null> {
  try {
    return await apiGet<ContractAnalysis>(`/contracts/analyses/by-document/${documentId}/`)
  } catch {
    return null
  }
}

/**
 * Start a contract analysis.
 */
export async function analyzeContract(
  payload: AnalyzeContractPayload,
): Promise<ContractAnalysis> {
  return apiPost<ContractAnalysis>('/contracts/analyze/', payload)
}

/**
 * Get the status of an ongoing analysis.
 */
export async function getAnalysisStatus(analysisId: string): Promise<{
  status: ContractAnalysis['status']
  progress: number
  message: string
  estimated_seconds_remaining: number | null
}> {
  return apiGet(`/contracts/analyses/${analysisId}/status/`)
}

/**
 * Delete a contract analysis.
 */
export async function deleteContractAnalysis(analysisId: string): Promise<void> {
  return apiDelete<void>(`/contracts/analyses/${analysisId}/`)
}

// =====================================================================
// RISK FLAGS
// =====================================================================

/**
 * Get all risk flags for an analysis, with optional filtering.
 */
export async function getRiskFlags(
  analysisId: string,
  params?: {
    severity?: RiskFlag['severity']
    category?: string
  },
): Promise<RiskFlag[]> {
  const searchParams = new URLSearchParams()
  if (params?.severity) searchParams.set('severity', params.severity)
  if (params?.category) searchParams.set('category', params.category)

  const query = searchParams.toString()
  return apiGet<RiskFlag[]>(
    `/contracts/analyses/${analysisId}/risk-flags/${query ? `?${query}` : ''}`,
  )
}

/**
 * Mark a risk flag as reviewed/acknowledged.
 */
export async function acknowledgeRiskFlag(
  analysisId: string,
  flagId: string,
  notes?: string,
): Promise<RiskFlag> {
  return apiPost<RiskFlag>(
    `/contracts/analyses/${analysisId}/risk-flags/${flagId}/acknowledge/`,
    { notes },
  )
}

// =====================================================================
// CLAUSE ANALYSIS
// =====================================================================

/**
 * Get all clause analyses for an analysis.
 */
export async function getClauseAnalyses(analysisId: string): Promise<ClauseAnalysis[]> {
  return apiGet<ClauseAnalysis[]>(`/contracts/analyses/${analysisId}/clauses/`)
}

/**
 * Get AI-suggested alternative language for a specific clause.
 */
export async function getClauseAlternative(
  analysisId: string,
  clauseId: string,
  instruction?: string,
): Promise<{ alternative: string; explanation: string }> {
  return apiPost(`/contracts/analyses/${analysisId}/clauses/${clauseId}/alternative/`, {
    instruction,
  })
}

/**
 * Accept a clause suggestion and get the modified document.
 */
export async function acceptClauseSuggestion(
  analysisId: string,
  clauseId: string,
  alternativeText: string,
): Promise<{ document_id: string; download_url: string }> {
  return apiPost(`/contracts/analyses/${analysisId}/clauses/${clauseId}/accept/`, {
    alternative_text: alternativeText,
  })
}

// =====================================================================
// COMPARATIVE ANALYSIS
// =====================================================================

/**
 * Compare two contracts.
 */
export async function compareContracts(
  documentId1: string,
  documentId2: string,
  focusAreas?: string[],
): Promise<{
  analysis_id: string
  differences: {
    category: string
    document1_text: string | null
    document2_text: string | null
    significance: 'high' | 'medium' | 'low'
    explanation: string
  }[]
  summary: string
  recommendation: string
}> {
  return apiPost('/contracts/compare/', {
    document_id_1: documentId1,
    document_id_2: documentId2,
    focus_areas: focusAreas,
  })
}

// =====================================================================
// REPORTS & EXPORTS
// =====================================================================

/**
 * Export a contract analysis as PDF report.
 */
export async function exportAnalysisReport(
  analysisId: string,
  format: 'pdf' | 'docx' = 'pdf',
): Promise<Blob> {
  const { api } = await import('@/lib/api')
  const response = await api.get(`/contracts/analyses/${analysisId}/export/?format=${format}`, {
    responseType: 'blob',
  })
  return response.data
}

/**
 * Get analysis summary statistics for dashboard.
 */
export async function getAnalyticsSummary(): Promise<{
  total_analyzed: number
  avg_risk_score: number
  high_risk_count: number
  medium_risk_count: number
  low_risk_count: number
  most_common_risks: { category: string; count: number }[]
  analyses_by_month: { month: string; count: number }[]
}> {
  return apiGet('/contracts/analytics/')
}

/**
 * Fetch standard clause suggestions from LawBot's clause library.
 */
export async function getClauseLibrary(params?: {
  search?: string
  category?: string
  jurisdiction?: string
}): Promise<
  {
    id: string
    category: string
    title: string
    description: string
    template_text: string
    jurisdiction: string
    is_pro_template: boolean
  }[]
> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)
  if (params?.category) searchParams.set('category', params.category)
  if (params?.jurisdiction) searchParams.set('jurisdiction', params.jurisdiction)

  const query = searchParams.toString()
  return apiGet(`/contracts/clause-library/${query ? `?${query}` : ''}`)
}

/**
 * Get contract review checklist for a given contract type.
 */
export async function getReviewChecklist(contractType: string): Promise<{
  checklist: { id: string; item: string; category: string; importance: 'critical' | 'recommended' | 'optional' }[]
}> {
  return apiGet(`/contracts/checklists/${contractType}/`)
}
