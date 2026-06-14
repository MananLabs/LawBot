import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChevronRight, Search, X } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuthStore } from '@/stores/authStore'

// =====================================================================
// BREADCRUMB CONFIG
// =====================================================================
const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  chat: 'Legal Chat',
  contracts: 'Contract Analyzer',
  documents: 'Documents',
  generate: 'Document Generator',
  compliance: 'Compliance Tracker',
  settings: 'Settings',
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((seg, idx) => ({
    label: breadcrumbMap[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
    href: '/' + segments.slice(0, idx + 1).join('/'),
    isLast: idx === segments.length - 1,
  }))
}

// =====================================================================
// NOTIFICATION ITEM (mock)
// =====================================================================
const mockNotifications = [
  {
    id: '1',
    title: 'Contract Analysis Complete',
    description: 'NDA analysis has finished. 3 high-risk clauses found.',
    time: '2m ago',
    read: false,
    type: 'warning',
  },
  {
    id: '2',
    title: 'Compliance Deadline',
    description: 'GST filing due in 3 days.',
    time: '1h ago',
    read: false,
    type: 'error',
  },
  {
    id: '3',
    title: 'Document Generated',
    description: 'Employment Agreement is ready for download.',
    time: '2h ago',
    read: true,
    type: 'success',
  },
]

// =====================================================================
// DASHBOARD LAYOUT
// =====================================================================
export default function DashboardLayout() {
  const location = useLocation()
  const { user } = useAuthStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const breadcrumbs = getBreadcrumbs(location.pathname)
  const unreadCount = mockNotifications.filter((n) => !n.read).length

  // Close notifications on route change
  useEffect(() => {
    setNotifOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  // Keyboard shortcut: Cmd+K for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setNotifOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen bg-[#0A0A0F] overflow-hidden">
      {/* ---- Sidebar ---- */}
      <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />

      {/* ---- Main Content ---- */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ---- Top Header ---- */}
        <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl px-6 shrink-0 z-20">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-sm">
            <Link to="/dashboard" className="text-white/40 hover:text-white/70 transition-colors">
              Home
            </Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 text-white/20" />
                {crumb.isLast ? (
                  <span className="font-medium text-white/80">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.href}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 h-8 px-3 rounded-lg bg-white/5 border border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8 transition-all text-xs"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/30 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[#12121A] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                      <h3 className="text-sm font-semibold text-white">Notifications</h3>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="h-6 w-6 flex items-center justify-center rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {mockNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer ${
                            !notif.read ? 'bg-blue-500/3' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                                notif.type === 'error'
                                  ? 'bg-red-500'
                                  : notif.type === 'warning'
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-white/80 truncate">
                                {notif.title}
                              </p>
                              <p className="text-xs text-white/40 mt-0.5 line-clamp-2">
                                {notif.description}
                              </p>
                              <p className="text-[10px] text-white/25 mt-1">{notif.time}</p>
                            </div>
                            {!notif.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5">
                      <button className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                        Mark all as read
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-white/5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-blue-500/40 transition-all">
                {user?.first_name?.[0] ?? 'U'}
                {user?.last_name?.[0] ?? ''}
              </div>
            </div>
          </div>
        </header>

        {/* ---- Page Content ---- */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ---- Global Search Modal ---- */}
      <AnimatePresence>
        {searchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4"
            >
              <div className="rounded-2xl bg-[#12121A] border border-white/10 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                  <Search className="h-4 w-4 text-white/40 shrink-0" />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents, contracts, chats..."
                    className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/30 outline-none"
                  />
                  <kbd className="px-2 py-1 rounded bg-white/5 text-[10px] text-white/30 font-mono">
                    ESC
                  </kbd>
                </div>
                {!searchQuery && (
                  <div className="p-4 space-y-1">
                    <p className="text-xs text-white/30 font-medium uppercase tracking-wider mb-3">
                      Quick Navigation
                    </p>
                    {['Dashboard', 'Chat', 'Contracts', 'Compliance', 'Generator'].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center">
                          <Search className="h-3 w-3 text-white/40" />
                        </div>
                        <span className="text-sm text-white/60">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
