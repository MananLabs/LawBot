import { apiGet, apiPost, apiPatch, apiDelete, uploadApi } from '@/lib/api'
import type {
  Document,
  DocumentUploadResponse,
  DocumentListParams,
  DocumentType,
  PaginatedResponse,
} from '@/types'

// =====================================================================
// DOCUMENT LIST & SEARCH
// =====================================================================

/**
 * Get all documents for the current user/organization.
 */
export async function getDocuments(
  params: DocumentListParams = {},
): Promise<PaginatedResponse<Document>> {
  const searchParams = new URLSearchParams()

  if (params.search) searchParams.set('search', params.search)
  if (params.type) searchParams.set('type', params.type)
  if (params.status) searchParams.set('status', params.status)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.page_size) searchParams.set('page_size', String(params.page_size))
  if (params.ordering) searchParams.set('ordering', params.ordering)
  if (params.tags?.length) searchParams.set('tags', params.tags.join(','))

  const query = searchParams.toString()
  return apiGet<PaginatedResponse<Document>>(`/documents/${query ? `?${query}` : ''}`)
}

/**
 * Get a single document by ID.
 */
export async function getDocument(documentId: string): Promise<Document> {
  return apiGet<Document>(`/documents/${documentId}/`)
}

/**
 * Search documents with full-text search.
 */
export async function searchDocuments(
  query: string,
  filters?: Pick<DocumentListParams, 'type' | 'tags'>,
): Promise<Document[]> {
  return apiPost<Document[]>('/documents/search/', { query, ...filters })
}

// =====================================================================
// DOCUMENT UPLOAD
// =====================================================================

/**
 * Upload a document directly to the server.
 * Supports progress tracking via onUploadProgress callback.
 */
export async function uploadDocument(
  file: File,
  metadata?: {
    type?: DocumentType
    tags?: string[]
    name?: string
  },
  onUploadProgress?: (progress: number) => void,
): Promise<Document> {
  const formData = new FormData()
  formData.append('file', file)

  if (metadata?.type) formData.append('type', metadata.type)
  if (metadata?.name) formData.append('name', metadata.name)
  if (metadata?.tags?.length) formData.append('tags', JSON.stringify(metadata.tags))

  const response = await uploadApi.post<Document>('/documents/upload/', formData, {
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onUploadProgress(progress)
      }
    },
  })

  return response.data
}

/**
 * Get a pre-signed URL for direct S3 upload (for large files).
 */
export async function getUploadUrl(
  filename: string,
  fileSize: number,
  mimeType: string,
): Promise<DocumentUploadResponse> {
  return apiPost<DocumentUploadResponse>('/documents/upload-url/', {
    filename,
    file_size: fileSize,
    mime_type: mimeType,
  })
}

/**
 * Upload a file directly to S3 using a pre-signed URL.
 */
export async function uploadToS3(
  uploadUrl: string,
  file: File,
  presignedFields: Record<string, string>,
  onUploadProgress?: (progress: number) => void,
): Promise<void> {
  const formData = new FormData()

  // Add all presigned fields before the file
  Object.entries(presignedFields).forEach(([key, value]) => {
    formData.append(key, value)
  })
  formData.append('file', file)

  await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  // Note: fetch doesn't natively support upload progress
  // For progress support, use XMLHttpRequest
  if (onUploadProgress) onUploadProgress(100)
}

/**
 * Confirm a document upload was completed (after S3 upload).
 */
export async function confirmDocumentUpload(
  documentId: string,
): Promise<Document> {
  return apiPost<Document>(`/documents/${documentId}/confirm-upload/`)
}

/**
 * Upload multiple documents at once.
 */
export async function uploadMultipleDocuments(
  files: File[],
  onProgress?: (fileIndex: number, progress: number) => void,
): Promise<Document[]> {
  const uploadPromises = files.map((file, index) =>
    uploadDocument(file, undefined, (progress) => onProgress?.(index, progress)),
  )
  return Promise.all(uploadPromises)
}

// =====================================================================
// DOCUMENT MANAGEMENT
// =====================================================================

/**
 * Update document metadata (name, type, tags, etc.)
 */
export async function updateDocument(
  documentId: string,
  updates: Partial<Pick<Document, 'name' | 'type' | 'tags' | 'jurisdiction'>>,
): Promise<Document> {
  return apiPatch<Document>(`/documents/${documentId}/`, updates)
}

/**
 * Delete a document.
 */
export async function deleteDocument(documentId: string): Promise<void> {
  return apiDelete<void>(`/documents/${documentId}/`)
}

/**
 * Archive a document (soft delete).
 */
export async function archiveDocument(documentId: string): Promise<Document> {
  return apiPost<Document>(`/documents/${documentId}/archive/`)
}

/**
 * Restore an archived document.
 */
export async function restoreDocument(documentId: string): Promise<Document> {
  return apiPost<Document>(`/documents/${documentId}/restore/`)
}

/**
 * Add tags to a document.
 */
export async function addDocumentTags(
  documentId: string,
  tags: string[],
): Promise<Document> {
  return apiPost<Document>(`/documents/${documentId}/tags/`, { tags })
}

/**
 * Remove tags from a document.
 */
export async function removeDocumentTags(
  documentId: string,
  tags: string[],
): Promise<Document> {
  return apiPost<Document>(`/documents/${documentId}/tags/remove/`, { tags })
}

// =====================================================================
// DOCUMENT CONTENT
// =====================================================================

/**
 * Get the full text content of a document.
 */
export async function getDocumentContent(documentId: string): Promise<{
  text: string
  pages: { page: number; text: string }[]
}> {
  return apiGet(`/documents/${documentId}/content/`)
}

/**
 * Get the download URL for a document.
 */
export async function getDownloadUrl(
  documentId: string,
): Promise<{ url: string; expires_at: string }> {
  return apiGet(`/documents/${documentId}/download/`)
}

/**
 * Download a document file.
 */
export async function downloadDocument(documentId: string, filename: string): Promise<void> {
  const { url } = await getDownloadUrl(documentId)

  const response = await fetch(url)
  const blob = await response.blob()

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * Get a preview URL for a document (for in-browser viewing).
 */
export async function getPreviewUrl(
  documentId: string,
): Promise<{ url: string; expires_at: string }> {
  return apiGet(`/documents/${documentId}/preview/`)
}

// =====================================================================
// DOCUMENT PROCESSING STATUS
// =====================================================================

/**
 * Trigger re-processing of a document (e.g., if processing failed).
 */
export async function reprocessDocument(documentId: string): Promise<Document> {
  return apiPost<Document>(`/documents/${documentId}/reprocess/`)
}

/**
 * Get document processing status.
 */
export async function getDocumentStatus(
  documentId: string,
): Promise<{ status: Document['status']; progress: number; message: string }> {
  return apiGet(`/documents/${documentId}/status/`)
}

/**
 * Get storage usage for current user.
 */
export async function getStorageUsage(): Promise<{
  used_bytes: number
  limit_bytes: number
  document_count: number
  breakdown: { type: DocumentType; count: number; size_bytes: number }[]
}> {
  return apiGet('/documents/storage/')
}

/**
 * Get all unique tags used by the user's documents.
 */
export async function getDocumentTags(): Promise<string[]> {
  return apiGet<string[]>('/documents/tags/')
}
