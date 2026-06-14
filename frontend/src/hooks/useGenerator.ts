import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as generatorApi from '@/api/generator'
import type { DocumentTemplate, GenerateDocumentPayload, GeneratedDocument } from '@/types'

// =====================================================================
// QUERY KEYS
// =====================================================================
export const generatorKeys = {
  all: ['generator'] as const,
  templates: (params?: object) => [...generatorKeys.all, 'templates', params] as const,
  template: (id: string) => [...generatorKeys.all, 'template', id] as const,
  categories: () => [...generatorKeys.all, 'categories'] as const,
  documents: (params?: object) => [...generatorKeys.all, 'documents', params] as const,
  document: (id: string) => [...generatorKeys.all, 'document', id] as const,
  status: (id: string) => [...generatorKeys.all, 'status', id] as const,
  suggestions: (id: string) => [...generatorKeys.all, 'suggestions', id] as const,
}

// =====================================================================
// TEMPLATES
// =====================================================================
export function useDocumentTemplates(params?: Parameters<typeof generatorApi.getDocumentTemplates>[0]) {
  return useQuery({
    queryKey: generatorKeys.templates(params),
    queryFn: () => generatorApi.getDocumentTemplates(params),
    staleTime: 30 * 60_000,
  })
}

export function useDocumentTemplate(templateId: DocumentTemplate | null) {
  return useQuery({
    queryKey: generatorKeys.template(templateId!),
    queryFn: () => generatorApi.getDocumentTemplate(templateId!),
    enabled: !!templateId,
    staleTime: 30 * 60_000,
  })
}

export function useTemplateCategories() {
  return useQuery({
    queryKey: generatorKeys.categories(),
    queryFn: generatorApi.getTemplateCategories,
    staleTime: 60 * 60_000,
  })
}

// =====================================================================
// GENERATED DOCUMENTS LIST
// =====================================================================
export function useGeneratedDocuments(params?: Parameters<typeof generatorApi.getGeneratedDocuments>[0]) {
  const queryClient = useQueryClient()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: generatorKeys.documents(params),
      queryFn: ({ pageParam = 1 }) =>
        generatorApi.getGeneratedDocuments({ ...params, page: pageParam as number, page_size: 20 }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    })

  const documents = data?.pages.flatMap((p) => p.results) ?? []
  const total = data?.pages[0]?.count ?? 0

  const { mutate: deleteDocument, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => generatorApi.deleteGeneratedDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generatorKeys.all })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete document'),
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
    isDeleting,
  }
}

// =====================================================================
// SINGLE GENERATED DOCUMENT
// =====================================================================
export function useGeneratedDocument(documentId: string | null) {
  return useQuery({
    queryKey: generatorKeys.document(documentId!),
    queryFn: () => generatorApi.getGeneratedDocument(documentId!),
    enabled: !!documentId,
  })
}

// =====================================================================
// GENERATE DOCUMENT
// =====================================================================
export function useGenerateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: GenerateDocumentPayload) => generatorApi.generateDocument(payload),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: generatorKeys.documents() })
      queryClient.setQueryData(generatorKeys.document(doc.id), doc)
      toast.success('Document generation started')
    },
    onError: () => toast.error('Failed to generate document'),
  })
}

// =====================================================================
// GENERATION STATUS POLLING
// =====================================================================
export function useGenerationStatus(documentId: string | null, enabled = true) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: generatorKeys.status(documentId!),
    queryFn: () => generatorApi.getGenerationStatus(documentId!),
    enabled: !!documentId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') {
        // Refresh the document when generation finishes
        queryClient.invalidateQueries({ queryKey: generatorKeys.document(documentId!) })
        return false
      }
      return status === 'generating' || status === 'pending' ? 2000 : false
    },
  })
}

// =====================================================================
// DOWNLOAD GENERATED DOCUMENT
// =====================================================================
export function useDownloadGeneratedDocument() {
  return useMutation({
    mutationFn: ({
      id,
      filename,
      format,
    }: {
      id: string
      filename: string
      format: 'pdf' | 'docx'
    }) => generatorApi.downloadGeneratedDocument(id, filename, format),
    onError: () => toast.error('Failed to download document'),
  })
}

// =====================================================================
// REGENERATE DOCUMENT
// =====================================================================
export function useRegenerateDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string
      fields: Record<string, unknown>
    }) => generatorApi.regenerateDocument(id, fields),
    onSuccess: (doc) => {
      queryClient.setQueryData(generatorKeys.document(doc.id), doc)
      toast.success('Document regeneration started')
    },
    onError: () => toast.error('Failed to regenerate document'),
  })
}

// =====================================================================
// VALIDATE FIELDS
// =====================================================================
export function useValidateFields() {
  return useMutation({
    mutationFn: ({
      template,
      fields,
    }: {
      template: DocumentTemplate
      fields: Record<string, unknown>
    }) => generatorApi.validateFields(template, fields),
  })
}

// =====================================================================
// DOCUMENT SUGGESTIONS
// =====================================================================
export function useDocumentSuggestions(documentId: string | null) {
  return useQuery({
    queryKey: generatorKeys.suggestions(documentId!),
    queryFn: () => generatorApi.getDocumentSuggestions(documentId!),
    enabled: !!documentId,
    staleTime: 5 * 60_000,
  })
}

// =====================================================================
// SAVE TO LIBRARY
// =====================================================================
export function useSaveToLibrary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (documentId: string) => generatorApi.saveToDocumentLibrary(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      toast.success('Document saved to library')
    },
    onError: () => toast.error('Failed to save document'),
  })
}
