import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, User, Send, Github, Linkedin, Twitter, Heart, ArrowLeft, MessageSquare, Code, ExternalLink } from 'lucide-react';
import { Logo } from './Logo';
import { StarField } from './StarField';
import { GlassCard } from './ui/GlassCard';
import { NeonButton } from './ui/NeonButton';

// Design tokens
const TEAL = '#DDB96B';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(221,185,107,0.18)',
  borderRadius: '12px',
  color: '#fff',
  outline: 'none',
  ...monoFont,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

const focusInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = TEAL;
  e.currentTarget.style.boxShadow = `0 0 16px rgba(221,185,107,0.25), inset 0 1px 0 rgba(255,255,255,0.07)`;
};
const blurInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = 'rgba(221,185,107,0.18)';
  e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07)';
};

interface ContactDeveloperProps { onBack: () => void; }

export function ContactDeveloper({ onBack }: ContactDeveloperProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(true);
    setName(''); setEmail(''); setMessage('');
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const socialLinks = [
    { name: 'GitHub', icon: Github, url: 'https://github.com/akshu0605', border: 'rgba(255,255,255,0.18)' },
    { name: 'LinkedIn', icon: Linkedin, url: 'https://in.linkedin.com/in/akshit-jaswal-7554172b7', border: 'rgba(0,119,181,0.5)' },
    { name: 'X (Twitter)', icon: Twitter, url: 'https://x.com/im__akshit', border: 'rgba(29,161,242,0.5)' },
    { name: 'Email', icon: Mail, url: 'mailto:replyakshit@gmail.com', border: 'rgba(221,185,107,0.4)' },
  ];

  const infoCards = [
    { icon: Mail, label: 'Email', value: 'replyakshit@gmail.com', href: 'mailto:replyakshit@gmail.com', color: TEAL },
    { icon: Phone, label: 'Phone', value: '+91 6230585298', href: 'tel:+916230585298', color: '#34D399' },
    { icon: MapPin, label: 'Location', value: 'Una, Himachal Pradesh, India', href: undefined, color: '#60A5FA' },
  ];

  return (
    <div className="finmax-contact min-h-screen text-white" style={{ background: '#000000', ...monoFont }}>
      <StarField count={160} />

      {/* Success toast */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl flex items-center gap-3"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(24px) saturate(200%)',
            border: '1px solid rgba(52,211,153,0.4)',
            boxShadow: '0 0 30px rgba(52,211,153,0.25), inset 0 1px 0 rgba(52,211,153,0.25)',
            ...headingFont,
          }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)' }}>
            <Send className="size-4" style={{ color: '#34D399' }} />
          </div>
          <span className="font-semibold text-white">Message sent successfully 🎉</span>
        </motion.div>
      )}

      {/* Header */}
      <GlassCard
        className="relative z-10 px-8 py-5"
        spacing="none"
        style={{
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          borderRadius: '0',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center gap-4">
          <motion.button onClick={onBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center group transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(221,185,107,0.18)',
              backdropFilter: 'blur(12px)',
              color: '#A1A1A1',
            }}
            whileHover={{ borderColor: TEAL, color: TEAL, boxShadow: `0 0 14px rgba(221,185,107,0.2)` }}
          >
            <ArrowLeft className="size-5" />
          </motion.button>
          <Logo />
        </div>
      </GlassCard>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-white" style={headingFont}>
            Get in{' '}
            <span style={{ color: TEAL, textShadow: `0 0 30px rgba(221,185,107,0.4)` }}>Touch</span>
          </h1>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: '#A1A1A1', ...monoFont }}>
            Facing issues, bugs, or have suggestions? Let's improve FinMax together 🚀
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-12 gap-8 mb-12">
          {/* LEFT: Form */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="col-span-12 lg:col-span-7">
            <GlassCard
              className="p-8 relative overflow-hidden"
              spacing="none"
              style={{
                boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 50px rgba(221,185,107,0.05)',
              }}
            >
              {/* Sheen */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
              {/* Top glow line */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(221,185,107,0.5), transparent)' }} />

              <div className="flex items-center gap-3 mb-7 relative z-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(221,185,107,0.1)', border: '1px solid rgba(221,185,107,0.25)',
                    boxShadow: '0 0 20px rgba(221,185,107,0.12), inset 0 1px 0 rgba(221,185,107,0.2)',
                  }}>
                  <MessageSquare className="size-6" style={{ color: TEAL, filter: 'drop-shadow(0 0 6px #DDB96B)' }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white" style={headingFont}>Send a Message</h2>
                  <p className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>I'll get back to you soon</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Your Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: '#A1A1A1' }} />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe"
                      style={{ ...inputBase, paddingLeft: '2.75rem' }} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Your Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: '#A1A1A1' }} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="john@example.com"
                      style={{ ...inputBase, paddingLeft: '2.75rem' }} onFocus={focusInput} onBlur={blurInput} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Your Message</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={6}
                    placeholder="Tell me about your experience, report a bug, or suggest a feature..."
                    style={{ ...inputBase, resize: 'none' }}
                    onFocus={focusInput as any} onBlur={blurInput as any} />
                </div>

                <NeonButton type="submit"
                  className="w-full py-4 text-base font-bold shadow-[0_0_22px_rgba(221,185,107,0.4)]"
                  style={{ background: TEAL, color: '#000' }}
                >
                  <span>Send Message</span>
                  <Send className="size-5" />
                </NeonButton>
              </form>
            </GlassCard>
          </motion.div>

          {/* RIGHT: Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="col-span-12 lg:col-span-5 space-y-5">
            {/* Developer card */}
            <GlassCard className="p-6 relative overflow-hidden" spacing="none">
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(221,185,107,0.1)', border: '1px solid rgba(221,185,107,0.3)',
                    boxShadow: '0 0 24px rgba(221,185,107,0.15), inset 0 1px 0 rgba(221,185,107,0.2)',
                  }}>
                  <Code className="size-8" style={{ color: TEAL, filter: 'drop-shadow(0 0 7px #DDB96B)' }} />
                </div>
                <div>
                  <div className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>Developer</div>
                  <div className="text-2xl font-bold text-white" style={headingFont}>Akshit Jaswal</div>
                  <a href="https://my-portfolia-murex.vercel.app/" target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
                    style={{ color: TEAL, ...monoFont }}>
                    Portfolio <ExternalLink className="size-4" />
                  </a>
                </div>
              </div>
            </GlassCard>

            {/* Contact info cards */}
            {infoCards.map(({ icon: Icon, label, value, href, color }, i) => (
              <GlassCard key={label} className="p-5 relative overflow-hidden"
                spacing="none"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.1 }}
                whileHover={{ scale: 1.02, borderColor: `${color}40`, boxShadow: `0 12px 40px rgba(0,0,0,0.65), 0 0 20px ${color}15, inset 0 1.5px 0 rgba(255,255,255,0.1)` }}
              >
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: `rgba(${color === TEAL ? '0,242,234' : color === '#34D399' ? '52,211,153' : '96,165,250'},0.1)`,
                      border: `1px solid ${color}30`,
                      boxShadow: `0 4px 14px ${color}12`,
                    }}>
                    <Icon className="size-6" style={{ color, filter: `drop-shadow(0 0 5px ${color})` }} />
                  </div>
                  <div>
                    <div className="text-xs mb-1" style={{ color: '#A1A1A1', ...monoFont }}>{label}</div>
                    {href ? (
                      <a href={href} className="font-semibold text-white transition-colors"
                        style={{ ...headingFont }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = color)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
                      >{value}</a>
                    ) : (
                      <div className="font-semibold text-white" style={headingFont}>{value}</div>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </motion.div>
        </div>

        {/* Social links */}
        <GlassCard
          className="p-8 relative overflow-hidden"
          spacing="none"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 60%)' }} />
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(221,185,107,0.4), transparent)' }} />

          <h2 className="text-2xl font-bold mb-7 text-center text-white relative z-10" style={headingFont}>
            Connect With Me <span style={{ color: TEAL }}>🌐</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
            {socialLinks.map(({ name, icon: Icon, url, border }, i) => (
              <motion.a key={name} href={url} target="_blank" rel="noopener noreferrer"
                className="p-5 rounded-xl flex flex-col items-center gap-3 relative overflow-hidden group"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
                }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                whileHover={{ y: -5, scale: 1.04, borderColor: border, boxShadow: `0 0 24px rgba(221,185,107,0.12), inset 0 1px 0 rgba(255,255,255,0.1)` }}
              >
                <div className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, transparent 60%)' }} />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center relative"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
                  <Icon className="size-6 text-white group-hover:scale-110 transition-transform" />
                </div>
                <span className="font-semibold text-white" style={headingFont}>{name}</span>
              </motion.a>
            ))}
          </div>
        </GlassCard>

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-center">
          <p className="flex items-center justify-center gap-2 text-sm" style={{ color: '#A1A1A1', ...monoFont }}>
            <span>Made with</span>
            <Heart className="size-4 text-red-500 fill-red-500 animate-pulse" />
            <span>by</span>
            <span className="font-semibold" style={{ color: TEAL, ...headingFont }}>Akshit Jaswal</span>
            <span>🚀</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
