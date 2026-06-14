import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Upload, Cpu, Lightbulb } from 'lucide-react'

// =====================================================================
// STEPS DATA
// =====================================================================
const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload or Ask',
    description:
      'Upload a contract PDF, paste legal text, or simply type your legal question. LawBot accepts all major document formats.',
    highlight: 'PDF, DOCX, TXT supported',
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    glow: 'shadow-blue-500/20',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'AI Analyzes',
    description:
      'Our AI trained on Indian statutes, regulations, and case law processes your request — extracting clauses, checking compliance, assessing risks.',
    highlight: 'Powered by advanced LLMs',
    gradient: 'from-purple-500 to-purple-600',
    iconBg: 'bg-purple-500/15',
    iconColor: 'text-purple-400',
    glow: 'shadow-purple-500/20',
  },
  {
    number: '03',
    icon: Lightbulb,
    title: 'Get Insights',
    description:
      'Receive comprehensive analysis with risk scores, specific recommendations, statutory references, and ready-to-use document improvements.',
    highlight: 'Actionable, cited advice',
    gradient: 'from-cyan-500 to-cyan-600',
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-400',
    glow: 'shadow-cyan-500/20',
  },
]

// =====================================================================
// HOW IT WORKS SECTION
// =====================================================================
export default function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="how-it-works" ref={ref} className="py-24 relative">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-medium tracking-wider uppercase mb-6"
          >
            Process
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-5"
          >
            How{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              LawBot
            </span>{' '}
            works
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-lg max-w-xl mx-auto"
          >
            From upload to insight in under 60 seconds
          </motion.p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting Lines (desktop) */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-px">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="h-px bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-cyan-500/40 origin-left"
              style={{ marginLeft: '20%', marginRight: '20%' }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  className="relative"
                >
                  {/* Step Card */}
                  <div className="relative p-8 rounded-2xl bg-white/3 border border-white/8 backdrop-blur-sm hover:bg-white/5 transition-all duration-300 group">
                    {/* Number badge */}
                    <div
                      className={`absolute -top-4 left-8 px-3 py-1 rounded-full bg-gradient-to-r ${step.gradient} text-white text-xs font-bold shadow-lg ${step.glow}`}
                    >
                      Step {step.number}
                    </div>

                    {/* Icon */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      className={`w-14 h-14 rounded-2xl ${step.iconBg} flex items-center justify-center mb-6 mt-4`}
                    >
                      <Icon className={`h-7 w-7 ${step.iconColor}`} strokeWidth={1.5} />
                    </motion.div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed mb-5">
                      {step.description}
                    </p>

                    {/* Highlight Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${step.gradient} text-white text-xs font-medium opacity-80`}
                    >
                      {step.highlight}
                    </div>

                    {/* Arrow for desktop */}
                    {index < steps.length - 1 && (
                      <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 z-20">
                        <motion.div
                          initial={{ opacity: 0, x: -8 }}
                          animate={isInView ? { opacity: 1, x: 0 } : {}}
                          transition={{ delay: 0.6 + index * 0.2 }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0A0A0F] border border-white/10"
                        >
                          <svg
                            className="h-4 w-4 text-white/40"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </motion.div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center mt-16"
        >
          <p className="text-white/40 text-sm mb-4">
            Ready to experience AI-powered legal intelligence?
          </p>
          <a href="/register">
            <motion.button
              whileHover={{ scale: 1.04, boxShadow: '0 0 30px rgba(59,130,246,0.3)' }}
              whileTap={{ scale: 0.96 }}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/25"
            >
              Try It Free — No Credit Card Required
            </motion.button>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
