import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { ChevronDown, ArrowRight, Sparkles } from 'lucide-react'

// =====================================================================
// 3D ANIMATED SPHERE
// =====================================================================
function AnimatedSphere({
  mouseX,
  mouseY,
}: {
  mouseX: number
  mouseY: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    meshRef.current.rotation.x = t * 0.15 + mouseY * 0.3
    meshRef.current.rotation.y = t * 0.2 + mouseX * 0.3
    meshRef.current.rotation.z = t * 0.1
  })

  return (
    <Sphere ref={meshRef} args={[1.5, 100, 100]} scale={1}>
      <MeshDistortMaterial
        color="#3B82F6"
        attach="material"
        distort={0.45}
        speed={2.5}
        roughness={0}
        metalness={0.1}
        opacity={0.85}
        transparent
      />
    </Sphere>
  )
}

// =====================================================================
// PARTICLE FIELD
// =====================================================================
function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null)
  const count = 300
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10
  }

  useFrame((state) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.04
    pointsRef.current.rotation.x = state.clock.elapsedTime * 0.02
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#06B6D4"
        sizeAttenuation
        transparent
        opacity={0.6}
      />
    </points>
  )
}

// =====================================================================
// NETWORK NODES BACKGROUND (Canvas API)
// =====================================================================
function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = []
    const NUM_NODES = 40

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < NUM_NODES; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 2 + Math.random() * 2,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update positions
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.15
            ctx.beginPath()
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`
            ctx.lineWidth = 1
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)'
        ctx.fill()
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-40"
    />
  )
}

// =====================================================================
// HERO SECTION
// =====================================================================
export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  const bgX = useTransform(springX, [-1, 1], ['-2%', '2%'])
  const bgY = useTransform(springY, [-1, 1], ['-2%', '2%'])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    mouseX.set(x)
    mouseY.set(y)
    setMousePos({ x, y })
  }

  const scrollToNext = () => {
    document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0A0A0F]"
    >
      {/* Network Background */}
      <NetworkCanvas />

      {/* Gradient Orbs */}
      <motion.div
        style={{ x: bgX, y: bgY }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-purple-500/8 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-cyan-500/8 blur-[80px]" />
      </motion.div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto px-6 gap-12 pt-24">
        {/* Left Text Content */}
        <div className="flex-1 max-w-2xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8"
          >
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Indian Corporate Law Intelligence</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="text-6xl lg:text-7xl font-extrabold leading-[0.95] tracking-tight mb-6"
          >
            <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              Your AI
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Legal Copilot
            </span>
            <br />
            <span className="bg-gradient-to-r from-white/70 via-white/90 to-white bg-clip-text text-transparent">
              for India
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-lg text-white/50 leading-relaxed mb-10 max-w-xl"
          >
            LawBot understands Indian corporate law — Companies Act, SEBI, FEMA, GST &amp; more.
            Analyze contracts, generate documents, track compliance — all in one intelligent platform.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.6 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/register">
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: '0 0 40px rgba(59,130,246,0.4)' }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-base shadow-xl shadow-blue-500/30 transition-all"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </Link>

            <motion.button
              onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-semibold text-base hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm"
            >
              See How It Works
            </motion.button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex items-center gap-6 mt-10 text-xs text-white/30 font-medium"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              SOC 2 Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              Indian Data Residency
            </span>
          </motion.div>
        </div>

        {/* Right 3D Sphere */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex-shrink-0 w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] relative"
        >
          {/* Glow rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-80 h-80 rounded-full border border-blue-500/10 animate-ping" style={{ animationDuration: '3s' }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-96 h-96 rounded-full border border-cyan-500/5" />
          </div>

          <Canvas
            camera={{ position: [0, 0, 4], fov: 45 }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.3} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} color="#3B82F6" />
            <directionalLight position={[-5, -5, -3]} intensity={0.4} color="#06B6D4" />
            <pointLight position={[0, 0, 3]} intensity={0.8} color="#8B5CF6" />
            <AnimatedSphere mouseX={mousePos.x} mouseY={mousePos.y} />
            <ParticleField />
          </Canvas>

          {/* Floating Labels */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-8 -left-4 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-xs text-white/60 font-medium"
          >
            📜 Companies Act 2013
          </motion.div>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute bottom-16 -right-4 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-xs text-white/60 font-medium"
          >
            🛡️ SEBI Compliant
          </motion.div>
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-1/2 -right-8 px-3 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-xs text-white/60 font-medium"
          >
            💼 FEMA / GST / IBC
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        onClick={scrollToNext}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors"
      >
        <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.button>
    </section>
  )
}
