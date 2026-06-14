import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Scale,
  Home,
  MessageSquare,
  FileText,
  ClipboardCheck,
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Loader2,
  Filter,
  Calendar,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getComplianceDashboard, getComplianceItems } from '@/api/compliance'
import { cn, formatDate } from '@/lib/utils'
import type { ComplianceFramework, ComplianceStatus } from '@/types'

const FRAMEWORK_LABELS: Record<string, string> = {
  companies_act_2013: 'Companies Act 2013',
  sebi: 'SEBI Regulations',
  fema: 'FEMA',
  gst: 'GST',
  income_tax: 'Income Tax',
  labour_laws: 'Labour Laws',
  ibc: 'IBC',
  competition_act: 'Competition Act',
  data_protection: 'Data Protection',
  rbi_guidelines: 'RBI Guidelines',
  startup_india: 'Startup India',
  consumer_protection: 'Consumer Protection',
}

const STATUS_CONFIG: Record<ComplianceStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  compliant: { label: 'Compliant', className: 'badge-green', icon: CheckCircle2 },
  non_compliant: { label: 'Non-Compliant', className: 'badge-red', icon: AlertTriangle },
  needs_review: { label: 'Needs Review', className: 'badge-orange', icon: Clock },
  not_applicable: { label: 'N/A', className: 'badge-blue', icon: CheckCircle2 },
}

function ScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 50
  const offset = circumference * (1 - score / 100)
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="-rotate-90 absolute inset-0" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
        />
      </svg>
      <div className="text-center">
        <div className="text-4xl font-bold text-white">{score}</div>
        <div className="text-xs text-white/40">/ 100</div>
      </div>
    </div>
  )
}

