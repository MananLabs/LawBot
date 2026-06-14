import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  FileText,
  MessageSquare,
  Wand2,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
} from 'lucide-react'

// =====================================================================
// FEATURES DATA
// =====================================================================
const features = [
  {
    icon: FileText,
    title: 'Contract Analysis',
    description:
      'Upload any contract and get instant AI-powered analysis. Identify risky clauses, missing protections, and actionable recommendations aligned with Indian law.',
    gradient: 'from-blue-500/20 to-blue-600/5',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    glow: 'shadow-blue-500/10',
  },
  {
    icon: MessageSquare,
    title: 'Legal Chat',
    description:
      'Chat with an AI that deeply understands Companies Act, SEBI, FEMA, GST, IBC & more. Get accurate answers with statutory citations in seconds.',
    gradient: 'from-cyan-500/20 to-cyan-600/5',
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    glow: 'shadow-cyan-500/10',
  },
  {
    icon: Wand2,
    title: 'Document Generation',
    description:
      'Generate 15+ types of legal documents — NDAs, Employment Agreements, Founders Agreements, Shareholder Agreements — customized for Indian jurisdiction.',
    gradient: 'from-purple-500/20 to-purple-600/5',
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    glow: 'shadow-purple-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Tracking',
    description:
      'Never miss a deadline. Track GST filings, MCA forms, ROC submissions, SEBI disclosures and labour law compliance with automated reminders.',
    gradient: 'from-green-500/20 to-green-600/5',
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10',
    border: 'border-green-500/20',
    glow: 'shadow-green-500/10',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Assessment',
    description:
      'Comprehensive risk scoring with detailed heatmaps across IP, liability, termination, confidentiality, and payment categories. Know your exposure before signing.',
    gradient: 'from-orange-500/20 to-orange-600/5',
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    glow: 'shadow-orange-500/10',
  },
  {
    icon: BookOpen,
    title: 'Legal Research',
    description:
      'Powered by a comprehensive corpus of Indian statutes, case law, and regulatory guidelines. Get cited references with every answer.',
    gradient: 'from-pink-500/20 to-pink-600/5',
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    glow: 'shadow-pink-500/10',
  },
]

// =====================================================================
// FEATURE CARD
// =====================================================================
function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const Icon = feature.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className={`group relative rounded-2xl bg-gradient-to-br ${feature.gradient} border ${feature.border} p-6 backdrop-blur-sm hover:shadow-xl ${feature.glow} transition-all duration-300 cursor-default`}
    >
      {/* Glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-white/0 group-hover:bg-white/2 transition-colors duration-300" />

      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-5`}
      >
        <Icon className={`h-6 w-6 ${feature.iconColor}`} strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-white/90 mb-3">{feature.title}</h3>

      {/* Description */}
      <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>

      {/* Corner accent */}
      <div className="absolute top-0 right-0 h-20 w-20 rounded-bl-3xl rounded-tr-2xl overflow-hidden opacity-30">
        <div className={`absolute inset-0 bg-gradient-to-bl ${feature.gradient} opacity-50`} />
      </div>
    </motion.div>
  )
}

// =====================================================================
// FEATURES SECTION
// =====================================================================
export default function FeaturesSection() {
  const headerRef = useRef<HTMLDivElement>(null)
  const headerInView = useInView(headerRef, { once: true })

  return (
    <section id="features" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-medium tracking-wider uppercase mb-6"
          >
            Capabilities
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-5"
          >
            Everything your legal team{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              needs
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-white/40 max-w-2xl mx-auto"
          >
            From startup founders to enterprise legal teams — LawBot handles the heavy lifting
            of Indian corporate law compliance and documentation.
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
