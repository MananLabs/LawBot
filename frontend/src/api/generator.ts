import { apiGet, apiPost, apiDelete } from '@/lib/api'
import type {
  GenerateDocumentPayload,
  GeneratedDocument,
  DocumentTemplate,
  DocumentTemplate_Info,
  PaginatedResponse,
} from '@/types'

// =====================================================================
// TEMPLATE ENDPOINTS
// =====================================================================

/**
 * Get all available document templates.
 */
export async function getDocumentTemplates(params?: {
  category?: string
  search?: string
  is_premium?: boolean
}): Promise<DocumentTemplate_Info[]> {
  const searchParams = new URLSearchParams()
  if (params?.category) searchParams.set('category', params.category)
  if (params?.search) searchParams.set('search', params.search)
  if (params?.is_premium !== undefined)
    searchParams.set('is_premium', String(params.is_premium))

  const query = searchParams.toString()
  return apiGet<DocumentTemplate_Info[]>(`/generator/templates/${query ? `?${query}` : ''}`)
}

/**
 * Get a specific template with its complete field definitions.
 */
export async function getDocumentTemplate(templateId: DocumentTemplate): Promise<DocumentTemplate_Info> {
  return apiGet<DocumentTemplate_Info>(`/generator/templates/${templateId}/`)
}

/**
 * Get template categories.
 */
export async function getTemplateCategories(): Promise<
  { id: string; name: string; description: string; count: number; icon: string }[]
> {
  return apiGet('/generator/templates/categories/')
}

// =====================================================================
// DOCUMENT GENERATION
// =====================================================================

/**
 * Generate a legal document from a template.
 * Returns immediately with a GeneratedDocument in "generating" status.
 */
export async function generateDocument(
  payload: GenerateDocumentPayload,
): Promise<GeneratedDocument> {
  return apiPost<GeneratedDocument>('/generator/generate/', payload)
}

/**
 * Check generation status for a generated document.
 */
export async function getGenerationStatus(documentId: string): Promise<{
  status: GeneratedDocument['status']
  progress: number
  message: string
  estimated_seconds_remaining: number | null
}> {
  return apiGet(`/generator/documents/${documentId}/status/`)
}

/**
 * Preview a partially-generated document (streaming HTML).
 * Returns the preview URL to embed in an iframe.
 */
export async function getDocumentPreviewUrl(documentId: string): Promise<{
  preview_url: string
  expires_at: string
}> {
  return apiGet(`/generator/documents/${documentId}/preview/`)
}

/**
 * Get the download URL for a generated document.
 */
export async function getGeneratedDocumentUrl(
  documentId: string,
  format: 'pdf' | 'docx' = 'docx',
): Promise<{ url: string; expires_at: string; filename: string }> {
  return apiGet(`/generator/documents/${documentId}/download/?format=${format}`)
}

/**
 * Download a generated document.
 */
export async function downloadGeneratedDocument(
  documentId: string,
  filename: string,
  format: 'pdf' | 'docx' = 'docx',
): Promise<void> {
  const { url } = await getGeneratedDocumentUrl(documentId, format)
  const response = await fetch(url)
  const blob = await response.blob()

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.${format}`
  link.click()
  URL.revokeObjectURL(link.href)
}

// =====================================================================
// GENERATED DOCUMENT MANAGEMENT
// =====================================================================

/**
 * Get all generated documents for the current user.
 */
export async function getGeneratedDocuments(params?: {
  page?: number
  page_size?: number
  template?: DocumentTemplate
  status?: GeneratedDocument['status']
  search?: string
}): Promise<PaginatedResponse<GeneratedDocument>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.page_size) searchParams.set('page_size', String(params.page_size))
  if (params?.template) searchParams.set('template', params.template)
  if (params?.status) searchParams.set('status', params.status)
  if (params?.search) searchParams.set('search', params.search)

  const query = searchParams.toString()
  return apiGet<PaginatedResponse<GeneratedDocument>>(
    `/generator/documents/${query ? `?${query}` : ''}`,
  )
}

/**
 * Get a specific generated document.
 */
export async function getGeneratedDocument(documentId: string): Promise<GeneratedDocument> {
  return apiGet<GeneratedDocument>(`/generator/documents/${documentId}/`)
}

/**
 * Delete a generated document.
 */
export async function deleteGeneratedDocument(documentId: string): Promise<void> {
  return apiDelete<void>(`/generator/documents/${documentId}/`)
}

/**
 * Regenerate a document with updated fields.
 */
export async function regenerateDocument(
  documentId: string,
  updatedFields: Record<string, unknown>,
): Promise<GeneratedDocument> {
  return apiPost<GeneratedDocument>(`/generator/documents/${documentId}/regenerate/`, {
    fields: updatedFields,
  })
}

/**
 * Save a generated document to the user's document library.
 */
export async function saveToDocumentLibrary(documentId: string): Promise<{ document_id: string }> {
  return apiPost(`/generator/documents/${documentId}/save-to-library/`)
}

// =====================================================================
// AI CUSTOMIZATION
// =====================================================================

/**
 * Ask AI to customize a specific section of a generated document.
 */
export async function customizeSection(
  documentId: string,
  section: string,
  instruction: string,
): Promise<{
  section: string
  original_text: string
  customized_text: string
}> {
  return apiPost(`/generator/documents/${documentId}/customize-section/`, {
    section,
    instruction,
  })
}

/**
 * Apply a customization to the document.
 */
export async function applyCustomization(
  documentId: string,
  section: string,
  customizedText: string,
): Promise<GeneratedDocument> {
  return apiPost<GeneratedDocument>(`/generator/documents/${documentId}/apply-customization/`, {
    section,
    customized_text: customizedText,
  })
}

/**
 * Get AI-suggested improvements for a generated document.
 */
export async function getDocumentSuggestions(documentId: string): Promise<{
  suggestions: {
    section: string
    type: 'add_clause' | 'modify_language' | 'remove_clause' | 'strengthen'
    description: string
    reason: string
  }[]
}> {
  return apiGet(`/generator/documents/${documentId}/suggestions/`)
}

/**
 * Validate generated document fields before generation (pre-flight check).
 */
export async function validateFields(
  template: DocumentTemplate,
  fields: Record<string, unknown>,
): Promise<{
  valid: boolean
  errors: { field: string; message: string }[]
  warnings: { field: string; message: string }[]
}> {
  return apiPost('/generator/validate/', { template, fields })
}
