import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Shield,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import RiskBadge from '@/components/shared/RiskBadge'
import type { ContractAnalysis, RiskLevel } from '@/types'

// =====================================================================
// RISK GAUGE (SVG)
// =====================================================================
function RiskGauge({ score }: { score: number }) {
  const radius = 70
  const circumference = Math.PI * radius // Half circle
  const progress = (score / 100) * circumference

  const color =
    score >= 75
      ? '#EF4444'
      : score >= 50
        ? '#F97316'
        : score >= 25
          ? '#EAB308'
          : '#22C55E'

  return (
    <div className="relative flex flex-col items-center">
      <svg width="180" height="100" viewBox="0 0 180 100">
        {/* Background arc */}
        <path
          d="M 15 90 A 70 70 0 0 1 165 90"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <motion.path
          d="M 15 90 A 70 70 0 0 1 165 90"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
        />
        {/* Glow effect */}
        <motion.path
          d="M 15 90 A 70 70 0 0 1 165 90"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
          style={{ filter: `blur(4px)`, opacity: 0.5 }}
        />
      </svg>

      {/* Score text */}
      <div className="absolute bottom-0 text-center">
        <motion.p
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring' }}
          className="text-5xl font-black tabular-nums"
          style={{ color }}
        >
          {score}
        </motion.p>
        <p className="text-xs text-white/40 font-medium -mt-1">Risk Score</p>
      </div>
    </div>
  )
}

// =====================================================================
// KEY FINDING ITEM
// =====================================================================
function FindingItem({
  item,
  index,
}: {
  item: { title: string; description: string; severity: RiskLevel }
  index: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.08 }}
      className="flex gap-3"
    >
      <div className="flex flex-col items-center">
        <div
          className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
            item.severity === 'critical' || item.severity === 'high'
              ? 'bg-red-500'
              : item.severity === 'medium'
                ? 'bg-yellow-500'
                : 'bg-green-500'
          }`}
        />
        {index < 4 && <div className="flex-1 w-px bg-white/5 mt-1 min-h-[24px]" />}
      </div>
      <div className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-white/80">{item.title}</p>
          <RiskBadge level={item.severity} variant="pill" />
        </div>
        <p className="text-xs text-white/45 leading-relaxed">{item.description}</p>
      </div>
    </motion.div>
  )
}

// =====================================================================
// ANALYSIS PANEL
// =====================================================================
interface AnalysisPanelProps {
  analysis: ContractAnalysis
  onExport?: () => void
}

export default function AnalysisPanel({ analysis, onExport }: AnalysisPanelProps) {
  const topFindings = analysis.risk_flags.slice(0, 5).map((flag) => ({
    title: flag.title,
    description: flag.description,
    severity: flag.severity,
  }))

  const riskCategoryBreakdown = [
    { label: 'IP & Ownership', score: 45 },
    { label: 'Liability', score: 72 },
    { label: 'Termination', score: 38 },
    { label: 'Confidentiality', score: 20 },
    { label: 'Payment Terms', score: 60 },
  ]

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/3 border border-white/8 p-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white/90">{analysis.document_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/40">
                  {analysis.analysis_type.charAt(0).toUpperCase() + analysis.analysis_type.slice(1)} Analysis
                </span>
                {analysis.completed_at && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-xs text-white/30">
                      {format(new Date(analysis.completed_at), 'dd MMM yyyy, HH:mm')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {onExport && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white/60 hover:text-white/80 hover:bg-white/8 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              Export Report
            </motion.button>
          )}
        </div>

        {/* Summary Text */}
        <p className="text-sm text-white/60 leading-relaxed">{analysis.summary}</p>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mt-5">
          {[
            { label: 'Risk Flags', value: analysis.risk_flags.length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Clauses OK', value: analysis.clause_analysis.filter(c => c.risk_level === 'low').length, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Missing', value: analysis.missing_clauses.length, icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/10' },
            { label: 'Compliance', value: analysis.compliance_issues.length, icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`p-3 rounded-xl ${stat.bg} border border-white/5 text-center`}>
                <Icon className={`h-4 w-4 ${stat.color} mx-auto mb-1`} strokeWidth={1.5} />
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-white/40 mt-0.5">{stat.label}</p>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Risk Score Gauge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white/3 border border-white/8 p-6"
      >
        <h3 className="text-sm font-semibold text-white/70 mb-5">Overall Risk Score</h3>
        <div className="flex flex-col items-center">
          <RiskGauge score={analysis.overall_risk_score} />
          <div className="mt-4">
            <RiskBadge level={analysis.overall_risk_level} variant="large" animate />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="mt-6 space-y-3">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider">By Category</p>
          {riskCategoryBreakdown.map((cat, i) => (
            <div key={cat.label} className="flex items-center gap-3">
              <span className="text-xs text-white/50 w-28 shrink-0">{cat.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${cat.score}%` }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.07 }}
                  className={`h-full rounded-full ${
                    cat.score >= 65 ? 'bg-red-500' : cat.score >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                />
              </div>
              <span className="text-xs text-white/40 font-mono w-6 text-right">{cat.score}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Key Findings Timeline */}
      {topFindings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white/3 border border-white/8 p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Clock className="h-4 w-4 text-white/40" strokeWidth={1.5} />
            <h3 className="text-sm font-semibold text-white/70">Key Findings</h3>
          </div>
          <div>
            {topFindings.map((finding, i) => (
              <FindingItem key={i} item={finding} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white/3 border border-white/8 p-6"
        >
          <h3 className="text-sm font-semibold text-white/70 mb-4">Recommendations</h3>
          <ul className="space-y-2.5">
            {analysis.recommendations.map((rec, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                className="flex items-start gap-2.5"
              >
                <span className="h-5 w-5 flex items-center justify-center rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-white/60 leading-relaxed">{rec}</p>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  )
}
