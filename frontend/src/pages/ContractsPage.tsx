import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scale,
  Home,
  MessageSquare,
  FileText,
  ClipboardCheck,
  FileSearch,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Download,
  Eye,
} from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { uploadDocument } from '@/api/documents'
import { analyzeContract, getContractAnalyses } from '@/api/contracts'
import { cn, formatDate, formatFileSize, getRiskBadgeClass } from '@/lib/utils'
import type { ContractAnalysis, RiskFlag } from '@/types'

function RiskFlagCard({ flag }: { flag: RiskFlag }) {
  const [expanded, setExpanded] = useState(false)

  const severityConfig = {
    critical: { className: 'risk-high', icon: '🚨', label: 'Critical' },
    high: { className: 'risk-high', icon: '⚠️', label: 'High Risk' },
    medium: { className: 'risk-medium', icon: '⚡', label: 'Medium Risk' },
    low: { className: 'risk-low', icon: '✅', label: 'Low Risk' },
    info: { className: '', icon: 'ℹ️', label: 'Info' },
  }

  const config = severityConfig[flag.severity] ?? severityConfig.info

  return (
    <div className={cn('rounded-xl border p-4 transition-all', config.className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{flag.title}</span>
              <span className={cn('badge-blue text-xs', getRiskBadgeClass(flag.severity))}>
                {config.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs opacity-70">{flag.category}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 opacity-50" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 border-t border-current/10 pt-3">
              <p className="text-sm opacity-80">{flag.description}</p>
              {flag.clause_text && (
                <div className="rounded-lg bg-black/20 p-3">
                  <p className="mb-1 text-xs font-medium opacity-60">Problematic Clause:</p>
                  <p className="text-xs italic opacity-70">"{flag.clause_text}"</p>
                </div>
              )}
              <div className="rounded-lg bg-emerald-500/10 p-3">
                <p className="mb-1 text-xs font-medium text-emerald-300">Recommendation:</p>
                <p className="text-xs text-emerald-200/80">{flag.recommendation}</p>
              </div>
              {flag.legal_reference && (
                <p className="text-xs opacity-50">Reference: {flag.legal_reference}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AnalysisPanel({ analysis }: { analysis: ContractAnalysis }) {
  const riskColor =
    analysis.overall_risk_score >= 70
      ? 'text-red-400'
      : analysis.overall_risk_score >= 40
        ? 'text-amber-400'
        : 'text-emerald-400'

  return (
    <div className="space-y-6">
      {/* Score overview */}
      <div className="glass-card rounded-xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Overall Risk Assessment</h3>
          <div className={cn('text-3xl font-bold', riskColor)}>
            {analysis.overall_risk_score}/100
          </div>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${analysis.overall_risk_score}%`,
              background:
                analysis.overall_risk_score >= 70
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : analysis.overall_risk_score >= 40
                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                    : 'linear-gradient(90deg, #10b981, #059669)',
            }}
          />
        </div>
        <p className="mt-4 text-sm text-white/65 leading-relaxed">{analysis.summary}</p>
      </div>

      {/* Risk Flags */}
      {analysis.risk_flags.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-white">
            Risk Flags ({analysis.risk_flags.length})
          </h3>
          <div className="space-y-2">
            {analysis.risk_flags.map((flag) => (
              <RiskFlagCard key={flag.id} flag={flag} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="mb-3 font-semibold text-white">Recommendations</h3>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/65">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function ContractsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [activeAnalysis, setActiveAnalysis] = useState<ContractAnalysis | null>(null)

  const { data: analyses = { results: [], count: 0 }, isLoading } = useQuery({
    queryKey: ['contract-analyses'],
    queryFn: () => getContractAnalyses({ page_size: 10 }),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadDocument(file, { type: 'contract' }, setUploadProgress),
    onSuccess: async (document) => {
      toast.success('Document uploaded. Starting analysis...')
      const analysis = await analyzeContract({
        document_id: document.id,
        analysis_type: 'standard',
      })
      setActiveAnalysis(analysis)
      toast.success('Contract analysis complete!')
    },
    onError: () => {
      toast.error('Failed to upload document. Please try again.')
      setUploadProgress(0)
    },
  })

  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(pdf|docx|doc)$/i)) {
      toast.error('Please upload a PDF or Word document.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50MB.')
      return
    }
    setUploadedFile(file)
    uploadMutation.mutate(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

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
          <div className="sidebar-item active"><FileSearch className="h-4 w-4" />Contracts</div>
          <Link to="/generate" className="sidebar-item"><FileText className="h-4 w-4" />Generate</Link>
          <Link to="/compliance" className="sidebar-item"><ClipboardCheck className="h-4 w-4" />Compliance</Link>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Contract Analysis</h1>
            <p className="mt-1 text-white/45">
              Upload a contract to get AI-powered risk analysis, clause review, and recommendations.
            </p>
          </div>

          {/* Upload Zone */}
          {!uploadedFile && !activeAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'cursor-pointer rounded-2xl border-2 border-dashed p-16 text-center transition-all duration-300',
                  dragOver
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                    : 'border-white/10 hover:border-blue-500/40 hover:bg-white/[0.02]',
                )}
              >
                <Upload className="mx-auto mb-4 h-10 w-10 text-white/25" />
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Drop your contract here
                </h3>
                <p className="text-sm text-white/40">
                  Supports PDF, DOCX, DOC · Max 50MB
                </p>
                <div className="mt-6">
                  <span className="btn-outline rounded-lg px-5 py-2 text-sm">Browse Files</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
              </div>
            </motion.div>
          )}

          {/* Upload progress */}
          {uploadMutation.isPending && uploadedFile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-8 glass-card rounded-xl p-6"
            >
              <div className="flex items-center gap-4">
                <Loader2 className="h-6 w-6 shrink-0 animate-spin text-blue-400" />
                <div className="flex-1">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-white">{uploadedFile.name}</span>
                    <span className="text-white/45">{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    {uploadProgress === 100 ? 'Analyzing contract with AI...' : 'Uploading document...'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Analysis result */}
          {activeAnalysis && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Analysis: {activeAnalysis.document_name}</h2>
                <div className="flex items-center gap-2">
                  <button className="btn-outline flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs">
                    <Download className="h-3.5 w-3.5" />
                    Export PDF
                  </button>
                  <button
                    onClick={() => { setActiveAnalysis(null); setUploadedFile(null); setUploadProgress(0) }}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-white/5 hover:text-white/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <AnalysisPanel analysis={activeAnalysis} />
            </div>
          )}

          {/* Past Analyses */}
          {analyses.results.length > 0 && (
            <div>
              <h2 className="mb-4 font-semibold text-white">Past Analyses</h2>
              <div className="space-y-3">
                {analyses.results.map((analysis) => (
                  <div
                    key={analysis.id}
                    onClick={() => setActiveAnalysis(analysis)}
                    className="doc-card"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileSearch className="h-5 w-5 shrink-0 text-cyan-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{analysis.document_name}</p>
                          <p className="text-xs text-white/35">{formatDate(analysis.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={cn(
                          'text-sm font-bold',
                          analysis.overall_risk_score >= 70 ? 'text-red-400' :
                          analysis.overall_risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                        )}>
                          {analysis.overall_risk_score}/100
                        </div>
                        <Eye className="h-4 w-4 text-white/25" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
