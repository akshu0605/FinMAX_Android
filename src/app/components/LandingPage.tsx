import { motion } from 'motion/react';
import {
  PieChart,
  Bell,
  Check,
  Star,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  ReceiptText,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { Logo } from './Logo';
import { GlassCard } from './ui/GlassCard';
import './LandingPage.css';

// Design Tokens
const CYAN = '#DDB96B';
const headingFont: React.CSSProperties = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  letterSpacing: '-0.02em',
};
const bodyFont: React.CSSProperties = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
};
const monoFont: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, "Courier New", monospace',
};

// Glassmorphism helpers
// Outer frame glass (nav, overlays)
const glassFrame = (): React.CSSProperties => ({
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(15px) saturate(180%)',
  WebkitBackdropFilter: 'blur(15px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
});

// Card glass — slightly more presence
const glassCard = (accent = false): React.CSSProperties => ({
  background: accent ? 'rgba(0, 242, 255, 0.04)' : 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(15px) saturate(180%)',
  WebkitBackdropFilter: 'blur(15px) saturate(180%)',
  border: accent
    ? '1px solid rgba(0, 242, 255, 0.15)'
    : '1px solid rgba(255, 255, 255, 0.1)',
  boxShadow: accent
    ? '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 255, 0.08)'
    : '0 8px 32px rgba(0, 0, 0, 0.6)',
});

