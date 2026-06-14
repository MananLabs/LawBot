import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as documentsApi from '@/api/documents'
import type { Document, DocumentListParams, DocumentType } from '@/types'

// =====================================================================
// QUERY KEYS
// =====================================================================
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (params: DocumentListParams) => [...documentKeys.lists(), params] as const,
  detail: (id: string) => [...documentKeys.all, 'detail', id] as const,
  content: (id: string) => [...documentKeys.all, 'content', id] as const,
  status: (id: string) => [...documentKeys.all, 'status', id] as const,
  storage: () => [...documentKeys.all, 'storage'] as const,
  tags: () => [...documentKeys.all, 'tags'] as const,
}

// =====================================================================
// DOCUMENT LIST HOOK
// =====================================================================
export function useDocuments(params: DocumentListParams = {}) {
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: documentKeys.list(params),
    queryFn: ({ pageParam = 1 }) =>
      documentsApi.getDocuments({ ...params, page: pageParam as number, page_size: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
  })

  const documents = data?.pages.flatMap((p) => p.results) ?? []
  const total = data?.pages[0]?.count ?? 0

  const { mutate: deleteDocument, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete document'),
  })

  const { mutate: archiveDocument, isPending: isArchiving } = useMutation({
    mutationFn: (id: string) => documentsApi.archiveDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
      toast.success('Document archived')
    },
    onError: () => toast.error('Failed to archive document'),
  })

  const { mutate: reprocessDocument } = useMutation({
    mutationFn: (id: string) => documentsApi.reprocessDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
      toast.success('Document reprocessing started')
    },
    onError: () => toast.error('Failed to reprocess document'),
  })

  return {
    documents,
    total,
    isLoading,
    hasMore: hasNextPage,
    isFetchingMore: isFetchingNextPage,
    loadMore: fetchNextPage,
    refetch,
    deleteDocument,
    archiveDocument,
    reprocessDocument,
    isDeleting,
    isArchiving,
  }
}

// =====================================================================
// SINGLE DOCUMENT HOOK
// =====================================================================
export function useDocument(documentId: string | null) {
  return useQuery({
    queryKey: documentKeys.detail(documentId!),
    queryFn: () => documentsApi.getDocument(documentId!),
    enabled: !!documentId,
  })
}

// =====================================================================
// DOCUMENT UPLOAD HOOK
// =====================================================================
export function useDocumentUpload() {
  const queryClient = useQueryClient()
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const { mutateAsync: uploadDocument, isPending: isUploading } = useMutation({
    mutationFn: ({
      file,
      metadata,
    }: {
      file: File
      metadata?: { type?: DocumentType; tags?: string[]; name?: string }
    }) =>
      documentsApi.uploadDocument(file, metadata, (progress) => {
        setUploadProgress((prev) => ({ ...prev, [file.name]: progress }))
      }),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
      toast.success(`"${doc.name}" uploaded successfully`)
      setUploadProgress((prev) => {
        const next = { ...prev }
        delete next[doc.name]
        return next
      })
    },
    onError: (_, variables) => {
      toast.error(`Failed to upload "${variables.file.name}"`)
      setUploadProgress((prev) => {
        const next = { ...prev }
        delete next[variables.file.name]
        return next
      })
    },
  })

  const { mutateAsync: uploadMultiple, isPending: isUploadingMultiple } = useMutation({
    mutationFn: ({ files }: { files: File[] }) =>
      documentsApi.uploadMultipleDocuments(files, (fileIndex, progress) => {
        setUploadProgress((prev) => ({
          ...prev,
          [files[fileIndex].name]: progress,
        }))
      }),
    onSuccess: (docs) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
      toast.success(`${docs.length} documents uploaded`)
      setUploadProgress({})
    },
    onError: () => {
      toast.error('Some documents failed to upload')
      setUploadProgress({})
    },
  })

  const clearProgress = useCallback(() => setUploadProgress({}), [])

  return {
    uploadDocument,
    uploadMultiple,
    isUploading: isUploading || isUploadingMultiple,
    uploadProgress,
    clearProgress,
  }
}

// =====================================================================
// DOCUMENT DOWNLOAD HOOK
// =====================================================================
export function useDocumentDownload() {
  const { mutate: download, isPending: isDownloading } = useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      documentsApi.downloadDocument(id, filename),
    onError: () => toast.error('Failed to download document'),
  })

  return { download, isDownloading }
}

// =====================================================================
// DOCUMENT STATUS POLLING HOOK
// =====================================================================
export function useDocumentStatus(documentId: string | null, enabled = true) {
  return useQuery({
    queryKey: documentKeys.status(documentId!),
    queryFn: () => documentsApi.getDocumentStatus(documentId!),
    enabled: !!documentId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'processing' || status === 'pending' ? 2000 : false
    },
  })
}

// =====================================================================
// STORAGE USAGE HOOK
// =====================================================================
export function useStorageUsage() {
  return useQuery({
    queryKey: documentKeys.storage(),
    queryFn: documentsApi.getStorageUsage,
    staleTime: 60_000,
  })
}

// =====================================================================
// DOCUMENT TAGS HOOK
// =====================================================================
export function useDocumentTags() {
  return useQuery({
    queryKey: documentKeys.tags(),
    queryFn: documentsApi.getDocumentTags,
    staleTime: 5 * 60_000,
  })
}

// =====================================================================
// UPDATE DOCUMENT HOOK
// =====================================================================
export function useUpdateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Pick<Document, 'name' | 'type' | 'tags' | 'jurisdiction'>>
    }) => documentsApi.updateDocument(id, updates),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
      queryClient.setQueryData(documentKeys.detail(doc.id), doc)
      toast.success('Document updated')
    },
    onError: () => toast.error('Failed to update document'),
  })
}
