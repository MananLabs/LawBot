import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentTemplate, DocumentTemplate_Info, TemplateField } from '@/types'
import TemplateCard from './TemplateCard'

// =====================================================================
// WIZARD STEPS
// =====================================================================
const STEPS = [
  { id: 1, label: 'Select Template', description: 'Choose the type of legal document' },
  { id: 2, label: 'Fill Details', description: 'Provide the required information' },
  { id: 3, label: 'Preview & Generate', description: 'Review and generate your document' },
]

// =====================================================================
// MOCK TEMPLATES
// =====================================================================
const MOCK_TEMPLATES: DocumentTemplate_Info[] = [
  {
    id: 'nda',
    name: 'Non-Disclosure Agreement',
    description: 'Protect confidential business information shared between parties',
    category: 'Confidentiality',
    estimated_time: '~5 mins',
    acts_covered: ['Indian Contract Act, 1872', 'IT Act, 2000'],
    is_premium: false,
    fields: [
      { key: 'party_a_name', label: 'Disclosing Party Name', type: 'text', required: true, placeholder: 'Company or individual name' },
      { key: 'party_b_name', label: 'Receiving Party Name', type: 'text', required: true },
      { key: 'effective_date', label: 'Effective Date', type: 'date', required: true },
      { key: 'duration_years', label: 'Duration (Years)', type: 'number', required: true, min_value: 1, max_value: 10 },
      { key: 'jurisdiction', label: 'Jurisdiction', type: 'select', required: true, options: [
        { label: 'Mumbai', value: 'mumbai' },
        { label: 'Delhi', value: 'delhi' },
        { label: 'Bangalore', value: 'bangalore' },
      ]},
      { key: 'purpose', label: 'Purpose of Disclosure', type: 'textarea', required: true, placeholder: 'Describe the business purpose...' },
    ],
  },
  {
    id: 'employment_agreement',
    name: 'Employment Agreement',
    description: 'Comprehensive employment contract compliant with Indian labour laws',
    category: 'Employment',
    estimated_time: '~10 mins',
    acts_covered: ['Shops & Establishments Act', 'Factories Act', 'Payment of Wages Act'],
    is_premium: false,
    fields: [
      { key: 'employer_name', label: 'Employer Name', type: 'text', required: true },
      { key: 'employee_name', label: 'Employee Name', type: 'text', required: true },
      { key: 'designation', label: 'Designation / Role', type: 'text', required: true },
      { key: 'ctc', label: 'Annual CTC (₹)', type: 'number', required: true },
      { key: 'joining_date', label: 'Date of Joining', type: 'date', required: true },
      { key: 'notice_period', label: 'Notice Period (Days)', type: 'number', required: true },
    ],
  },
  {
    id: 'founders_agreement',
    name: "Founders' Agreement",
    description: 'Define roles, equity, vesting and IP ownership among co-founders',
    category: 'Startup',
    estimated_time: '~15 mins',
    acts_covered: ['Companies Act, 2013', 'Indian Contract Act, 1872'],
    is_premium: true,
    fields: [
      { key: 'company_name', label: 'Company Name', type: 'text', required: true },
      { key: 'founders', label: 'Number of Founders', type: 'number', required: true, min_value: 2, max_value: 10 },
      { key: 'vesting_period', label: 'Vesting Period (Years)', type: 'number', required: true },
    ],
  },
  {
    id: 'service_agreement',
    name: 'Service Agreement',
    description: 'Contract between service provider and client',
    category: 'Commercial',
    estimated_time: '~8 mins',
    acts_covered: ['Indian Contract Act, 1872', 'GST Act'],
    is_premium: false,
    fields: [
      { key: 'provider_name', label: 'Service Provider Name', type: 'text', required: true },
      { key: 'client_name', label: 'Client Name', type: 'text', required: true },
      { key: 'service_description', label: 'Services Description', type: 'textarea', required: true },
      { key: 'fee', label: 'Fee Amount (₹)', type: 'number', required: true },
    ],
  },
  {
    id: 'shareholders_agreement',
    name: 'Shareholders Agreement',
    description: 'Govern relationship between company shareholders',
    category: 'Corporate',
    estimated_time: '~20 mins',
    acts_covered: ['Companies Act, 2013', 'SEBI Regulations'],
    is_premium: true,
    fields: [],
  },
  {
    id: 'mou',
    name: 'Memorandum of Understanding',
    description: 'Non-binding agreement expressing intent to work together',
    category: 'Commercial',
    estimated_time: '~5 mins',
    acts_covered: ['Indian Contract Act, 1872'],
    is_premium: false,
    fields: [],
  },
]

