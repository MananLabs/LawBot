import { useRef, useState, useEffect } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'

// =====================================================================
// TESTIMONIALS DATA
// =====================================================================
const testimonials = [
  {
    id: 1,
    name: 'Priya Krishnamurthy',
    role: 'Co-Founder & CEO',
    company: 'FinStack Technologies',
    avatar: 'PK',
    avatarGradient: 'from-blue-500 to-cyan-500',
    rating: 5,
    text: 'LawBot saved us ₹8 lakhs in legal fees in just the first quarter. We uploaded our Series A term sheet and got a comprehensive risk analysis in under 2 minutes. The accuracy around SEBI regulations was impressive.',
  },
  {
    id: 2,
    name: 'Rahul Mehta',
    role: 'Corporate Partner',
    company: 'Mehta & Associates LLP',
    avatar: 'RM',
    avatarGradient: 'from-purple-500 to-pink-500',
    rating: 5,
    text: "As a practising lawyer, I was skeptical. But LawBot's understanding of Indian corporate law is genuinely impressive. I use it daily to quickly review boilerplate contracts and it catches things I might miss on a second read.",
  },
  {
    id: 3,
    name: 'Ananya Singh',
    role: 'Head of Compliance',
    company: 'Zephyr Retail Ltd',
    avatar: 'AS',
    avatarGradient: 'from-green-500 to-emerald-500',
    rating: 5,
    text: "Managing compliance across GST, MCA, labour laws and FEMA was a nightmare. LawBot's compliance tracker now gives me a single dashboard with all upcoming deadlines. We haven't missed a filing since onboarding.",
  },
  {
    id: 4,
    name: 'Vikram Nair',
    role: 'Founder',
    company: 'Astra SaaS',
    avatar: 'VN',
    avatarGradient: 'from-orange-500 to-red-500',
    rating: 5,
    text: "Generated our entire legal document suite — Founders Agreement, IP Assignment, Employment contracts — in one afternoon using LawBot. The templates are comprehensive and the custom clauses feature is exactly what we needed.",
  },
  {
    id: 5,
    name: 'Deepika Rao',
    role: 'Legal Officer',
    company: 'Bharat Manufacturing Co.',
    avatar: 'DR',
    avatarGradient: 'from-cyan-500 to-blue-500',
    rating: 5,
    text: "The chat feature is like having a senior advocate available 24/7. I asked about the implications of a particular clause under the Contract Act, 1872 and got a precise, cited answer in seconds. Remarkable tool.",
  },
]

// =====================================================================
// TESTIMONIALS SECTION
// =====================================================================
export default function TestimonialsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return
    const timer = setInterval(() => {
      setDirection(1)
      setCurrent((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlaying])

  const goTo = (index: number) => {
    setDirection(index > current ? 1 : -1)
    setCurrent(index)
    setIsAutoPlaying(false)
  }

  const prev = () => {
    setDirection(-1)
    setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length)
    setIsAutoPlaying(false)
  }

  const next = () => {
    setDirection(1)
    setCurrent((c) => (c + 1) % testimonials.length)
    setIsAutoPlaying(false)
  }

  const t = testimonials[current]

  return (
    <section id="testimonials" ref={ref} className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/8 to-transparent" />

      <div className="relative max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-medium tracking-wider uppercase mb-6"
          >
            Testimonials
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-5"
          >
            Loved by{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              legal professionals
            </span>
          </motion.h2>
        </div>

        {/* Testimonial Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="relative rounded-2xl bg-white/4 border border-white/10 p-10 backdrop-blur-sm overflow-hidden min-h-[280px] flex flex-col justify-between">
            {/* Quote Icon */}
            <Quote className="absolute top-6 right-8 h-16 w-16 text-white/5" />

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                initial={{ opacity: 0, x: direction * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -30 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-lg text-white/75 leading-relaxed mb-8 italic">
                  "{t.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-full bg-gradient-to-br ${t.avatarGradient} flex items-center justify-center text-sm font-bold text-white shrink-0`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{t.name}</p>
                    <p className="text-sm text-white/40">
                      {t.role} · {t.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-8 bg-blue-500'
                      : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            {/* Arrow Buttons */}
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={prev}
                className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={next}
                className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
