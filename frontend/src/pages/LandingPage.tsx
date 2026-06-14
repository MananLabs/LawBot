import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Scale,
  FileText,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Star,
  ChevronRight,
  MessageSquare,
  FileSearch,
  ClipboardCheck,
} from 'lucide-react'

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'AI Legal Counsel',
    description:
      'Ask complex questions about Indian corporate law and get instant, citation-backed answers from our AI trained on ICA, SEBI, FEMA, Companies Act 2013, and more.',
    color: 'blue',
  },
  {
    icon: FileSearch,
    title: 'Contract Intelligence',
    description:
      'Upload any contract and get a comprehensive risk analysis, clause-by-clause breakdown, missing clause detection, and AI-suggested alternatives.',
    color: 'cyan',
  },
  {
    icon: FileText,
    title: 'Document Drafting',
    description:
      'Generate legally sound documents — NDAs, Founders Agreements, Employment Contracts, Term Sheets — customized to your specific needs in minutes.',
    color: 'purple',
  },
  {
    icon: ClipboardCheck,
    title: 'Compliance Tracker',
    description:
      'Stay on top of MCA filings, SEBI disclosures, GST deadlines, and regulatory requirements. Get proactive alerts before penalties.',
    color: 'blue',
  },
  {
    icon: Shield,
    title: 'Risk Assessment',
    description:
      'Identify contractual risks, financial exposure, and legal liabilities before they become problems. AI-powered due diligence at scale.',
    color: 'cyan',
  },
  {
    icon: Zap,
    title: 'Instant Insights',
    description:
      'Analyze thousands of pages in seconds. Search across all your legal documents simultaneously with semantic search.',
    color: 'purple',
  },
]

const STATS = [
  { value: '50,000+', label: 'Legal Queries Answered' },
  { value: '10,000+', label: 'Contracts Analyzed' },
  { value: '500+', label: 'Companies Onboarded' },
  { value: '99.2%', label: 'Accuracy Rate' },
]

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'General Counsel, TechScale India',
    avatar: 'PS',
    text: 'LawBot reduced our contract review time by 80%. What used to take our team 3 days now takes 2 hours. The risk flagging is incredibly accurate.',
  },
  {
    name: 'Rajesh Kumar',
    role: 'Founder, FinVenture Startup',
    avatar: 'RK',
    text: "As a founder without in-house legal, LawBot is a game-changer. I can draft NDAs and review investor agreements confidently. It's like having a senior lawyer on speed-dial.",
  },
  {
    name: 'Ananya Mehta',
    role: 'Partner, Mehta & Associates',
    avatar: 'AM',
    text: 'The compliance tracking feature alone is worth the subscription. We never miss an MCA deadline now and the regulatory update alerts have saved us from several close calls.',
  },
]

const PRICING = [
  {
    name: 'Starter',
    price: '₹4,999',
    period: '/month',
    description: 'Perfect for solo founders and small teams',
    features: [
      '100 AI queries/month',
      '10 documents/month',
      '5 contract analyses',
      'Basic compliance alerts',
      'Email support',
    ],
    highlight: false,
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    price: '₹14,999',
    period: '/month',
    description: 'Ideal for growing legal teams and corporates',
    features: [
      'Unlimited AI queries',
      '50 documents/month',
      'Unlimited contract analyses',
      'Deep risk assessment',
      'Compliance calendar',
      'Priority support',
      'API access',
    ],
    highlight: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For law firms and large organizations',
    features: [
      'Unlimited everything',
      'Custom AI training',
      'White-label options',
      'Dedicated CSM',
      'SLA guarantee',
      'On-premise option',
      'Advanced analytics',
    ],
    highlight: false,
    cta: 'Contact Sales',
  },
]

