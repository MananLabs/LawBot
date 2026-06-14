import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as contractsApi from '@/api/contracts'
import type { AnalyzeContractPayload, ContractAnalysis } from '@/types'

// =====================================================================
// QUERY KEYS
// =====================================================================
export const contractKeys = {
  all: ['contracts'] as const,
  lists: () => [...contractKeys.all, 'list'] as const,
  list: (params: object) => [...contractKeys.lists(), params] as const,
  detail: (id: string) => [...contractKeys.all, 'detail', id] as const,
  status: (id: string) => [...contractKeys.all, 'status', id] as const,
  analytics: () => [...contractKeys.all, 'analytics'] as const,
  clauses: (id: string) => [...contractKeys.all, 'clauses', id] as const,
  riskFlags: (id: string, params?: object) => [...contractKeys.all, 'riskFlags', id, params] as const,
}

// =====================================================================
// CONTRACT ANALYSES LIST
// =====================================================================
export function useContractAnalyses(params?: Parameters<typeof contractsApi.getContractAnalyses>[0]) {
  const queryClient = useQueryClient()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: contractKeys.list(params ?? {}),
      queryFn: ({ pageParam = 1 }) =>
        contractsApi.getContractAnalyses({ ...params, page: pageParam as number, page_size: 20 }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    })

  const analyses = data?.pages.flatMap((p) => p.results) ?? []
  const total = data?.pages[0]?.count ?? 0

  const { mutate: deleteAnalysis, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => contractsApi.deleteContractAnalysis(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      toast.success('Analysis deleted')
    },
    onError: () => toast.error('Failed to delete analysis'),
  })

  return {
    analyses,
    total,
    isLoading,
    hasMore: hasNextPage,
    isFetchingMore: isFetchingNextPage,
    loadMore: fetchNextPage,
    refetch,
    deleteAnalysis,
    isDeleting,
  }
}

// =====================================================================
// SINGLE CONTRACT ANALYSIS
// =====================================================================
export function useContractAnalysis(analysisId: string | null) {
  return useQuery({
    queryKey: contractKeys.detail(analysisId!),
    queryFn: () => contractsApi.getContractAnalysis(analysisId!),
    enabled: !!analysisId,
  })
}

// =====================================================================
// ANALYZE CONTRACT
// =====================================================================
export function useAnalyzeContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AnalyzeContractPayload) => contractsApi.analyzeContract(payload),
    onSuccess: (analysis) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      queryClient.setQueryData(contractKeys.detail(analysis.id), analysis)
      toast.success('Contract analysis started')
    },
    onError: () => toast.error('Failed to start contract analysis'),
  })
}

// =====================================================================
// ANALYSIS STATUS POLLING
// =====================================================================
export function useAnalysisStatus(analysisId: string | null, enabled = true) {
  return useQuery({
    queryKey: contractKeys.status(analysisId!),
    queryFn: () => contractsApi.getAnalysisStatus(analysisId!),
    enabled: !!analysisId && enabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'analyzing' || status === 'pending' ? 2000 : false
    },
  })
}

// =====================================================================
// RISK FLAGS
// =====================================================================
export function useRiskFlags(
  analysisId: string | null,
  params?: Parameters<typeof contractsApi.getRiskFlags>[1],
) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: contractKeys.riskFlags(analysisId!, params),
    queryFn: () => contractsApi.getRiskFlags(analysisId!, params),
    enabled: !!analysisId,
  })

  const { mutate: acknowledgeFlag } = useMutation({
    mutationFn: ({ flagId, notes }: { flagId: string; notes?: string }) =>
      contractsApi.acknowledgeRiskFlag(analysisId!, flagId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.riskFlags(analysisId!) })
      toast.success('Risk flag acknowledged')
    },
    onError: () => toast.error('Failed to acknowledge flag'),
  })

  return { ...query, acknowledgeFlag }
}

// =====================================================================
// CLAUSE ANALYSES
// =====================================================================
export function useClauseAnalyses(analysisId: string | null) {
  return useQuery({
    queryKey: contractKeys.clauses(analysisId!),
    queryFn: () => contractsApi.getClauseAnalyses(analysisId!),
    enabled: !!analysisId,
  })
}

// =====================================================================
// ANALYTICS
// =====================================================================
export function useContractAnalytics() {
  return useQuery({
    queryKey: contractKeys.analytics(),
    queryFn: contractsApi.getAnalyticsSummary,
    staleTime: 5 * 60_000,
  })
}

// =====================================================================
// EXPORT ANALYSIS
// =====================================================================
export function useExportAnalysis() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: 'pdf' | 'docx' }) =>
      contractsApi.exportAnalysisReport(id, format),
    onSuccess: (blob, { format }) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `contract-analysis.${format}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    },
    onError: () => toast.error('Failed to export report'),
  })
}
