import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { tokenStorage } from '@/lib/api'

// =====================================================================
// LOADING SCREEN (shown while auth state initializes)
// =====================================================================
function AuthLoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-dark">
      {/* Animated background */}
      <div className="absolute inset-0 mesh-bg" />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-bg opacity-30" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col items-center gap-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-glow-lg">
            <span className="text-3xl">⚖️</span>
          </div>
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-2xl border border-blue-500/30 animate-ping" />
        </motion.div>

        {/* Brand name */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h1 className="gradient-text text-2xl font-bold tracking-tight">LawBot</h1>
          <p className="mt-1 text-sm text-white/40">AI Indian Corporate Law Copilot</p>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-3"
        >
          {/* Spinner */}
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
          </div>
          <p className="text-xs text-white/30 tracking-widest uppercase animate-pulse">
            Authenticating...
          </p>
        </motion.div>
      </motion.div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-dark to-transparent" />
    </div>
  )
}

// =====================================================================
// UNAUTHORIZED REDIRECT (shown briefly before redirect)
// =====================================================================
function UnauthorizedRedirect({ redirectTo }: { redirectTo: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center bg-dark"
    >
      <div className="text-center">
        <div className="mb-4 text-4xl">🔒</div>
        <p className="text-white/60">Redirecting to login...</p>
      </div>
    </motion.div>
  )
}

// =====================================================================
// PROTECTED ROUTE COMPONENT
// =====================================================================
interface ProtectedRouteProps {
  /**
   * Redirect path if user is not authenticated.
   * Defaults to '/login'.
   */
  redirectTo?: string

  /**
   * Required subscription tier to access the route.
   * If user doesn't meet the tier, redirect to upgrade page.
   */
  requiredTier?: 'starter' | 'professional' | 'enterprise'

  /**
   * Required user role to access the route.
   */
  requiredRole?: 'admin' | 'attorney' | 'paralegal'
}

export default function ProtectedRoute({
  redirectTo = '/login',
  requiredTier,
  requiredRole,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated, isInitialized, user } = useAuthStore()

  // While auth state is being initialized from localStorage
  if (!isInitialized) {
    return <AuthLoadingScreen />
  }

  // No valid token — redirect to login
  if (!isAuthenticated || !tokenStorage.hasTokens()) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname + location.search }}
        replace
      />
    )
  }

  // Check subscription tier requirement
  if (requiredTier && user) {
    const tierHierarchy = ['free', 'starter', 'professional', 'enterprise']
    const userTierIndex = tierHierarchy.indexOf(user.subscription?.tier ?? 'free')
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier)

    if (userTierIndex < requiredTierIndex) {
      return (
        <Navigate
          to="/pricing"
          state={{ requiredTier, from: location.pathname }}
          replace
        />
      )
    }
  }

  // Check role requirement
  if (requiredRole && user) {
    const roleHierarchy = ['client', 'paralegal', 'attorney', 'admin']
    const userRoleIndex = roleHierarchy.indexOf(user.role)
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole)

    if (userRoleIndex < requiredRoleIndex) {
      return <Navigate to="/dashboard" state={{ error: 'insufficient_permissions' }} replace />
    }
  }

  // Authenticated — render children
  return (
    <AnimatePresence mode="wait">
      <Outlet />
    </AnimatePresence>
  )
}

// =====================================================================
// GUEST ROUTE — Redirect authenticated users away from auth pages
// =====================================================================
interface GuestRouteProps {
  redirectTo?: string
}

export function GuestRoute({ redirectTo = '/dashboard' }: GuestRouteProps) {
  const { isAuthenticated, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized) {
    return <AuthLoadingScreen />
  }

  // If already authenticated, redirect to dashboard (or intended destination)
  if (isAuthenticated && tokenStorage.hasTokens()) {
    const from = (location.state as { from?: string })?.from || redirectTo
    return <Navigate to={from} replace />
  }

  return <Outlet />
}

// =====================================================================
// TIER GATE COMPONENT — Inline gate for premium features
// =====================================================================
interface TierGateProps {
  requiredTier: 'starter' | 'professional' | 'enterprise'
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function TierGate({ requiredTier, children, fallback }: TierGateProps) {
  const { user } = useAuthStore()

  const tierHierarchy = ['free', 'starter', 'professional', 'enterprise']
  const userTierIndex = tierHierarchy.indexOf(user?.subscription?.tier ?? 'free')
  const requiredTierIndex = tierHierarchy.indexOf(requiredTier)

  if (userTierIndex >= requiredTierIndex) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  // Default upgrade prompt
  return (
    <div className="glass-card rounded-xl p-6 text-center">
      <div className="mb-3 text-3xl">⚡</div>
      <h3 className="mb-1 font-semibold text-white">
        {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} Feature
      </h3>
      <p className="mb-4 text-sm text-white/50">
        Upgrade to {requiredTier} plan to access this feature.
      </p>
      <a
        href="/pricing"
        className="btn-primary inline-flex items-center gap-2 text-sm"
      >
        Upgrade Now
      </a>
    </div>
  )
}