export default function CompliancePage() {
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<ComplianceStatus | 'all'>('all')
  const [view, setView] = useState<'overview' | 'items' | 'calendar'>('overview')

  const { data: dashboard, isLoading: isLoadingDashboard, refetch } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: getComplianceDashboard,
    retry: 1,
  })

  const { data: itemsData, isLoading: isLoadingItems } = useQuery({
    queryKey: ['compliance-items', selectedFramework, selectedStatus],
    queryFn: () => getComplianceItems({
      framework: selectedFramework !== 'all' ? selectedFramework : undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      page_size: 20,
    }),
    enabled: view === 'items',
    retry: 1,
  })

  return (
    <div className="flex min-h-screen bg-dark">
      {/* Sidebar */}
      <div className="flex w-64 shrink-0 flex-col border-r border-white/5 bg-dark-100">
        <div className="flex h-16 items-center px-4 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-400" />
            <span className="gradient-text font-bold">LawBot</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-2 pt-3">
          <Link to="/dashboard" className="sidebar-item"><Home className="h-4 w-4" />Dashboard</Link>
          <Link to="/chat" className="sidebar-item"><MessageSquare className="h-4 w-4" />Chat</Link>
          <Link to="/contracts" className="sidebar-item"><FileSearch className="h-4 w-4" />Contracts</Link>
          <Link to="/generate" className="sidebar-item"><FileText className="h-4 w-4" />Generate</Link>
          <div className="sidebar-item active"><ClipboardCheck className="h-4 w-4" />Compliance</div>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Compliance Tracker</h1>
              <p className="mt-1 text-white/45">
                Monitor your regulatory obligations across all Indian compliance frameworks.
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white/60 hover:text-white/80 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {/* View tabs */}
          <div className="mb-6 flex items-center gap-1 rounded-xl border border-white/6 bg-white/[0.02] p-1 w-fit">
            {(['overview', 'items', 'calendar'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all',
                  view === v
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'text-white/45 hover:text-white/70',
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {isLoadingDashboard && view === 'overview' ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : view === 'overview' ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Score + Stats */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Score */}
                <div className="glass-card rounded-xl p-6 text-center">
                  <div className="mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                    <h2 className="font-semibold text-white">Overall Score</h2>
                  </div>
                  <ScoreGauge score={dashboard?.overall_score ?? 78} />
                  <div className={cn(
                    'mt-4 inline-flex rounded-full px-3 py-1 text-xs font-medium',
                    (dashboard?.overall_score ?? 78) >= 75
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : (dashboard?.overall_score ?? 78) >= 50
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400',
                  )}>
                    {(dashboard?.overall_score ?? 78) >= 75
                      ? 'Good Standing'
                      : (dashboard?.overall_score ?? 78) >= 50
                        ? 'Needs Attention'
                        : 'Critical Issues'}
                  </div>
                </div>

                {/* Summary stats */}
                <div className="glass-card rounded-xl p-6 lg:col-span-2">
                  <h2 className="mb-4 font-semibold text-white">Summary</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Total Items', value: dashboard?.total_items ?? 42, color: 'blue' },
                      { label: 'Compliant', value: dashboard?.compliant_count ?? 28, color: 'green' },
                      { label: 'Non-Compliant', value: dashboard?.non_compliant_count ?? 7, color: 'red' },
                      { label: 'Overdue', value: dashboard?.overdue_count ?? 3, color: 'red' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-white/[0.02] p-4">
                        <div className={cn(
                          'text-2xl font-bold',
                          stat.color === 'blue' && 'text-blue-400',
                          stat.color === 'green' && 'text-emerald-400',
                          stat.color === 'red' && 'text-red-400',
                        )}>
                          {stat.value}
                        </div>
                        <div className="mt-1 text-xs text-white/40">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Framework breakdown */}
              <div className="glass-card rounded-xl p-6">
                <h2 className="mb-5 font-semibold text-white">Framework Breakdown</h2>
                <div className="space-y-3">
                  {(dashboard?.framework_breakdown ?? [
                    { framework: 'companies_act_2013' as ComplianceFramework, framework_name: 'Companies Act 2013', score: 85, total: 12, compliant: 10, non_compliant: 1, needs_review: 1 },
                    { framework: 'gst' as ComplianceFramework, framework_name: 'GST', score: 70, total: 8, compliant: 5, non_compliant: 2, needs_review: 1 },
                    { framework: 'labour_laws' as ComplianceFramework, framework_name: 'Labour Laws', score: 90, total: 10, compliant: 9, non_compliant: 0, needs_review: 1 },
                    { framework: 'income_tax' as ComplianceFramework, framework_name: 'Income Tax', score: 60, total: 6, compliant: 3, non_compliant: 2, needs_review: 1 },
                  ]).map((fw) => (
                    <div key={fw.framework} className="flex items-center gap-4">
                      <div className="w-40 shrink-0 text-sm text-white/65">{fw.framework_name}</div>
                      <div className="flex-1">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${fw.score}%`,
                              background: fw.score >= 75 ? 'linear-gradient(90deg,#10b981,#059669)' :
                                fw.score >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' :
                                  'linear-gradient(90deg,#ef4444,#dc2626)',
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-10 text-right text-sm font-medium text-white">{fw.score}</div>
                      <ChevronRight className="h-4 w-4 text-white/20" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="glass-card rounded-xl p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <h2 className="font-semibold text-white">Upcoming Deadlines</h2>
                </div>
                <div className="space-y-3">
                  {(dashboard?.upcoming_deadlines ?? [
                    { id: '1', title: 'MGT-7 Annual Return', framework: 'companies_act_2013' as ComplianceFramework, due_date: '2025-11-30', priority: 'high' as const, status: 'needs_review' as ComplianceStatus, description: '', recurring: true, frequency: 'annual' as const },
                    { id: '2', title: 'GSTR-9 Annual Return', framework: 'gst' as ComplianceFramework, due_date: '2025-12-31', priority: 'medium' as const, status: 'needs_review' as ComplianceStatus, description: '', recurring: true, frequency: 'annual' as const },
                    { id: '3', title: 'TDS Return Q3', framework: 'income_tax' as ComplianceFramework, due_date: '2026-01-15', priority: 'high' as const, status: 'needs_review' as ComplianceStatus, description: '', recurring: true, frequency: 'quarterly' as const },
                  ]).map((event) => {
                    const daysLeft = Math.ceil((new Date(event.due_date).getTime() - Date.now()) / 86400000)
                    return (
                      <div key={event.id} className="flex items-center gap-4 rounded-lg bg-white/[0.02] p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{event.title}</p>
                          <p className="text-xs text-white/35">
                            {FRAMEWORK_LABELS[event.framework] ?? event.framework} · {formatDate(event.due_date)}
                          </p>
                        </div>
                        <div className={cn(
                          'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                          daysLeft <= 7 ? 'bg-red-500/15 text-red-400' :
                          daysLeft <= 30 ? 'bg-amber-500/15 text-amber-400' :
                          'bg-blue-500/15 text-blue-400',
                        )}>
                          {daysLeft}d left
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          ) : view === 'items' ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-white/40" />
                  <span className="text-sm text-white/50">Filter:</span>
                </div>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ComplianceStatus | 'all')}
                  className="input-dark rounded-lg py-1.5 text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="non_compliant">Non-Compliant</option>
                  <option value="needs_review">Needs Review</option>
                  <option value="compliant">Compliant</option>
                </select>
                <select
                  value={selectedFramework}
                  onChange={(e) => setSelectedFramework(e.target.value as ComplianceFramework | 'all')}
                  className="input-dark rounded-lg py-1.5 text-xs"
                >
                  <option value="all">All Frameworks</option>
                  {Object.entries(FRAMEWORK_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {isLoadingItems ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {(itemsData?.results ?? []).length > 0 ? (
                    itemsData!.results.map((item) => {
                      const statusCfg = STATUS_CONFIG[item.status]
                      const StatusIcon = statusCfg.icon
                      return (
                        <div key={item.id} className="doc-card">
                          <div className="flex items-center gap-4">
                            <StatusIcon className={cn(
                              'h-5 w-5 shrink-0',
                              item.status === 'compliant' && 'text-emerald-400',
                              item.status === 'non_compliant' && 'text-red-400',
                              item.status === 'needs_review' && 'text-amber-400',
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-white">{item.title}</p>
                                <span className={cn('text-xs', statusCfg.className)}>{statusCfg.label}</span>
                              </div>
                              <p className="text-xs text-white/35">
                                {FRAMEWORK_LABELS[item.framework] ?? item.framework}
                                {item.due_date && ` · Due ${formatDate(item.due_date)}`}
                              </p>
                            </div>
                            {item.is_overdue && (
                              <span className="badge-red shrink-0">Overdue</span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <ClipboardCheck className="mb-3 h-10 w-10 text-white/15" />
                      <p className="text-white/40">No compliance items found for selected filters.</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-8 text-center"
            >
              <Calendar className="mx-auto mb-3 h-10 w-10 text-white/20" />
              <h3 className="font-semibold text-white">Compliance Calendar</h3>
              <p className="mt-2 text-sm text-white/40">
                Interactive calendar view coming soon. All upcoming deadlines are shown in the Overview tab.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
