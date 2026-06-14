import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scale,
  LayoutDashboard,
  MessageSquare,
  FileText,
  FolderOpen,
  Wand2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Crown,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// =====================================================================
// NAVIGATION ITEMS
// =====================================================================
const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Chat',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    label: 'Contracts',
    href: '/contracts',
    icon: FileText,
  },
  {
    label: 'Documents',
    href: '/documents',
    icon: FolderOpen,
  },
  {
    label: 'Generator',
    href: '/generate',
    icon: Wand2,
  },
  {
    label: 'Compliance',
    href: '/compliance',
    icon: ShieldCheck,
  },
]

// =====================================================================
// TIER BADGE COLORS
// =====================================================================
const tierColors: Record<string, string> = {
  free: 'text-white/40 bg-white/5',
  starter: 'text-blue-400 bg-blue-500/10',
  professional: 'text-purple-400 bg-purple-500/10',
  enterprise: 'text-yellow-400 bg-yellow-500/10',
}

// =====================================================================
// SIDEBAR COMPONENT
// =====================================================================
interface SidebarProps {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export default function Sidebar({ collapsed = false, onCollapsedChange }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const isCollapsed = collapsed

  const handleToggle = () => {
    onCollapsedChange?.(!isCollapsed)
  }

  const tier = user?.subscription?.tier ?? 'free'

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-full flex-col bg-[#0D0D14] border-r border-white/5 overflow-hidden"
    >
      {/* ---- Header / Logo ---- */}
      <div className="flex h-16 items-center px-4 border-b border-white/5 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
          <motion.div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Scale className="h-5 w-5 text-white" strokeWidth={1.5} />
          </motion.div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                  LawBot
                </span>
                <span className="text-[10px] text-white/30 font-medium tracking-wider uppercase mt-0.5">
                  Legal Copilot
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.href)
          const isHovered = hoveredItem === item.href

          return (
            <div key={item.href} className="relative">
              <Link
                to={item.href}
                onMouseEnter={() => setHoveredItem(item.href)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5',
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-blue-500/10 border border-blue-500/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0 relative z-10 transition-colors',
                    isActive ? 'text-blue-400' : 'text-white/40',
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />

                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      className="relative z-10 truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Tooltip for collapsed state */}
              <AnimatePresence>
                {isCollapsed && isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.1 }}
                    className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-[#1A1A2E] border border-white/10 text-sm text-white/90 font-medium whitespace-nowrap z-50 shadow-xl"
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>

      {/* ---- User Profile ---- */}
      <div className="border-t border-white/5 p-2 space-y-1 shrink-0">
        {/* Settings Link */}
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
        >
          <Settings className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* User Info */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2 bg-white/3 border border-white/5',
            isCollapsed && 'justify-center',
          )}
        >
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.first_name?.[0] ?? 'U'}
              {user?.last_name?.[0] ?? ''}
            </div>
            {tier !== 'free' && (
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-500 flex items-center justify-center">
                <Crown className="h-2.5 w-2.5 text-black" />
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-semibold text-white/80 truncate">
                  {user?.full_name ?? user?.first_name ?? 'User'}
                </p>
                <span
                  className={cn(
                    'text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-md',
                    tierColors[tier],
                  )}
                >
                  {tier}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ---- Collapse Toggle Button ---- */}
      <button
        onClick={handleToggle}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#1A1A2E] border border-white/10 text-white/40 hover:text-white/80 transition-all hover:scale-110 shadow-lg"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </motion.aside>
  )
}
