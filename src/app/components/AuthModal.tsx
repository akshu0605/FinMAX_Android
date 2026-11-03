import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Logo } from './Logo';
import { auth } from '../utils/localStorage-auth';
import { toast } from 'sonner';
import { NeonButton } from './ui/NeonButton';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => void;
  onSignup: (email: string, password: string, name: string) => void;
  initialMode?: 'signin' | 'signup';
}

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

const SOFT_CYAN = '#88f5f8'; // More soothing cyan
const TEAL = SOFT_CYAN;
const monoFont = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };
const headingFont = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };

export function AuthModal({ isOpen, onClose, onLogin, onSignup, initialMode = 'signup' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    const { error } = await auth.signInWithGoogle();
    if (error) {
      toast.error(error || 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
    // On success, Supabase redirects to Google — no need to reset state
  };

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          alert('Passwords do not match!');
          setLoading(false);
          return;
        }
        onSignup(formData.email, formData.password, formData.fullName);
      } else {
        onLogin(formData.email, formData.password);
      }
    } catch (error: any) {
      alert(error.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (!isOpen) return null;

  const inputClass =
    'peer w-full px-4 py-3 rounded-xl text-white placeholder-transparent focus:outline-none transition-all duration-300 border border-white/10 bg-white/5 focus:border-[var(--soft-cyan)] focus:ring-4 focus:ring-[var(--soft-cyan)]/10';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          className="relative w-full max-w-sm sm:max-w-md my-auto"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
        >
          {/* Glow halos */}
          <motion.div
            className="absolute -top-6 -left-6 w-28 h-28 rounded-full pointer-events-none"
            style={{ background: 'rgba(0,242,234,0.15)', filter: 'blur(30px)' }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-6 -right-6 w-36 h-36 rounded-full pointer-events-none"
            style={{ background: 'rgba(0,242,234,0.1)', filter: 'blur(40px)' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.55, 0.3] }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          />

          {/* Card — Liquid Glass */}
          <div
            className="relative rounded-[40px] overflow-hidden"
            style={{
              background: 'rgba(8, 8, 12, 0.72)', // Slightly deeper but smoother
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 50px rgba(136, 245, 248, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
          >
            {/* Glass sheen */}
            <div className="absolute inset-0 pointer-events-none rounded-[40px]"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(0,242,234,0.04) 40%, transparent 70%)' }} />
            {/* Subtle inner glow top */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`, opacity: 0.5 }}
            />

            <div className="relative p-5 sm:p-8">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 transition-colors duration-200"
                style={{ color: 'rgba(255,255,255,0.4)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                <X className="size-6" />
              </button>

              {/* Logo */}
              <div className="flex justify-center mb-8">
                <Logo />
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-white text-center mb-2" style={headingFont}>
                {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-center mb-8 text-sm" style={{ color: '#A1A1A1', ...monoFont }}>
                {mode === 'signup'
                  ? 'Start your journey to financial freedom'
                  : 'Sign in to continue to FinMax'}
              </p>

              {/* Google Sign-In Button */}
              <motion.button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  background: googleLoading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  backdropFilter: 'blur(12px)',
                  ...headingFont,
                }}
                whileHover={!googleLoading ? { scale: 1.02, background: 'rgba(255,255,255,0.13)', borderColor: 'rgba(255,255,255,0.3)' } : {}}
                whileTap={!googleLoading ? { scale: 0.97 } : {}}
              >
                {googleLoading ? (
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                    <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? 'Redirecting to Google...' : 'Continue with Google'}
              </motion.button>

              {/* OR Divider */}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <span className="text-xs" style={{ color: '#666', ...monoFont }}>OR</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div className="relative">
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      placeholder=" "
                      className={inputClass + ' pr-12'}
                      style={monoFont}
                    />
                    <label
                      className="absolute left-4 -top-2.5 text-xs px-1 transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs"
                      style={{ color: '#888', background: 'rgba(10, 10, 15, 0.9)', borderRadius: '4px', ...monoFont }}
                    >
                      Full Name
                    </label>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder=" "
                    className={inputClass}
                    style={monoFont}
                  />
                  <label
                    className="absolute left-4 -top-2.5 text-xs px-1 transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs"
                    style={{ color: '#888', background: 'rgba(10, 10, 15, 0.9)', borderRadius: '4px', ...monoFont }}
                  >
                    Email
                  </label>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder=" "
                    className={inputClass + ' pr-12'}
                    style={monoFont}
                  />
                  <label
                    className="absolute left-4 -top-2.5 text-xs px-1 transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs"
                    style={{ color: '#888', background: 'rgba(10, 10, 15, 0.9)', borderRadius: '4px', ...monoFont }}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>

                {mode === 'signup' && (
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      placeholder=" "
                      className={inputClass + ' pr-12'}
                      style={monoFont}
                    />
                    <label
                      className="absolute left-4 -top-2.5 text-xs px-1 transition-all pointer-events-none peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:-top-2.5 peer-focus:text-xs"
                      style={{ color: '#888', background: 'rgba(10, 10, 15, 0.9)', borderRadius: '4px', ...monoFont }}
                    >
                      Confirm Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                    >
                      {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                )}

                <NeonButton
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 text-base font-bold shadow-lg"
                  style={{
                    background: loading ? 'rgba(136, 245, 248, 0.5)' : SOFT_CYAN,
                    color: '#000',
                  }}
                >
                  {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
                </NeonButton>
              </form>

              {/* Toggle */}
              <div className="mt-6 text-center text-sm" style={{ ...monoFont }}>
                <span style={{ color: '#A1A1A1' }}>
                  {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                </span>{' '}
                <button
                  onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                  className="font-semibold transition-colors duration-200"
                  style={{ color: TEAL }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}