// =====================================================================
// STEP INDICATOR
// =====================================================================
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const isDone = currentStep > step.id
        const isActive = currentStep === step.id

        return (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <motion.div
              animate={{
                backgroundColor: isDone
                  ? 'rgb(59, 130, 246)'
                  : isActive
                    ? 'rgb(59, 130, 246)'
                    : 'rgba(255,255,255,0.05)',
                borderColor: isDone || isActive ? 'rgb(59, 130, 246)' : 'rgba(255,255,255,0.1)',
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors"
            >
              {isDone ? (
                <Check className="h-4 w-4 text-white" />
              ) : (
                <span className={cn('text-sm font-bold', isActive ? 'text-white' : 'text-white/30')}>
                  {step.id}
                </span>
              )}

              {/* Label below */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
                <p className={cn('text-xs font-semibold', isActive ? 'text-white/90' : isDone ? 'text-blue-400' : 'text-white/30')}>
                  {step.label}
                </p>
              </div>
            </motion.div>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <motion.div
                animate={{
                  backgroundColor: currentStep > step.id ? 'rgb(59, 130, 246)' : 'rgba(255,255,255,0.08)',
                }}
                className="h-0.5 w-20 transition-colors"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// =====================================================================
// STEP 2: FORM FIELDS
// =====================================================================
function TemplateForm({
  template,
  values,
  onChange,
}: {
  template: DocumentTemplate_Info
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white/90 mb-1">{template.name}</h3>
        <p className="text-sm text-white/45">{template.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {template.fields.map((field: TemplateField) => (
          <div
            key={field.key}
            className={cn(
              field.type === 'textarea' ? 'md:col-span-2' : '',
            )}
          >
            <label className="block text-xs font-semibold text-white/60 mb-2">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                value={String(values[field.key] ?? '')}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-blue-500/40 focus:bg-white/5 transition-all resize-none"
              />
            ) : field.type === 'select' ? (
              <select
                value={String(values[field.key] ?? '')}
                onChange={(e) => onChange(field.key, e.target.value)}
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 outline-none focus:border-blue-500/40 transition-all appearance-none"
              >
                <option value="" className="bg-[#12121A]">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#12121A]">
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                value={String(values[field.key] ?? '')}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                min={field.min_value}
                max={field.max_value}
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-blue-500/40 focus:bg-white/5 transition-all"
              />
            )}

            {field.description && (
              <p className="mt-1 text-[10px] text-white/30">{field.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// =====================================================================
// DOCUMENT WIZARD
// =====================================================================
interface DocumentWizardProps {
  onGenerate?: (template: DocumentTemplate, fields: Record<string, unknown>) => void
  className?: string
}

export default function DocumentWizard({ onGenerate, className }: DocumentWizardProps) {
  const [step, setStep] = useState(1)
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate_Info | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({})

  const handleFieldChange = (key: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
    else if (selectedTemplate) {
      onGenerate?.(selectedTemplate.id, fieldValues)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const canProceed =
    step === 1 ? !!selectedTemplate :
    step === 2 ? (selectedTemplate?.fields.filter(f => f.required).every(f => fieldValues[f.key]) ?? true) :
    true

  return (
    <div className={cn('space-y-6', className)}>
      {/* Step Indicator */}
      <div className="pb-8">
        <StepIndicator currentStep={step} />
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-white/90 mb-2">Select a Template</h2>
              <p className="text-sm text-white/45 mb-6">Choose the type of legal document you want to generate</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_TEMPLATES.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    onSelect={() => setSelectedTemplate(template)}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && selectedTemplate && (
            <TemplateForm
              template={selectedTemplate}
              values={fieldValues}
              onChange={handleFieldChange}
            />
          )}

          {step === 3 && selectedTemplate && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white/90 mb-1">Ready to Generate</h2>
                <p className="text-sm text-white/45">Review your details and generate the document</p>
              </div>
              <div className="rounded-2xl bg-white/3 border border-white/8 p-5">
                <h3 className="text-sm font-bold text-white/80 mb-4">{selectedTemplate.name}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(fieldValues).map(([key, val]) => {
                    const field = selectedTemplate.fields.find(f => f.key === key)
                    return field ? (
                      <div key={key}>
                        <p className="text-[10px] text-white/35 font-semibold uppercase tracking-wider mb-0.5">
                          {field.label}
                        </p>
                        <p className="text-sm text-white/70 truncate">{String(val)}</p>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 disabled:opacity-0 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <motion.button
          whileHover={canProceed ? { scale: 1.03 } : undefined}
          whileTap={canProceed ? { scale: 0.97 } : undefined}
          onClick={handleNext}
          disabled={!canProceed}
          className={cn(
            'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all',
            canProceed
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
              : 'bg-white/5 text-white/25 cursor-not-allowed',
          )}
        >
          {step === 3 ? 'Generate Document' : 'Continue'}
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  )
}