// Section wrapper with scroll-reveal
function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <motion.section
      id={id}
      className={`landing-section relative z-10 max-w-[1280px] mx-auto px-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.section>
  );
}

// Props interface
interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      id="finmax-landing"
      className="min-h-screen text-white overflow-hidden relative"
      style={{ background: '#080A09', ...bodyFont }}
    >
      {/* NAVIGATION */}
      <motion.nav
        className="landing-nav sticky top-0 z-50 w-full"
        style={{
          ...glassFrame(),
          borderRadius: 0,
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
        }}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Top shimmer line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(0, 242, 255, 0.3) 50%, transparent 100%)',
          }}
        />

        <div className="max-w-[1280px] mx-auto px-6 py-4 flex justify-between items-center">
          <Logo />

          {/* Desktop nav links */}
          <div className="hidden md:flex gap-10 items-center">
            {['Overview', 'Features', 'Insights'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm transition-colors duration-200"
                style={{ color: '#a1a1aa', ...bodyFont }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#a1a1aa')}
              >
                {link}
              </a>
            ))}
          </div>

          {/* Desktop action buttons */}
          <div className="hidden md:flex gap-3 items-center">
            <button
              onClick={onLogin}
              className="px-5 py-2 rounded-lg text-sm transition-all duration-200"
              style={{ color: '#a1a1aa', background: 'transparent', ...bodyFont }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a1a1aa';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Login
            </button>
            <motion.button
              onClick={onGetStarted}
              className="landing-primary-button px-5 py-2 rounded-lg text-sm font-semibold"
              style={{
                background: CYAN,
                color: '#000000',
                ...headingFont,
                boxShadow: '0 0 20px rgba(0, 242, 255, 0.3)',
              }}
              whileHover={{
                scale: 1.04,
                boxShadow: '0 0 32px rgba(0, 242, 255, 0.5)',
              }}
              whileTap={{ scale: 0.97 }}
            >
              Get Started
            </motion.button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="landing-menu-toggle md:hidden w-11 h-11 rounded-xl flex items-center justify-center text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            className="md:hidden px-6 pb-6 flex flex-col gap-4"
            style={{ background: 'rgba(0, 0, 0, 0.96)' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {['Overview', 'Features', 'Insights'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm py-1"
                style={{ color: '#a1a1aa', ...bodyFont }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            <button
              onClick={() => { setMobileMenuOpen(false); onLogin(); }}
              className="text-sm text-left py-1"
              style={{ color: '#a1a1aa', ...bodyFont }}
            >
              Login
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}
              className="landing-primary-button px-5 py-3 rounded-xl text-sm font-semibold text-center"
              style={{ background: CYAN, color: '#000000', ...headingFont }}
            >
              Get Started
            </button>
          </motion.div>
        )}
      </motion.nav>

      {/* HERO SECTION */}
      <section
        id="overview"
        className="landing-hero relative z-10 max-w-[1280px] mx-auto px-6"
        style={{ paddingTop: '120px', paddingBottom: '80px' }}
      >
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Status badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs mb-10"
            style={{ ...glassFrame(), color: CYAN, ...bodyFont }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: CYAN }}
            />
            Smart finance, built for India
          </motion.div>

          {/* Primary heading */}
          <h1
            className="landing-hero-title font-black mb-8 text-white tracking-tighter"
            style={{
              ...headingFont,
              fontSize: 'clamp(3rem, 10vw, 6.5rem)',
              lineHeight: 0.9,
              letterSpacing: '-0.05em',
            }}
          >
            Your finances,
            <br />
            <span
              style={{
                color: CYAN,
                textShadow: '0 0 40px rgba(0, 242, 255, 0.45)',
              }}
            >
              finally clear.
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-lg mb-12 max-w-[520px] mx-auto"
            style={{ color: '#a1a1aa', lineHeight: 1.7, ...bodyFont }}
          >
            Budget smarter, track every rupee, and get smart insights all in one clean, focused platform.
          </p>

          {/* CTA buttons */}
          <div className="flex gap-4 justify-center flex-wrap mb-20">
            <motion.button
              onClick={onGetStarted}
              className="landing-primary-button px-8 py-4 rounded-xl text-base font-semibold flex items-center gap-2"
              style={{
                background: CYAN,
                color: '#000000',
                ...headingFont,
                boxShadow: '0 0 32px rgba(0, 242, 255, 0.35)',
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 48px rgba(0, 242, 255, 0.55)',
              }}
              whileTap={{ scale: 0.97 }}
            >
              Get started free
              <ArrowRight className="size-4" />
            </motion.button>
            <motion.button
              onClick={onLogin}
              className="px-8 py-4 rounded-xl text-base font-semibold"
              style={{ ...glassCard(), color: '#ffffff', ...headingFont }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Sign in
            </motion.button>
          </div>
        </motion.div>

        {/* Product reveal — an interface preview, not a decorative stock image. */}
        <motion.div
          className="landing-hero-visual landing-product-reveal relative w-full rounded-[40px] overflow-hidden"
          style={{
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 40px 100px rgba(0, 0, 0, 0.9)',
            maxHeight: '600px',
          }}
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="landing-product-ui" aria-label="FinMax dashboard preview">
            <div className="landing-product-topbar">
              <span className="landing-product-wordmark"><strong>Fin</strong>Max</span>
              <span className="landing-product-date">October overview</span>
              <span className="landing-product-avatar">A</span>
            </div>
            <div className="landing-product-content">
              <div className="landing-product-sidebar">
                <span className="is-active">Overview</span>
                <span>Insights</span>
                <span>Budgets</span>
                <span>Expenses</span>
              </div>
              <div className="landing-product-main">
                <div className="landing-product-heading">
                  <div><span>Good evening</span><strong>Your money, in one view.</strong></div>
                  <button type="button" tabIndex={-1}>Add expense</button>
                </div>
                <div className="landing-product-stats">
                  <div><span>Monthly income</span><strong>••••••</strong><small>Your data</small></div>
                  <div><span>Total expenses</span><strong>••••••</strong><small className="is-rose">By category</small></div>
                  <div><span>Total savings</span><strong>••••••</strong><small className="is-good">Your overview</small></div>
                </div>
                <div className="landing-product-chart">
                  <div className="landing-product-chart-head"><span>Spending trend</span><strong>See your activity</strong></div>
                  <div className="landing-product-bars" aria-hidden="true">
                    {[34, 57, 43, 76, 52, 68, 46, 81, 61, 89, 64, 73].map((height, index) => (
                      <i key={index} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Floating stats overlay */}
          <div className="landing-hero-metrics absolute bottom-8 left-8 right-8 grid grid-cols-3 gap-3">
            {[
              { label: 'Track', value: 'Expenses' },
              { label: 'Plan', value: 'Budgets' },
              { label: 'Stay ready', value: 'Reminders' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="landing-hero-stat flex flex-col"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
              >
                <div
                  className="landing-hero-stat-inner"
                >
                  <span
                    className="text-2xl font-bold"
                    style={{ color: CYAN, ...headingFont }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-xs" style={{ color: '#a1a1aa', ...bodyFont }}>
                    {stat.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* A compact sticky sequence keeps the feature story focused as the page scrolls. */}
      <section id="features" className="landing-feature-story relative z-10">
        <div className="landing-story-intro max-w-[1280px] mx-auto px-6">
          <p className="landing-eyebrow">A clearer financial rhythm</p>
          <h2 style={headingFont}>Everything important.<br />Nothing in the way.</h2>
          <p>FinMax brings transactions, budgets and patterns into one calm, practical view.</p>
        </div>
        <div className="landing-sticky-stack max-w-[1280px] mx-auto px-6">
          {[
            { icon: ReceiptText, number: '01', title: 'Know every expense.', text: 'Import statements or add expenses in seconds. Each transaction stays readable, categorised and close at hand.', detail: 'Smart import · Merchant categories' },
            { icon: PieChart, number: '02', title: 'See the shape of your month.', text: 'A balanced overview makes it easier to notice where your money is going before the month gets away from you.', detail: 'Budgets · Category breakdowns' },
            { icon: Bell, number: '03', title: 'Stay ahead of what is due.', text: 'Reminders and a simple timeline keep bills visible without adding pressure to your day.', detail: 'Bills · Reminders · Split Kro' },
          ].map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.number}
                className={`landing-sticky-card landing-sticky-card-${index + 1}`}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="landing-sticky-card-index">{feature.number}</div>
                <div className="landing-sticky-card-icon"><Icon className="size-6" /></div>
                <div className="landing-sticky-card-copy">
                  <p>{feature.detail}</p>
                  <h3 style={headingFont}>{feature.title}</h3>
                  <span>{feature.text}</span>
                </div>
                <div className={`landing-sticky-card-visual landing-sticky-card-visual-${index + 1}`} aria-hidden="true">
                  <div /><div /><div /><div />
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <Section id="insights" className="landing-ai-section">
        <div className="landing-ai-panel">
          <div className="landing-ai-copy">
            <p className="landing-eyebrow"><Sparkles className="size-4" /> AI Insights</p>
            <h2 style={headingFont}>Useful patterns,<br />explained plainly.</h2>
            <p>FinMax looks at your actual spending history to surface trend changes, recurring costs and possible savings opportunities.</p>
            <div className="landing-ai-notes">
              <span><Check className="size-4" /> Based on your own transactions</span>
              <span><Check className="size-4" /> Clear, explainable signals</span>
            </div>
          </div>
          <div className="landing-ai-preview" aria-label="AI insights preview">
            <div className="landing-ai-preview-top"><span>FINMAX INSIGHTS</span><span>Based on your activity</span></div>
            <div className="landing-ai-preview-main"><BarChart3 className="size-7" /><div><strong>Understand your spending patterns</strong><span>Trend changes and potential savings, from your transaction history</span></div></div>
            <div className="landing-ai-preview-chart" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
            <div className="landing-ai-preview-foot"><span>Your data stays yours</span><strong>FinMax</strong></div>
          </div>
        </div>
      </Section>

      {/* SPLIT KRO SECTION */}
      <Section className="landing-split-section py-32">
        <GlassCard rounded="apple" className="overflow-hidden" spacing="lg" style={{ boxShadow: '0 60px 120px -20px rgba(0,0,0,0.9)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="p-4 lg:p-12">
              <div className="text-xs font-bold mb-6 tracking-[0.2em] uppercase" style={{ color: CYAN }}>Split Kro</div>
              <h2 className="text-4xl lg:text-6xl font-black mb-8 tracking-tighter leading-[0.95]" style={headingFont}>
                Split expenses<br />
                <span className="opacity-40">without the awkwardness.</span>
              </h2>
              <p className="text-lg mb-10 opacity-60 leading-relaxed" style={bodyFont}>
                The smart companion for trips, flatmates, and group dinners. Split Kro handles the numbers so you can focus on the moment.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'Fair splitting', desc: 'Equal or custom splits — works for any group, any scenario.' },
                  { title: 'One-tap settlement', desc: 'Resolve balances instantly. No back-and-forth required.' },
                  { title: 'Shared group view', desc: 'Keep group expenses, members and balances together.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: `${CYAN}20`, border: `1px solid ${CYAN}40` }}>
                      <Check className="size-3" style={{ color: CYAN }} />
                    </div>
                    <div>
                      <div className="font-bold text-white mb-1" style={headingFont}>{item.title}</div>
                      <div className="text-sm opacity-40" style={bodyFont}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative aspect-square lg:aspect-video rounded-[32px] overflow-hidden border border-white/10 group">
              <img
                src="/split-kro.png"
                alt="Split Kro interface"
                className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 scale-110 group-hover:scale-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-8 left-8 right-8">
                <GlassCard rounded="apple" spacing="md" className="border-white/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs opacity-50 mb-1 uppercase tracking-widest" style={monoFont}>Shared expenses</div>
                      <div className="text-xl font-bold" style={headingFont}>See group balances clearly</div>
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-cyan-500/50 flex items-center justify-center animate-spin-slow">
                      <Star className="size-5 text-cyan-500" />
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        </GlassCard>
      </Section>



      {/* TESTIMONIALS SECTION */}
      <Section className="landing-testimonials py-32">
        <div className="text-center mb-20">
          <h2 className="font-bold text-white mb-4" style={{ ...headingFont, fontSize: '2.25rem' }}>
            Trusted by thousands
          </h2>
          <p style={{ color: '#a1a1aa', ...bodyFont, maxWidth: '400px', margin: '0 auto', lineHeight: 1.7 }}>
            People building better financial habits with FinMax every day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: 'Aditi Sharma', role: 'Freelance Designer', content: 'FinMax changed how I think about money. The smart insights actually make sense for my situation.', rating: 5 },
            { name: 'Sudeh Jaswal', role: 'Software Engineer', content: 'Clean, fast, and genuinely useful. The Split Kro feature alone makes it worth it.', rating: 5 },
            { name: 'Krishu', role: 'Tech Lead', content: 'Saved over ₹2 lakh in 3 months — just by being more aware of where my money was going.', rating: 5 },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <GlassCard rounded="apple" className="landing-testimonial-card p-8 h-full border-white/5" interactive={true} spacing="lg">
                <div className="flex gap-1 mb-6">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="size-4 fill-cyan-400 text-cyan-400" />
                  ))}
                </div>
                <p className="text-base leading-relaxed mb-8 opacity-60 italic" style={bodyFont}>
                  "{t.content}"
                </p>
                <div className="flex items-center gap-4 border-t border-white/10 pt-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex-shrink-0" />
                  <div>
                    <div className="text-base font-bold text-white tracking-tight" style={headingFont}>{t.name}</div>
                    <div className="text-xs uppercase tracking-widest opacity-40 font-bold" style={monoFont}>{t.role}</div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* PRICING SECTION */}
      <Section id="pricing" className="landing-pricing py-32">
        <div className="text-center mb-20">
          <h2 className="font-bold text-white mb-4" style={{ ...headingFont, fontSize: '2.25rem' }}>
            Simple, honest pricing
          </h2>
          <p style={{ color: '#a1a1aa', ...bodyFont, maxWidth: '400px', margin: '0 auto', lineHeight: 1.7 }}>
            Free to start. Upgrade only when you're ready for more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[
            { plan: 'Basic', price: 'Free', features: ['Manual tracking', 'Basic budgets', 'Weekly summaries'], accent: false },
            { plan: 'Pro', price: '₹199/mo', features: ['Smart insights', 'Split Kro suite', 'Real-time sync', 'Priority support'], accent: true },
            { plan: 'Elite', price: '₹499/mo', features: ['Family sharing', 'Personal advisor', 'Advanced analytics', 'Early access'], accent: false },
          ].map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <GlassCard
                rounded="apple"
                active={p.accent}
                interactive={true}
                spacing="lg"
                className={`landing-pricing-card flex flex-col h-full border-white/5 ${p.accent ? 'ring-2 ring-cyan-500/20' : ''}`}
                style={p.accent ? { boxShadow: '0 40px 100px -12px rgba(0,242,255,0.15)' } : {}}
              >
                <div className="mb-8">
                  <div className="text-xs font-black uppercase tracking-[0.2em] mb-2" style={{ color: p.accent ? CYAN : 'rgba(255,255,255,0.4)' }}>{p.plan}</div>
                  <div className="text-4xl font-black text-white tracking-tighter" style={headingFont}>{p.price}</div>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3">
                      <Check className="size-4" style={{ color: p.accent ? CYAN : 'rgba(255,255,255,0.2)' }} />
                      <span className="text-sm opacity-60" style={bodyFont}>{f}</span>
                    </li>
                  ))}
                </ul>
                <motion.button
                  onClick={onGetStarted}
                  className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.1em] transition-all"
                  style={{
                    background: p.accent ? CYAN : 'rgba(255,255,255,0.05)',
                    color: p.accent ? '#000' : '#fff',
                    border: p.accent ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    ...headingFont,
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Get started with {p.plan}
                </motion.button>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* FINAL CTA SECTION */}
      <Section className="landing-final-cta py-48 text-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          {/* Background glow */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[300px] w-[300px] md:h-[600px] md:w-[600px] mx-auto bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />

          <h2 className="text-6xl md:text-[10rem] font-black tracking-tighter leading-none mb-12 relative z-10" style={headingFont}>
            Take control<br />
            <span style={{ color: CYAN, textShadow: '0 0 60px rgba(0, 242, 255, 0.5)' }}>today.</span>
          </h2>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center relative z-10">
            <motion.button
              onClick={onGetStarted}
              className="px-12 py-6 rounded-full text-xl font-black uppercase tracking-[0.2em] shadow-[0_0_50px_rgba(0,242,255,0.4)]"
              style={{ background: CYAN, color: '#000', ...headingFont }}
              whileHover={{ scale: 1.1, boxShadow: '0 0 80px rgba(0,242,255,0.6)' }}
              whileTap={{ scale: 0.9 }}
            >
              Get started free
            </motion.button>
            <motion.button
              onClick={onLogin}
              className="px-12 py-6 rounded-full text-xl font-black uppercase tracking-[0.2em] border border-white/20"
              style={{ ...glassFrame(), color: '#fff', ...headingFont }}
              whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.95 }}
            >
              Sign in
            </motion.button>
          </div>
        </motion.div>
      </Section>

      {/* FOOTER */}
      <footer className="landing-footer py-20 border-t border-white/5 relative z-10">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Logo />
            <p className="text-sm opacity-40 max-w-xs text-center md:text-left" style={bodyFont}>
              Smart money management for how India actually earns, spends, and saves.
            </p>
          </div>
          <div className="flex gap-12 text-sm font-bold uppercase tracking-widest" style={monoFont}>
            <a href="/privacy.html" className="opacity-70 hover:opacity-100 transition-opacity">Privacy</a>
            <a href="#" className="opacity-40 hover:opacity-100 transition-opacity">Terms</a>
            <a href="#" className="opacity-40 hover:opacity-100 transition-opacity">Status</a>
          </div>
          <div className="text-xs opacity-20" style={monoFont}>
            © 2026 FinMax. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
