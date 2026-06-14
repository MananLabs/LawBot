import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  Scale,
  Home,
  MessageSquare,
  FileText,
  ClipboardCheck,
  FileSearch,
  ArrowRight,
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getDocumentTemplates, generateDocument } from '@/api/generator'
import { cn } from '@/lib/utils'
import type { DocumentTemplate, GeneratedDocument } from '@/types'

const TEMPLATE_ICONS: Record<string, string> = {
  nda: '🔏',
  employment_agreement: '👤',
  service_agreement: '🤝',
  founders_agreement: '🚀',
  shareholders_agreement: '📊',
  term_sheet: '📋',
  mou: '📝',
  vendor_agreement: '🏪',
  consulting_agreement: '💼',
  lease_agreement: '🏠',
  loan_agreement: '💰',
  partnership_deed: '🤲',
  software_license: '💻',
  privacy_policy: '🛡️',
  terms_of_service: '📜',
  franchise_agreement: '🏬',
}

export default function GeneratePage() {
  const [step, setStep] = useState<'select' | 'form' | 'generating' | 'done'>('select')
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => getDocumentTemplates(),
    staleTime: 10 * 60 * 1000,
  })

  const generateMutation = useMutation({
    mutationFn: generateDocument,
    onMutate: () => setStep('generating'),
    onSuccess: (doc) => {
      setGeneratedDoc(doc)
      setStep('done')
      toast.success('Document generated successfully!')
    },
    onError: () => {
      setStep('form')
      toast.error('Failed to generate document. Please try again.')
    },
  })

  const templateInfo = templates.find((t) => t.id === selectedTemplate)

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
          <div className="sidebar-item active"><FileText className="h-4 w-4" />Generate</div>
          <Link to="/compliance" className="sidebar-item"><ClipboardCheck className="h-4 w-4" />Compliance</Link>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-sm text-white/40">
              {step !== 'select' && (
                <button
                  onClick={() => {
                    if (step === 'form') setStep('select')
                    if (step === 'done') setStep('form')
                  }}
                  className="flex items-center gap-1 hover:text-white/70 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">Generate Legal Document</h1>
            <p className="mt-1 text-white/45">
              Choose a template and answer a few questions to get a professionally drafted document.
            </p>

            {/* Step indicator */}
            <div className="mt-4 flex items-center gap-3">
              {(['select', 'form', 'done'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-all',
                      step === s || (step === 'generating' && s === 'form')
                        ? 'bg-blue-500 text-white'
                        : s === 'done' && step === 'done'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/10 text-white/30',
                    )}
                  >
                    {s === 'done' && step === 'done' ? '✓' : i + 1}
                  </div>
                  <span className={cn('text-xs', step === s ? 'text-white' : 'text-white/35')}>
                    {s === 'select' ? 'Choose Template' : s === 'form' ? 'Fill Details' : 'Download'}
                  </span>
                  {i < 2 && <div className="h-px w-8 bg-white/10" />}
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1: Select Template */}
            {step === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                {isLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.length > 0 ? templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template.id)
                          setStep('form')
                        }}
                        className="group text-left glass-card rounded-xl p-5 transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/5"
                      >
                        <div className="mb-3 text-2xl">
                          {TEMPLATE_ICONS[template.id] ?? '📄'}
                        </div>
                        <div className="mb-1 font-semibold text-white">{template.name}</div>
                        <div className="mb-3 text-xs text-white/45 line-clamp-2">{template.description}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/30">{template.estimated_time}</span>
                          {template.is_premium && (
                            <span className="badge-purple text-xs">Pro</span>
                          )}
                        </div>
                        <ArrowRight className="mt-2 h-4 w-4 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-blue-400" />
                      </button>
                    )) : (
                      // Fallback cards when API isn't available
                      ['NDA', 'Employment Agreement', 'Service Agreement', 'Founders Agreement', 'MOU', 'Shareholders Agreement'].map((name, i) => (
                        <button
                          key={name}
                          onClick={() => {
                            setSelectedTemplate('nda' as DocumentTemplate)
                            setStep('form')
                          }}
                          className="group text-left glass-card rounded-xl p-5 transition-all duration-200 hover:border-blue-500/30 hover:bg-blue-500/5"
                        >
                          <div className="mb-3 text-2xl">{['🔏','👤','🤝','🚀','📝','📊'][i]}</div>
                          <div className="mb-1 font-semibold text-white">{name}</div>
                          <div className="text-xs text-white/45">Generate a customized {name.toLowerCase()}</div>
                          <ArrowRight className="mt-3 h-4 w-4 text-white/20 transition-all group-hover:translate-x-1 group-hover:text-blue-400" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: Fill Form */}
            {step === 'form' && templateInfo && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
              >
                <DocumentForm
                  template={templateInfo}
                  onSubmit={(fields) => {
                    generateMutation.mutate({
                      template: selectedTemplate!,
                      fields,
                      jurisdiction: 'India',
                    })
                  }}
                  isSubmitting={generateMutation.isPending}
                />
              </motion.div>
            )}

            {/* STEP 2b: Generating */}
            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24"
              >
                <div className="relative mb-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20">
                    <Sparkles className="h-10 w-10 text-blue-400 animate-pulse" />
                  </div>
                  <div className="absolute -inset-2 rounded-3xl border border-blue-500/20 animate-ping opacity-30" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Drafting your document...</h3>
                <p className="text-white/40">AI is generating a customized legal document for you.</p>
                <div className="mt-6 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="typing-dot"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: Done */}
            {step === 'done' && generatedDoc && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="glass-card mx-auto max-w-md rounded-2xl p-10">
                  <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-white">Document Ready!</h2>
                  <p className="mb-6 text-sm text-white/50">
                    Your document has been generated and is ready to download.
                  </p>

                  <div className="space-y-3">
                    <button className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold">
                      <Download className="h-4 w-4" />
                      Download as DOCX
                    </button>
                    <button className="btn-outline flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold">
                      <Download className="h-4 w-4" />
                      Download as PDF
                    </button>
                  </div>

                  <button
                    onClick={() => { setStep('select'); setGeneratedDoc(null); setSelectedTemplate(null) }}
                    className="mt-4 text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    Generate another document
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

// Simple form component for document fields
function DocumentForm({
  template,
  onSubmit,
  isSubmitting,
}: {
  template: { name: string; description: string; fields: { key: string; label: string; type: string; required: boolean; placeholder?: string }[] }
  onSubmit: (fields: Record<string, unknown>) => void
  isSubmitting: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>()

  const handleFormSubmit = (data: Record<string, string>) => {
    onSubmit(data)
  }

  // If no fields defined, show basic form
  const fields = template.fields?.length > 0 ? template.fields : [
    { key: 'party_1_name', label: 'Party 1 Name', type: 'text', required: true, placeholder: 'Full legal name' },
    { key: 'party_2_name', label: 'Party 2 Name', type: 'text', required: true, placeholder: 'Full legal name' },
    { key: 'effective_date', label: 'Effective Date', type: 'date', required: true },
    { key: 'jurisdiction', label: 'Governing Law Jurisdiction', type: 'text', required: false, placeholder: 'e.g., Maharashtra, India' },
    { key: 'special_terms', label: 'Special Terms or Conditions', type: 'textarea', required: false, placeholder: 'Any specific clauses or conditions...' },
  ]

  return (
    <div className="glass-card rounded-xl p-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">{template.name} Details</h2>
        <p className="mt-1 text-sm text-white/45">{template.description}</p>
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1.5 block text-sm font-medium text-white/65">
              {field.label}
              {field.required && <span className="ml-1 text-red-400">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                {...register(field.key, { required: field.required })}
                placeholder={field.placeholder}
                rows={3}
                className="input-dark w-full resize-none"
              />
            ) : (
              <input
                {...register(field.key, { required: field.required })}
                type={field.type === 'date' ? 'date' : 'text'}
                placeholder={field.placeholder}
                className="input-dark w-full"
              />
            )}
          </div>
        ))}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Document
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
