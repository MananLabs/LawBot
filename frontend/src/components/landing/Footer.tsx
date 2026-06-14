import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Scale, Twitter, Linkedin, Github, Mail } from 'lucide-react'

// =====================================================================
// FOOTER LINKS
// =====================================================================
const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Changelog', href: '/changelog' },
    { label: 'Roadmap', href: '/roadmap' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Data Processing', href: '/dpa' },
    { label: 'Disclaimer', href: '/disclaimer' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
    { label: 'Press Kit', href: '/press' },
  ],
  Support: [
    { label: 'Documentation', href: '/docs' },
    { label: 'API Reference', href: '/api' },
    { label: 'Status Page', href: '/status' },
    { label: 'Support Center', href: '/support' },
    { label: 'Community', href: '/community' },
  ],
}

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/lawbot_in', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com/company/lawbot', label: 'LinkedIn' },
  { icon: Github, href: 'https://github.com/lawbot-in', label: 'GitHub' },
  { icon: Mail, href: 'mailto:hello@lawbot.in', label: 'Email' },
]

// =====================================================================
// FOOTER COMPONENT
// =====================================================================
export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-[#0A0A0F]">
      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-14">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
                <Scale className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-base font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent block leading-none">
                  LawBot
                </span>
                <span className="text-[9px] text-white/30 uppercase tracking-widest">
                  AI Legal Copilot
                </span>
              </div>
            </Link>

            <p className="text-sm text-white/40 leading-relaxed mb-6 max-w-xs">
              India's most advanced AI platform for corporate legal intelligence. Trusted by 10,000+
              founders, lawyers, and compliance teams.
            </p>

            {/* Social Links */}
            <div className="flex gap-2">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/8 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                    aria-label={social.label}
                  >
                    <Icon className="h-4 w-4" />
                  </motion.a>
                )
              })}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-white/40 hover:text-white/80 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} LawBot Technologies Pvt. Ltd. All rights reserved.
          </p>

          <div className="flex items-center gap-4 text-xs text-white/25">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </span>
            <span>·</span>
            <span>Made with ❤️ in India</span>
            <span>·</span>
            <span>ISO 27001 Certified</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