function FadeIn({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark overflow-x-hidden">
      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-dark/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <Scale className="h-4 w-4 text-white" />
              </div>
              <span className="gradient-text text-lg font-bold tracking-tight">LawBot</span>
            </div>

            <div className="hidden items-center gap-8 md:flex">
              {['Features', 'Pricing', 'About', 'Blog'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-sm font-medium text-white/60 transition-colors hover:text-white"
                >
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden text-sm font-medium text-white/70 transition-colors hover:text-white md:block"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              >
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Background effects */}
        <div className="absolute inset-0 mesh-bg" />
        <div className="absolute inset-0 dot-bg opacity-20" />

        {/* Blue glow orb */}
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute right-1/3 top-1/3 h-64 w-64 rounded-full bg-purple-500/8 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-24 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-blue-300">Trusted by 500+ Indian companies</span>
            <ChevronRight className="h-3.5 w-3.5 text-blue-400" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl"
          >
            Your AI{' '}
            <span className="gradient-text-full">Indian Corporate</span>
            <br />
            Law Copilot
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mb-10 max-w-2xl text-lg text-white/55 md:text-xl"
          >
            Draft contracts. Analyze legal risks. Ensure compliance. Get instant answers on Companies
            Act, SEBI, FEMA, GST, and more — powered by AI trained on Indian law.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link
              to="/register"
              className="btn-primary flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="btn-outline flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold"
            >
              Watch Demo
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/35"
          >
            {['No credit card required', 'Free 14-day trial', 'SOC 2 compliant', 'Indian data residency'].map(
              (item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {item}
                </div>
              ),
            )}
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-white/5 bg-white/[0.02] py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.1} className="text-center">
                <div className="gradient-text text-4xl font-bold">{stat.value}</div>
                <div className="mt-1 text-sm text-white/45">{stat.label}</div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="mb-16 text-center">
            <div className="badge-blue mb-4 inline-flex">Core Features</div>
            <h2 className="text-4xl font-bold text-white">
              Everything your legal team needs
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              From contract drafting to compliance tracking, LawBot covers the full spectrum of
              Indian corporate legal work.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon
              const colorMap = {
                blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              }
              return (
                <FadeIn key={feature.title} delay={i * 0.08}>
                  <div className="card-base group h-full">
                    <div
                      className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${colorMap[feature.color as keyof typeof colorMap]}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                  </div>
                </FadeIn>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="border-y border-white/5 bg-white/[0.015] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="mb-16 text-center">
            <div className="badge-cyan mb-4 inline-flex">Testimonials</div>
            <h2 className="text-4xl font-bold text-white">Loved by legal teams</h2>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <div className="glass-card rounded-xl p-6 h-full">
                  <div className="mb-4 flex">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="mb-6 text-sm text-white/65 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{t.name}</div>
                      <div className="text-xs text-white/40">{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="mb-16 text-center">
            <div className="badge-purple mb-4 inline-flex">Pricing</div>
            <h2 className="text-4xl font-bold text-white">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-white/50">
              Start free. Upgrade as you grow. Cancel anytime.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-3">
            {PRICING.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <div
                  className={`relative rounded-2xl p-8 transition-all duration-300 h-full flex flex-col ${
                    plan.highlight
                      ? 'bg-gradient-to-br from-blue-600/20 to-cyan-600/10 border border-blue-500/30 shadow-glow'
                      : 'glass-card'
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <div className="badge-blue rounded-full px-4 py-1 text-xs font-semibold">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="mb-1 text-lg font-semibold text-white">{plan.name}</h3>
                    <p className="text-sm text-white/45">{plan.description}</p>
                  </div>

                  <div className="mb-6 flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="mb-1 text-white/40">{plan.period}</span>
                  </div>

                  <ul className="mb-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-white/65">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className={`block rounded-xl py-3 text-center text-sm font-semibold transition-all ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-glow hover:shadow-glow-lg'
                        : 'border border-white/10 text-white hover:bg-white/5'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-12">
              <div className="absolute inset-0 dot-bg opacity-20" />
              <div className="relative">
                <h2 className="mb-4 text-4xl font-bold text-white">
                  Ready to transform your legal workflow?
                </h2>
                <p className="mb-8 text-lg text-white/50">
                  Join 500+ Indian companies using LawBot to work smarter, faster, and with
                  greater confidence.
                </p>
                <Link
                  to="/register"
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold text-white"
                >
                  Start Your Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="mt-4 text-sm text-white/30">No credit card required • 14-day free trial</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-400" />
              <span className="gradient-text font-bold">LawBot</span>
            </div>
            <p className="text-xs text-white/30">
              © 2025 LawBot Technologies Pvt. Ltd. · All rights reserved.
              <br className="md:hidden" />
              <span className="hidden md:inline"> · </span>
              Not a substitute for licensed legal advice.
            </p>
            <div className="flex gap-6 text-xs text-white/40">
              <a href="#" className="hover:text-white/70 transition-colors">Privacy</a>
              <a href="#" className="hover:text-white/70 transition-colors">Terms</a>
              <a href="#" className="hover:text-white/70 transition-colors">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
