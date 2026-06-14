import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Check, Zap, Crown, Building2 } from 'lucide-react'
import { Link } from 'react-router-dom'

// =====================================================================
// PRICING DATA
// =====================================================================
const plans = [
  {
    name: 'Starter',
    price: 'Free',
    priceDetail: 'Forever',
    description: 'Perfect for individuals exploring AI legal assistance',
    icon: Zap,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    cta: 'Get Started Free',
    ctaHref: '/register',
    ctaStyle: 'bg-white/10 border border-white/15 text-white hover:bg-white/15',
    popular: false,
    features: [
      '10 Chat queries/month',
      '2 Contract analyses/month',
      '1 Document generation/month',
      'Basic compliance checklist',
      'Email support',
    ],
    notIncluded: [
      'Deep analysis',
      'Bulk processing',
      'API access',
      'Team collaboration',
    ],
    gradient: 'from-blue-500/5 to-transparent',
    border: 'border-white/8',
  },
  {
    name: 'Professional',
    price: '₹4,999',
    priceDetail: '/month',
    description: 'For founders, lawyers and growing companies',
    icon: Crown,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    cta: 'Start 14-Day Trial',
    ctaHref: '/register',
    ctaStyle:
      'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-xl shadow-blue-500/30',
    popular: true,
    features: [
      'Unlimited Chat queries',
      '50 Contract analyses/month',
      '20 Document generations/month',
      'Full compliance tracking',
      'Risk assessment reports',
      'PDF & DOCX export',
      'Priority email support',
    ],
    notIncluded: ['API access', 'Team collaboration'],
    gradient: 'from-blue-500/15 via-purple-500/10 to-cyan-500/10',
    border: 'border-blue-500/30',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    priceDetail: 'Contact us',
    description: 'For law firms, large corporations & legal teams',
    icon: Building2,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@lawbot.in',
    ctaStyle: 'bg-white/8 border border-white/15 text-white hover:bg-white/12',
    popular: false,
    features: [
      'Everything in Professional',
      'Unlimited everything',
      'Team collaboration (up to 50)',
      'API access with SLA',
      'Custom document templates',
      'White-label options',
      'Dedicated account manager',
      'On-premise deployment option',
    ],
    notIncluded: [],
    gradient: 'from-yellow-500/8 to-transparent',
    border: 'border-yellow-500/15',
  },
]

// =====================================================================
// PRICING SECTION
// =====================================================================
export default function PricingSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section id="pricing" ref={ref} className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/5 to-transparent" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-medium tracking-wider uppercase mb-6"
          >
            Pricing
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-5"
          >
            Simple, transparent{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              pricing
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 }}
            className="text-white/40 text-lg max-w-xl mx-auto"
          >
            Start free, scale as you grow. All plans include Indian law coverage.
          </motion.p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, index) => {
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={`relative rounded-2xl bg-gradient-to-br ${plan.gradient} border ${plan.border} p-7 backdrop-blur-sm overflow-hidden ${
                  plan.popular ? 'md:-mt-4 md:mb-4' : ''
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500" />
                )}
                {plan.popular && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                {/* Plan Icon & Name */}
                <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center mb-5`}>
                  <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                </div>

                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-white/40 mb-6">{plan.description}</p>

                {/* Price */}
                <div className="flex items-end gap-1.5 mb-7">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-sm text-white/40 mb-1">{plan.priceDetail}</span>
                </div>

                {/* CTA */}
                <Link to={plan.ctaHref}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mb-7 ${plan.ctaStyle}`}
                  >
                    {plan.cta}
                  </motion.button>
                </Link>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-white/70">{feature}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 opacity-30">
                      <svg
                        className="h-4 w-4 text-white/40 shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span className="text-sm text-white/40">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-white/30 mt-10"
        >
          All prices in INR. GST applicable. Annual billing saves 20%. No hidden fees.
        </motion.p>
      </div>
    </section>
  )
}
