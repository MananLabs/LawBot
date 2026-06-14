import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as complianceApi from '@/api/compliance'
import type { ComplianceFramework, CompliancePriority, ComplianceStatus } from '@/types'

// =====================================================================
// QUERY KEYS
// =====================================================================
export const complianceKeys = {
  all: ['compliance'] as const,
  profile: () => [...complianceKeys.all, 'profile'] as const,
  dashboard: () => [...complianceKeys.all, 'dashboard'] as const,
  items: (params: object) => [...complianceKeys.all, 'items', params] as const,
  item: (id: string) => [...complianceKeys.all, 'item', id] as const,
  calendar: (params?: object) => [...complianceKeys.all, 'calendar', params] as const,
  overdue: () => [...complianceKeys.all, 'overdue'] as const,
  upcoming: (days: number) => [...complianceKeys.all, 'upcoming', days] as const,
  updates: (params?: object) => [...complianceKeys.all, 'updates', params] as const,
  scoreHistory: (months: number) => [...complianceKeys.all, 'scoreHistory', months] as const,
  guidance: (id: string) => [...complianceKeys.all, 'guidance', id] as const,
}

// =====================================================================
// COMPLIANCE DASHBOARD
// =====================================================================
export function useComplianceDashboard() {
  return useQuery({
    queryKey: complianceKeys.dashboard(),
    queryFn: complianceApi.getComplianceDashboard,
    staleTime: 2 * 60_000,
  })
}

// =====================================================================
// COMPLIANCE PROFILE
// =====================================================================
export function useComplianceProfile() {
  return useQuery({
    queryKey: complianceKeys.profile(),
    queryFn: complianceApi.getComplianceProfile,
    staleTime: 5 * 60_000,
  })
}

// =====================================================================
// COMPLIANCE ITEMS
// =====================================================================
export function useComplianceItems(params?: {
  framework?: ComplianceFramework
  status?: ComplianceStatus
  priority?: CompliancePriority
  is_overdue?: boolean
  search?: string
}) {
  const queryClient = useQueryClient()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: complianceKeys.items(params ?? {}),
      queryFn: ({ pageParam = 1 }) =>
        complianceApi.getComplianceItems({ ...params, page: pageParam as number, page_size: 20 }),
      initialPageParam: 1,
      getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
    })

  const items = data?.pages.flatMap((p) => p.results) ?? []
  const total = data?.pages[0]?.count ?? 0

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({
      itemId,
      status,
      notes,
    }: {
      itemId: string
      status: ComplianceStatus
      notes?: string
    }) => complianceApi.updateComplianceItemStatus(itemId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all })
      toast.success('Compliance item updated')
    },
    onError: () => toast.error('Failed to update compliance item'),
  })

  const { mutate: markComplete, isPending: isCompleting } = useMutation({
    mutationFn: ({
      itemId,
      documents,
      notes,
    }: {
      itemId: string
      documents?: string[]
      notes?: string
    }) => complianceApi.markComplianceItemComplete(itemId, documents, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all })
      toast.success('Item marked as complete')
    },
    onError: () => toast.error('Failed to complete item'),
  })

  return {
    items,
    total,
    isLoading,
    hasMore: hasNextPage,
    isFetchingMore: isFetchingNextPage,
    loadMore: fetchNextPage,
    refetch,
    updateStatus,
    markComplete,
    isUpdating,
    isCompleting,
  }
}

// =====================================================================
// COMPLIANCE CALENDAR
// =====================================================================
export function useComplianceCalendar(params?: Parameters<typeof complianceApi.getComplianceCalendar>[0]) {
  return useQuery({
    queryKey: complianceKeys.calendar(params),
    queryFn: () => complianceApi.getComplianceCalendar(params),
    staleTime: 5 * 60_000,
  })
}

// =====================================================================
// OVERDUE & UPCOMING ITEMS
// =====================================================================
export function useOverdueItems() {
  return useQuery({
    queryKey: complianceKeys.overdue(),
    queryFn: complianceApi.getOverdueItems,
    staleTime: 2 * 60_000,
  })
}

export function useUpcomingItems(days = 30) {
  return useQuery({
    queryKey: complianceKeys.upcoming(days),
    queryFn: () => complianceApi.getUpcomingItems(days),
    staleTime: 5 * 60_000,
  })
}

// =====================================================================
// COMPLIANCE UPDATES / NEWS
// =====================================================================
export function useComplianceUpdates(params?: Parameters<typeof complianceApi.getComplianceUpdates>[0]) {
  return useInfiniteQuery({
    queryKey: complianceKeys.updates(params),
    queryFn: ({ pageParam = 1 }) =>
      complianceApi.getComplianceUpdates({ ...params, page: pageParam as number, page_size: 10 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
  })
}

// =====================================================================
// SCORE HISTORY
// =====================================================================
export function useScoreHistory(months = 6) {
  return useQuery({
    queryKey: complianceKeys.scoreHistory(months),
    queryFn: () => complianceApi.getScoreHistory(months),
    staleTime: 10 * 60_000,
  })
}

// =====================================================================
// COMPLIANCE GUIDANCE
// =====================================================================
export function useComplianceGuidance(itemId: string | null) {
  return useQuery({
    queryKey: complianceKeys.guidance(itemId!),
    queryFn: () => complianceApi.getComplianceGuidance(itemId!),
    enabled: !!itemId,
    staleTime: 30 * 60_000,
  })
}

// =====================================================================
// REFRESH SCORE
// =====================================================================
export function useRefreshComplianceScore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: complianceApi.refreshComplianceScore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all })
      toast.success('Compliance scores refreshed')
    },
    onError: () => toast.error('Failed to refresh scores'),
  })
}

// =====================================================================
// GENERATE COMPLIANCE REPORT
// =====================================================================
export function useComplianceReport() {
  return useMutation({
    mutationFn: (params: Parameters<typeof complianceApi.generateComplianceReport>[0]) =>
      complianceApi.generateComplianceReport(params),
    onSuccess: (blob, params) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `compliance-report.${params.format}`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    },
    onError: () => toast.error('Failed to generate report'),
  })
}

// =====================================================================
// TOGGLE ACTION ITEM
// =====================================================================
export function useToggleActionItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      complianceItemId,
      actionItemId,
    }: {
      complianceItemId: string
      actionItemId: string
    }) => complianceApi.toggleActionItem(complianceItemId, actionItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all })
    },
    onError: () => toast.error('Failed to update action item'),
  })
}
