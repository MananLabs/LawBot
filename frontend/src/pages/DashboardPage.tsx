import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  MessageSquare,
  FileText,
  FileSearch,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Zap,
  Scale,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const QUICK_ACTIONS = [
  {
    icon: MessageSquare,
    label: 'Ask Legal Question',
    description: 'Get instant AI answers',
    href: '/chat',
    color: 'blue',
    gradient: 'from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/15 text-blue-400',
  },
  {
    icon: FileSearch,
    label: 'Analyze Contract',
    description: 'Upload & get risk report',
    href: '/contracts',
    color: 'cyan',
    gradient: 'from-cyan-500/20 to-cyan-600/10',
    border: 'border-cyan-500/20',
    iconBg: 'bg-cyan-500/15 text-cyan-400',
  },
  {
    icon: FileText,
    label: 'Draft Document',
    description: 'Generate from templates',
    href: '/generate',
    color: 'purple',
    gradient: 'from-purple-500/20 to-purple-600/10',
    border: 'border-purple-500/20',
    iconBg: 'bg-purple-500/15 text-purple-400',
  },
  {
    icon: ClipboardCheck,
    label: 'Check Compliance',
    description: 'Review regulatory status',
    href: '/compliance',
    color: 'green',
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/15 text-emerald-400',
  },
]

const STATS = [
  { label: 'Queries This Month', value: '28', max: 100, color: 'blue', icon: MessageSquare },
  { label: 'Documents Analyzed', value: '7', max: 10, color: 'cyan', icon: FileSearch },
  { label: 'Contracts Generated', value: '3', max: 5, color: 'purple', icon: FileText },
  { label: 'Compliance Score', value: '82%', color: 'green', icon: CheckCircle2 },
]

const RECENT_ACTIVITY = [
  {
    type: 'chat',
    icon: MessageSquare,
    title: 'Asked about Section 186 Companies Act',
    time: '2 hours ago',
    color: 'blue',
  },
  {
    type: 'contract',
    icon: FileSearch,
    title: 'Analyzed Vendor Agreement — TechCorp',
    time: '5 hours ago',
    color: 'cyan',
  },
  {
    type: 'document',
    icon: FileText,
    title: 'Generated NDA for Priya Ventures',
    time: 'Yesterday',
    color: 'purple',
  },
  {
    type: 'compliance',
    icon: ClipboardCheck,
    title: 'Compliance check completed',
    time: '2 days ago',
    color: 'green',
  },
]

const UPCOMING_DEADLINES = [
  { title: 'MGT-7 Annual Return', date: '30 Nov 2025', priority: 'high', daysLeft: 12 },
  { title: 'GST GSTR-9 Filing', date: '31 Dec 2025', priority: 'medium', daysLeft: 43 },
  { title: 'Board Meeting Q4', date: '15 Jan 2026', priority: 'low', daysLeft: 58 },
]

const staggerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <div className="border-b border-white/5 bg-dark/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
              <Scale className="h-4 w-4 text-white" />
            </div>
            <span className="gradient-text font-bold">LawBot</span>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Chat', href: '/chat' },
              { label: 'Contracts', href: '/contracts' },
              { label: 'Generate', href: '/generate' },
              { label: 'Compliance', href: '/compliance' },
            ].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  item.href === '/dashboard'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-white/55 hover:text-white hover:bg-white/5',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white">
              {user?.first_name?.[0] ?? 'U'}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-white">
            Good morning, {user?.first_name ?? 'there'} 👋
          </h1>
          <p className="mt-1 text-white/45">
            Here's an overview of your legal workspace
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={staggerVariants}
          initial="hidden"
          animate="show"
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <motion.div key={action.href} variants={itemVariants}>
                <Link to={action.href}>
                  <div
                    className={cn(
                      'group flex cursor-pointer flex-col gap-4 rounded-xl border p-5 transition-all duration-300',
                      `bg-gradient-to-br ${action.gradient}`,
                      action.border,
                      'hover:translate-y-[-2px] hover:shadow-card-hover',
                    )}
                  >
                    <div
                      className={cn(
                        'inline-flex h-10 w-10 items-center justify-center rounded-xl',
                        action.iconBg,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{action.label}</div>
                      <div className="mt-0.5 text-xs text-white/45">{action.description}</div>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white/60" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Stats + Activity */}
          <div className="space-y-6 lg:col-span-2">
            {/* Usage Stats */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-xl p-6"
            >
              <div className="mb-5 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <h2 className="font-semibold text-white">Monthly Usage</h2>
                <div className="badge-blue ml-auto">Pro Plan</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {STATS.map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.label} className="rounded-lg bg-white/[0.02] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <Icon className={cn(
                          'h-4 w-4',
                          stat.color === 'blue' && 'text-blue-400',
                          stat.color === 'cyan' && 'text-cyan-400',
                          stat.color === 'purple' && 'text-purple-400',
                          stat.color === 'green' && 'text-emerald-400',
                        )} />
                        <span className="text-xl font-bold text-white">{stat.value}</span>
                      </div>
                      <p className="text-xs text-white/45">{stat.label}</p>
                      {stat.max && (
                        <div className="mt-2 progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${(parseInt(stat.value) / stat.max) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card rounded-xl p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-semibold text-white">Recent Activity</h2>
                <button className="text-xs text-blue-400 hover:text-blue-300">View all</button>
              </div>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg p-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                          item.color === 'blue' && 'bg-blue-500/10 text-blue-400',
                          item.color === 'cyan' && 'bg-cyan-500/10 text-cyan-400',
                          item.color === 'purple' && 'bg-purple-500/10 text-purple-400',
                          item.color === 'green' && 'bg-emerald-500/10 text-emerald-400',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm text-white/80">{item.title}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-white/30 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {item.time}
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>

          {/* Right: Compliance + Deadlines */}
          <div className="space-y-6">
            {/* Compliance Score */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-card rounded-xl p-6 text-center"
            >
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <h2 className="font-semibold text-white">Compliance Score</h2>
              </div>
              <div className="relative mx-auto mb-3 flex h-32 w-32 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="url(#scoreGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - 0.82)}`}
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div>
                  <div className="text-3xl font-bold text-white">82</div>
                  <div className="text-xs text-white/40">/ 100</div>
                </div>
              </div>
              <div className="badge-green inline-flex">Good Standing</div>
              <p className="mt-3 text-xs text-white/40">
                3 items need attention
              </p>
              <Link
                to="/compliance"
                className="mt-4 flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Details <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>

            {/* Upcoming Deadlines */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 }}
              className="glass-card rounded-xl p-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h2 className="font-semibold text-white">Upcoming Deadlines</h2>
              </div>
              <div className="space-y-3">
                {UPCOMING_DEADLINES.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.02] p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-white/80">{item.title}</p>
                      <p className="text-xs text-white/35">{item.date}</p>
                    </div>
                    <div
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                        item.daysLeft <= 14
                          ? 'bg-red-500/15 text-red-400'
                          : item.daysLeft <= 30
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-emerald-500/15 text-emerald-400',
                      )}
                    >
                      {item.daysLeft}d
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/compliance"
                className="mt-4 flex items-center justify-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                View Calendar <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>

            {/* AI Quick Tip */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-transparent p-5"
            >
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">AI Insight</span>
              </div>
              <p className="text-sm text-white/65 leading-relaxed">
                Your vendor contract with TechCorp has an unfavorable limitation of liability clause.
                Review suggested alternatives.
              </p>
              <Link
                to="/contracts"
                className="mt-3 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Review Contract <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
