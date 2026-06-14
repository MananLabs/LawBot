import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, Menu, X, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// =====================================================================
// NAV LINKS
// =====================================================================
const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
]

// =====================================================================
// NAVBAR COMPONENT
// =====================================================================
export default function Navbar() {
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Detect scroll for glassmorphism bg
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleNavClick = (href: string) => {
    setMenuOpen(false)
    if (href.startsWith('#')) {
      const el = document.querySelector(href)
      el?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-[#0A0A0F]/80 backdrop-blur-2xl border-b border-white/8 shadow-2xl shadow-black/30'
            : 'bg-transparent',
        )}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <motion.div
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30"
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Scale className="h-5 w-5 text-white" strokeWidth={1.5} />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                  LawBot
                </span>
                <span className="text-[9px] text-white/30 font-medium tracking-[0.15em] uppercase">
                  AI Legal Copilot
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white/90 transition-colors rounded-lg hover:bg-white/5"
                >
                  {link.label}
                </button>
              ))}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                  >
                    Go to Dashboard
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <button className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors rounded-xl hover:bg-white/5">
                      Sign In
                    </button>
                  </Link>
                  <Link to="/register">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                    >
                      Get Started Free
                      <ChevronRight className="h-4 w-4" />
                    </motion.button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            >
              <AnimatePresence mode="wait">
                {menuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-16 left-0 right-0 z-40 bg-[#0A0A0F]/95 backdrop-blur-2xl border-b border-white/8 overflow-hidden md:hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleNavClick(link.href)}
                  className="w-full text-left px-4 py-3 text-sm font-medium text-white/70 hover:text-white rounded-xl hover:bg-white/5 transition-all"
                >
                  {link.label}
                </motion.button>
              ))}

              <div className="pt-3 border-t border-white/5 space-y-2">
                {isAuthenticated ? (
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                    <button className="w-full px-4 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                      Go to Dashboard
                    </button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMenuOpen(false)}>
                      <button className="w-full px-4 py-3 text-sm font-medium text-white/70 rounded-xl border border-white/10 hover:bg-white/5 transition-all">
                        Sign In
                      </button>
                    </Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)}>
                      <button className="w-full px-4 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                        Get Started Free
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
