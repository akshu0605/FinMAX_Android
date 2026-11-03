import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, X, FileKey } from 'lucide-react';
import { NeonButton } from '../ui/NeonButton';

const TEAL = '#00f2ff';
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(0,242,234,0.18)',
  borderRadius: '12px',
  color: '#fff',
  outline: 'none',
  ...monoFont,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
  transition: 'all 0.2s ease',
};

interface PdfPasswordModalProps {
  fileName: string;
  isOpen: boolean;
  /** Called when user submits a password (password string, never stored) */
  onUnlock: (password: string) => void;
  /** Called when user cancels — no data saved */
  onCancel: () => void;
  /** Show "Incorrect password" error after a failed attempt */
  showError?: boolean;
  /** True while decryption is in progress */
  isUnlocking?: boolean;
  /** Custom error message (supports distinguishing wrong-password vs. encryption errors) */
  errorMessage?: string;
}

/**
 * PdfPasswordModal
 *
 * Displayed when a password-protected PDF is detected.
 * The password is held only in local state; it is NEVER:
 *   - Saved to Supabase
 *   - Stored in localStorage or sessionStorage
 *   - Included in logs or error reports
 *   - Sent to any external service
 *
 * When the user clicks Cancel, the modal closes and the password state is
 * cleared by the parent (ImportWizard resets to 'idle' step).
 */
export function PdfPasswordModal({
  fileName,
  isOpen,
  onUnlock,
  onCancel,
  showError = false,
  isUnlocking = false,
  errorMessage,
}: PdfPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onUnlock(password);
    // DO NOT clear password here — parent may need to retry on wrong password.
    // Parent will call onCancel to fully reset, which will unmount this component.
  };

  const handleCancel = () => {
    // Clear password from state before calling parent callback
    setPassword('');
    setShowPassword(false);
    onCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="pdf-password-modal-overlay"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(16px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            id="pdf-password-modal"
            className="w-full max-w-md relative overflow-hidden rounded-[28px]"
            style={{
              background: 'rgba(8,8,8,0.92)',
              border: '1px solid rgba(0,242,234,0.22)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 60px rgba(0,242,234,0.08)',
              backdropFilter: 'blur(32px)',
            }}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {/* Top gradient line */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0,242,234,0.6), transparent)' }} />

            <div className="p-8">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,242,234,0.08)', border: '1px solid rgba(0,242,234,0.2)' }}>
                    <FileKey className="size-6" style={{ color: TEAL }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white" style={headingFont}>
                      Password-Protected PDF
                    </h2>
                    <p className="text-xs mt-0.5 truncate max-w-[200px]"
                      style={{ color: '#A1A1A1', ...monoFont }}>
                      {fileName}
                    </p>
                  </div>
                </div>
                <button
                  id="pdf-password-cancel-x"
                  onClick={handleCancel}
                  className="text-gray-500 hover:text-gray-300 transition-colors mt-1"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Description */}
              <p className="text-sm mb-6 leading-relaxed"
                style={{ color: '#A1A1A1', ...monoFont }}>
                This financial statement is password-protected. Enter the PDF password to continue
                extracting your transactions.
              </p>

              {/* Error message */}
              <AnimatePresence>
                {showError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mb-4 px-4 py-3 rounded-xl"
                    style={{
                      background: 'rgba(248,113,113,0.08)',
                      border: '1px solid rgba(248,113,113,0.25)',
                    }}
                  >
                    <p className="text-sm text-red-400" style={monoFont}>
                      {errorMessage || 'Incorrect PDF password. Please try again.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs mb-2"
                    style={{ color: '#A1A1A1', ...monoFont }}>
                    PDF Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4"
                      style={{ color: '#A1A1A1' }} />
                    <input
                      id="pdf-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter PDF password"
                      autoFocus
                      autoComplete="off"
                      style={{
                        ...inputStyle,
                        paddingLeft: '2.75rem',
                        paddingRight: '3rem',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = TEAL;
                        e.currentTarget.style.boxShadow = '0 0 16px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.07)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)';
                        e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07)';
                      }}
                    />
                    <button
                      type="button"
                      id="pdf-password-toggle-visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#A1A1A1' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = TEAL)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#A1A1A1')}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Privacy notice */}
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)', ...monoFont }}>
                  🔒 Your password is used only to unlock this document locally in your browser.
                  It is never stored or sent anywhere.
                </p>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <NeonButton
                    id="pdf-password-unlock-btn"
                    type="submit"
                    disabled={!password.trim() || isUnlocking}
                    className="flex-1 py-3"
                  >
                    {isUnlocking ? 'Unlocking…' : 'Unlock PDF'}
                  </NeonButton>
                  <NeonButton
                    id="pdf-password-cancel-btn"
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={isUnlocking}
                  >
                    Cancel
                  </NeonButton>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
