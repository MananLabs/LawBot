import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Scale, Mail, Lock, User, Building2, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

const registerSchema = z
  .object({
    first_name: z.string().min(2, 'First name must be at least 2 characters'),
    last_name: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    organization_name: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

type RegisterFormData = z.infer<typeof registerSchema>

const BENEFITS = [
  'Free 14-day trial, no credit card required',
  'AI trained on Indian corporate law',
  'SOC 2 compliant, Indian data residency',
  'Instant setup, no onboarding hassle',
]

export default function RegisterPage() {
  const { register: registerUser, isRegistering } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password', '')
  const passwordStrength = getPasswordStrength(password)

  const onSubmit = (data: RegisterFormData) => {
    registerUser({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      password: data.password,
      organization_name: data.organization_name,
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-dark">
      <div className="absolute inset-0 mesh-bg" />
      <div className="absolute inset-0 dot-bg opacity-20" />
      <div className="absolute left-1/4 top-1/3 h-80 w-80 rounded-full bg-blue-500/8 blur-3xl" />
      <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-purple-500/6 blur-3xl" />

      <div className="relative z-10 flex min-h-screen">
        {/* Left column — benefits */}
        <div className="hidden flex-1 items-center justify-center p-12 lg:flex">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md"
          >
            <Link to="/" className="mb-10 inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-glow">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="gradient-text text-xl font-bold">LawBot</span>
            </Link>

            <h2 className="mb-3 text-3xl font-bold text-white">
              India's smartest legal AI
            </h2>
            <p className="mb-10 text-white/50">
              From startups to enterprises, LawBot helps you navigate Indian corporate law with
              confidence.
            </p>

            <ul className="space-y-4">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <span className="text-white/70">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="mt-12 rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <div className="mb-3 flex text-amber-400">
                {'★'.repeat(5)}
              </div>
              <p className="text-sm text-white/60 italic">
                "LawBot cut our contract review time from 3 days to 2 hours. The risk flagging
                accuracy is exceptional."
              </p>
              <div className="mt-3 text-sm font-medium text-white/80">— Priya Sharma, GC at TechScale</div>
            </div>
          </motion.div>
        </div>

        {/* Right column — form */}
        <div className="flex w-full items-center justify-center p-6 lg:w-[480px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="mb-6 lg:hidden">
              <Link to="/" className="mb-4 inline-flex items-center gap-2">
                <Scale className="h-6 w-6 text-blue-400" />
                <span className="gradient-text font-bold">LawBot</span>
              </Link>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white">Create your account</h1>
              <p className="mt-1 text-white/45">14-day free trial · No credit card needed</p>
            </div>

            <div className="glass-card rounded-2xl p-7">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/60">
                      First Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                      <input
                        {...register('first_name')}
                        placeholder="Priya"
                        className="input-dark w-full pl-9 text-sm"
                      />
                    </div>
                    {errors.first_name && (
                      <p className="mt-1 text-xs text-red-400">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/60">
                      Last Name
                    </label>
                    <input
                      {...register('last_name')}
                      placeholder="Sharma"
                      className="input-dark w-full text-sm"
                    />
                    {errors.last_name && (
                      <p className="mt-1 text-xs text-red-400">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="priya@company.com"
                      className="input-dark w-full pl-9 text-sm"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                  )}
                </div>

                {/* Company */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">
                    Company Name{' '}
                    <span className="text-white/30">(optional)</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                    <input
                      {...register('organization_name')}
                      placeholder="Acme Corp Pvt. Ltd."
                      className="input-dark w-full pl-9 text-sm"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      className="input-dark w-full pl-9 pr-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              i < passwordStrength.score
                                ? passwordStrength.score <= 1
                                  ? 'bg-red-500'
                                  : passwordStrength.score <= 2
                                    ? 'bg-amber-500'
                                    : passwordStrength.score <= 3
                                      ? 'bg-blue-500'
                                      : 'bg-emerald-500'
                                : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-white/40">{passwordStrength.label}</p>
                    </div>
                  )}

                  {errors.password && (
                    <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/60">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                    <input
                      {...register('confirm_password')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat password"
                      className="input-dark w-full pl-9 pr-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.confirm_password && (
                    <p className="mt-1 text-xs text-red-400">{errors.confirm_password.message}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center text-sm text-white/40">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-white/25">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-white/40 hover:text-white/60">Terms</a> and{' '}
              <a href="#" className="text-white/40 hover:text-white/60">Privacy Policy</a>.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function getPasswordStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' }

  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  return { score, label: labels[score] }
}
