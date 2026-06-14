import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Scale, Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-dark">
      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute inset-0 dot-bg opacity-15" />

      {/* Glows */}
      <div className="absolute left-1/3 top-1/3 h-64 w-64 rounded-full bg-blue-500/8 blur-3xl" />
      <div className="absolute right-1/3 bottom-1/3 h-48 w-48 rounded-full bg-purple-500/6 blur-3xl" />

      <div className="relative z-10 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <Link to="/" className="mb-12 inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-glow">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <span className="gradient-text text-xl font-bold">LawBot</span>
          </Link>

          {/* 404 */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6"
          >
            <div className="gradient-text text-[10rem] font-black leading-none tracking-tight">
              404
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="mb-3 text-2xl font-bold text-white">Page Not Found</h1>
            <p className="mx-auto mb-8 max-w-sm text-white/45">
              Looks like this page took a legal detour. The page you're looking for doesn't exist
              or has been moved.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/"
                className="btn-primary flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Link>
              <button
                onClick={() => window.history.back()}
                className="btn-outline flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
