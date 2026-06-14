import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import ProtectedRoute from '@/components/shared/ProtectedRoute'

// Lazy loaded pages for code splitting
const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const ChatSessionPage = lazy(() => import('@/pages/ChatSessionPage'))
const ContractsPage = lazy(() => import('@/pages/ContractsPage'))
const GeneratePage = lazy(() => import('@/pages/GeneratePage'))
const CompliancePage = lazy(() => import('@/pages/CompliancePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

// Full-screen loading fallback
function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-dark">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
        </div>
        <p className="text-sm text-white/40 font-medium tracking-wider uppercase">Loading</p>
      </div>
    </div>
  )
}

// Page transition wrapper
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
}

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen"
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  const { initializeAuth } = useAuthStore()

  // Initialize auth state from stored tokens on mount
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <AnimatedPage>
                <LandingPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/login"
            element={
              <AnimatedPage>
                <LoginPage />
              </AnimatedPage>
            }
          />
          <Route
            path="/register"
            element={
              <AnimatedPage>
                <RegisterPage />
              </AnimatedPage>
            }
          />

          {/* Protected routes - require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={
                <AnimatedPage>
                  <DashboardPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/chat"
              element={
                <AnimatedPage>
                  <ChatPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/chat/:id"
              element={
                <AnimatedPage>
                  <ChatSessionPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/contracts"
              element={
                <AnimatedPage>
                  <ContractsPage />
                </AnimatedPage>
              }
            />
            <Route
              path="/generate"
              element={
                <AnimatedPage>
                  <GeneratePage />
                </AnimatedPage>
              }
            />
            <Route
              path="/compliance"
              element={
                <AnimatedPage>
                  <CompliancePage />
                </AnimatedPage>
              }
            />
          </Route>

          {/* Catch-all / 404 */}
          <Route
            path="/404"
            element={
              <AnimatedPage>
                <NotFoundPage />
              </AnimatedPage>
            }
          />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}
