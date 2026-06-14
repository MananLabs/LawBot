import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Scale, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const { login, isLoggingIn } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const from = (location.state as { from?: string })?.from || '/dashboard'

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, navigate, from])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (data: LoginFormData) => {
    login({ email: data.email, password: data.password })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-dark">
      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute inset-0 dot-bg opacity-20" />
      <div className="absolute left-1/4 top-1/4 h-80 w-80 rounded-full bg-blue-500/8 blur-3xl" />
      <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-purple-500/6 blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Header */}
          <div className="mb-8 text-center">
            <Link to="/" className="mb-6 inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-glow">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="gradient-text text-xl font-bold">LawBot</span>
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-white">Welcome back</h1>
            <p className="mt-2 text-white/50">Sign in to your account to continue</p>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-2xl p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-white/70">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="input-dark w-full pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-white/70">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="input-dark w-full pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-white/40">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Create one free
              </Link>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-white/25">
            By signing in, you agree to our{' '}
            <a href="#" className="text-white/40 hover:text-white/60">Terms of Service</a> and{' '}
            <a href="#" className="text-white/40 hover:text-white/60">Privacy Policy</a>.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
