import { lazy, Suspense, useEffect, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import {
  User, Wallet, Bell, Palette, Shield, Database, CreditCard, ChevronRight,
  Upload, Lock, Mail, Phone, Calendar, Globe, Download, FileUp, Trash2,
  LogOut, Check, AlertTriangle, Smartphone, Monitor, Save, ArrowLeft,
} from 'lucide-react';
import { Logo } from './Logo';

import { GlassCard } from './ui/GlassCard';
import { NeonButton } from './ui/NeonButton';
import { toast } from 'sonner';
import { exportAllUserDataToCsv, importUserDataFromCsv } from '../utils/csvDataSync';
import { api } from '../utils/api';
import { supabase } from '../utils/supabase';
import { Sparkles } from 'lucide-react';
import './Settings.css';

const DeferredImportWizard = lazy(() => import('./ImportWizard/ImportWizard').then(({ ImportWizard }) => ({ default: ImportWizard })));

// Design tokens
const TEAL = '#DDB96B';
const headingFont: React.CSSProperties = { fontFamily: 'Inter, Geist, SF Pro, sans-serif' };
const monoFont: React.CSSProperties = { fontFamily: 'JetBrains Mono, "Courier New", monospace' };
const ACCENT_COLORS = [TEAL, '#53D69A', '#8C7BEA', '#F17878', '#E4A866', '#F2D58F'];

function readPreference<T,>(key: string, fallback: T, userId: string): T {
  try {
    const scopedValue = localStorage.getItem(`finmax-settings-${userId}-${key}`);
    const owner = localStorage.getItem('finmax-settings-owner');
    const legacyValue = !scopedValue && (!owner || owner === userId)
      ? localStorage.getItem(`finmax-settings-${key}`)
      : null;
    const value = scopedValue || legacyValue;
    return value ? { ...fallback as object, ...JSON.parse(value) } as T : fallback;
  } catch {
    return fallback;
  }
}

function detectCurrentDevice(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iPhone/iPad' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'device';
  return `${browser} on ${os}`;
}

const inputBase: React.CSSProperties = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(0,242,234,0.18)',
  borderRadius: '12px', color: '#fff', outline: 'none', ...monoFont,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
};

const sheen = (
  <div className="absolute inset-0 pointer-events-none rounded-[inherit]"
    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
);

// Teal toggle switch
function Toggle({ on, onToggle, accent = TEAL }: { on: boolean; onToggle: () => void; accent?: string }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} aria-label={on ? 'Turn off' : 'Turn on'}
      className="relative w-14 h-8 rounded-full transition-all shrink-0"
      style={on ? {
        background: accent,
        boxShadow: `0 0 14px ${accent}66`,
      } : {
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <motion.div
        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg"
        animate={{ left: on ? '24px' : '4px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ boxShadow: on ? '0 0 8px rgba(0,242,234,0.5)' : '0 2px 6px rgba(0,0,0,0.4)' }}
      />
    </button>
  );
}

// Row with toggle helper
function ToggleRow({ icon: Icon, iconColor, label, description, on, onToggle, accentColor = TEAL }: {
  icon: any; iconColor: string; label: string; description: string; on: boolean; onToggle: () => void; accentColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `rgba(${iconColor === TEAL ? '0,242,234' : iconColor === '#34D399' ? '52,211,153' : iconColor === '#F87171' ? '248,113,113' : iconColor === '#60A5FA' ? '96,165,250' : iconColor === '#FBBF24' ? '251,191,36' : '167,139,250'},0.1)`,
            border: `1px solid ${iconColor}25`,
          }}>
          <Icon className="size-5" style={{ color: iconColor }} />
        </div>
        <div>
          <div className="font-semibold text-white text-sm" style={headingFont}>{label}</div>
          <div className="text-xs mt-0.5" style={{ color: '#A1A1A1', ...monoFont }}>{description}</div>
        </div>
      </div>
      <Toggle on={on} onToggle={onToggle} accent={accentColor} />
    </div>
  );
}


// Types & Interfaces
interface SettingsProps {
  userId: string;
  userName: string;
  userEmail: string;
  onBack: () => void;
  onLogout: () => void;
  currency: string;
  onCurrencyChange: (c: string) => void;
  onDataChanged: () => Promise<void>;
}
type SettingsSection = 'profile' | 'financial' | 'notifications' | 'appearance' | 'security' | 'data' | 'subscription';

export function Settings({ userId, userName, userEmail, onBack, onLogout, currency, onCurrencyChange, onDataChanged }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileAvatarPath, setProfileAvatarPath] = useState('');
  const [fullName, setFullName] = useState(userName);
  const [phone, setPhone] = useState('');
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [canSyncPreferences, setCanSyncPreferences] = useState(false);
  const [financialPreferences, setFinancialPreferences] = useState(() => readPreference('financial', { budgetAlerts: true, overBudgetWarning: true, salaryCreditDate: '1', financialYear: 'April-March' }, userId));
  const [notificationPreferences, setNotificationPreferences] = useState(() => readPreference('notifications', { emailNotifications: false, budgetAlerts: true, billReminders: true, emiReminders: true, weeklySummary: false }, userId));
  const [appearancePreferences, setAppearancePreferences] = useState(() => readPreference('appearance', { darkMode: true, compactMode: false, animationsEnabled: true, accentColor: TEAL }, userId));
  const { budgetAlerts, overBudgetWarning, salaryCreditDate, financialYear } = financialPreferences;
  const { emailNotifications, budgetAlerts: budgetAlertsNotif, billReminders, emiReminders, weeklySummary } = notificationPreferences;
  const { darkMode, compactMode, animationsEnabled, accentColor } = appearancePreferences;
  const [reportEmail, setReportEmail] = useState(userEmail);
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  const [currentDevice, setCurrentDevice] = useState('Current device');
  const [lastSignIn, setLastSignIn] = useState('This signed-in session');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorFactorId, setTwoFactorFactorId] = useState('');
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isSecurityBusy, setIsSecurityBusy] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.finmaxCompact = String(compactMode);
    document.documentElement.dataset.finmaxAnimations = String(animationsEnabled);
    document.documentElement.style.setProperty('--finmax-accent', accentColor);
    document.documentElement.style.setProperty('--ns-cyan', accentColor);
  }, [appearancePreferences, compactMode, animationsEnabled, accentColor]);

  useEffect(() => {
    if (!preferencesReady) return;

    try {
      localStorage.setItem(`finmax-settings-${userId}-financial`, JSON.stringify(financialPreferences));
      localStorage.setItem(`finmax-settings-${userId}-notifications`, JSON.stringify(notificationPreferences));
      localStorage.setItem(`finmax-settings-${userId}-appearance`, JSON.stringify(appearancePreferences));
      localStorage.setItem('finmax-settings-owner', userId);
    } catch {
      // The authenticated profile metadata remains the cross-device preference source.
    }

    if (!canSyncPreferences || !userId) return;
    const timeout = window.setTimeout(async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || data.user.id !== userId) return;
      const metadata = data.user.user_metadata || {};
      const current = metadata.finmax_preferences && typeof metadata.finmax_preferences === 'object'
        ? metadata.finmax_preferences as Record<string, unknown>
        : {};
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          finmax_preferences: {
            ...current,
            financial: financialPreferences,
            notifications: notificationPreferences,
            appearance: appearancePreferences,
          },
        },
      });
      if (updateError) toast.error('Could not sync preferences to your account');
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [preferencesReady, canSyncPreferences, userId, financialPreferences, notificationPreferences, appearancePreferences]);

  useEffect(() => {
    setReportEmail(userEmail);
  }, [userEmail]);

  useEffect(() => {
    setCurrentDevice(detectCurrentDevice());
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session?.user) return;
      const lastSignInAt = data.session.user.last_sign_in_at;
      if (lastSignInAt) setLastSignIn(`Last signed in ${new Date(lastSignInAt).toLocaleString()}`);
    });
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (!active || error) return;
      const verifiedTotp = data?.totp?.find(factor => factor.status === 'verified');
      setTwoFactorEnabled(Boolean(verifiedTotp));
      setTwoFactorFactorId(verifiedTotp?.id || '');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active) return;
      const user = !error && data.user?.id === userId ? data.user : null;
      if (user) {
        const metadata = user.user_metadata || {};
        const profile = metadata.finmax_profile && typeof metadata.finmax_profile === 'object'
          ? metadata.finmax_profile as Record<string, unknown>
          : {};
        const metadataName = [profile.full_name, metadata.full_name, metadata.name, metadata.given_name]
          .find(value => typeof value === 'string' && value.trim());
        setFullName((typeof metadataName === 'string' && metadataName.trim()) || userName || user.email?.split('@')[0] || 'FinMax User');
        setPhone(typeof profile.phone === 'string' ? profile.phone : typeof metadata.phone === 'string' ? metadata.phone : '');

        const storedAvatarPath = typeof profile.avatar_path === 'string' ? profile.avatar_path : '';
        setProfileAvatarPath(storedAvatarPath);
        if (storedAvatarPath) {
          supabase.storage.from('finmax-avatars').createSignedUrl(storedAvatarPath, 60 * 60 * 24 * 30)
            .then(({ data: signedAvatar }) => {
              if (active && signedAvatar?.signedUrl) setProfileImage(signedAvatar.signedUrl);
            })
            .catch(() => undefined);
        } else {
          const providerAvatar = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : typeof metadata.picture === 'string' ? metadata.picture : null;
          setProfileImage(providerAvatar);
        }

        const saved = metadata.finmax_preferences;
        if (saved && typeof saved === 'object') {
          const preferences = saved as Record<string, unknown>;
          if (preferences.financial && typeof preferences.financial === 'object') {
            setFinancialPreferences(current => ({ ...current, ...preferences.financial as object }));
          }
          if (preferences.notifications && typeof preferences.notifications === 'object') {
            setNotificationPreferences(current => ({ ...current, ...preferences.notifications as object }));
          }
          if (preferences.appearance && typeof preferences.appearance === 'object') {
            const appearance = preferences.appearance as Record<string, unknown>;
            setAppearancePreferences(current => ({
              ...current,
              ...appearance,
              accentColor: typeof appearance.accentColor === 'string' && ACCENT_COLORS.includes(appearance.accentColor)
                ? appearance.accentColor
                : current.accentColor,
            }));
          }
        }
        if (user.last_sign_in_at) setLastSignIn(`Last signed in ${new Date(user.last_sign_in_at).toLocaleString()}`);
        setCanSyncPreferences(true);
      }
      setPreferencesReady(true);
    }).catch(() => {
      if (active) setPreferencesReady(true);
    });
    return () => { active = false; };
  }, [userId, userName]);

  const updateFinancialPreference = (key: keyof typeof financialPreferences) => {
    setFinancialPreferences(current => ({ ...current, [key]: !current[key] }));
  };
  const updateNotificationPreference = (key: keyof typeof notificationPreferences) => {
    setNotificationPreferences(current => ({ ...current, [key]: !current[key] }));
  };
  const updateAppearancePreference = <K extends keyof typeof appearancePreferences>(key: K, value: (typeof appearancePreferences)[K]) => {
    setAppearancePreferences(current => ({ ...current, [key]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Choose an image smaller than 5 MB');
      return;
    }

    try {
      setIsUploadingProfileImage(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) throw new Error('Your signed-in session could not be verified');
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const avatarPath = `${userId}/profile.${extension}`;
      const { error: uploadError } = await supabase.storage.from('finmax-avatars').upload(avatarPath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600',
      });
      if (uploadError) throw uploadError;

      const { data: signedAvatar, error: signedError } = await supabase.storage.from('finmax-avatars').createSignedUrl(avatarPath, 60 * 60 * 24 * 30);
      if (signedError || !signedAvatar?.signedUrl) throw signedError || new Error('Could not load the uploaded photo');
      const currentMetadata = authData.user.user_metadata || {};
      const currentProfile = currentMetadata.finmax_profile && typeof currentMetadata.finmax_profile === 'object'
        ? currentMetadata.finmax_profile as Record<string, unknown>
        : {};
      const { error: profileError } = await supabase.auth.updateUser({
        data: { finmax_profile: { ...currentProfile, avatar_path: avatarPath } },
      });
      if (profileError) throw profileError;
      setProfileAvatarPath(avatarPath);
      setProfileImage(signedAvatar.signedUrl);
      toast.success('Profile photo saved');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Photo upload failed';
      if (/bucket|not found|row-level|policy/i.test(message)) {
        toast.error('Photo storage is not configured. Run the included Supabase avatar setup SQL.');
      } else {
        toast.error(message || 'Photo upload failed');
      }
    } finally {
      setIsUploadingProfileImage(false);
    }
  };

  const handleSaveProfile = async () => {
    const normalizedName = fullName.trim();
    if (!normalizedName) {
      toast.error('Enter your name');
      return;
    }
    try {
      setIsSavingProfile(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) throw new Error('Your signed-in session could not be verified');
      const currentMetadata = authData.user.user_metadata || {};
      const currentProfile = currentMetadata.finmax_profile && typeof currentMetadata.finmax_profile === 'object'
        ? currentMetadata.finmax_profile as Record<string, unknown>
        : {};
      const { error } = await supabase.auth.updateUser({
        data: {
          name: normalizedName,
          full_name: normalizedName,
          phone: phone.trim(),
          finmax_profile: { ...currentProfile, full_name: normalizedName, phone: phone.trim(), avatar_path: profileAvatarPath || null },
        },
      });
      if (error) throw error;
      setFullName(normalizedName);
      toast.success('Profile saved to your account');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      setIsExportingCsv(true);
      const csv = await exportAllUserDataToCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finmax-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV export completed');
    } catch (error: any) {
      toast.error(error.message || 'CSV export failed');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleEmailExpenseReport = async () => {
    const recipient = reportEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      toast.error('Enter a valid email address');
      return;
    }
    try {
      setIsPreparingReport(true);
      const { data, error } = await api.getExpenses();
      if (error) throw new Error(error);
      const expenses = data?.expenses || [];
      if (expenses.length === 0) {
        toast.info('There are no recorded expenses to include yet');
        return;
      }
      const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const rows = [
        ['Date', 'Merchant / Description', 'Category', `Amount (${currency})`],
        ...expenses.map((expense: any) => [expense.date, expense.title, expense.category, expense.amount]),
      ];
      const csv = rows.map(row => row.map(quote).join(',')).join('\r\n');
      const file = new File([`\uFEFF${csv}`], `finmax-expenses-${new Date().toISOString().slice(0, 10)}.csv`, { type: 'text/csv;charset=utf-8' });
      const shareData: ShareData = {
        files: [file],
        title: 'FinMax expense report',
        text: `Expense report for ${recipient}. This file contains ${expenses.length} recorded expenses.`,
      };

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(shareData);
        toast.success('Expense report shared. Choose your email app and send it.');
        return;
      }

      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      const subject = encodeURIComponent('My FinMax expense report');
      const body = encodeURIComponent(`Hi,\n\nPlease find my FinMax expense report attached. I downloaded the CSV file and will attach it before sending.\n`);
      window.location.assign(`mailto:${encodeURIComponent(recipient)}?subject=${subject}&body=${body}`);
      toast.success('CSV downloaded. Attach it to the email draft before sending.');
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      toast.error(error?.message || 'Could not prepare the expense report');
    } finally {
      setIsPreparingReport(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Use a password with at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('The passwords do not match');
      return;
    }
    try {
      setIsSecurityBusy(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      toast.success('Password updated');
    } catch (error: any) {
      toast.error(error?.message || 'Could not update password');
    } finally {
      setIsSecurityBusy(false);
    }
  };

  const handleStartTwoFactor = async () => {
    try {
      setIsSecurityBusy(true);
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'FinMax authenticator' });
      if (error) throw error;
      setTwoFactorSetup({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setTwoFactorCode('');
    } catch (error: any) {
      toast.error(error?.message || 'Could not start authenticator setup');
    } finally {
      setIsSecurityBusy(false);
    }
  };

  const handleVerifyTwoFactor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!twoFactorSetup || !/^\d{6}$/.test(twoFactorCode)) {
      toast.error('Enter the 6-digit code from your authenticator app');
      return;
    }
    try {
      setIsSecurityBusy(true);
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: twoFactorSetup.factorId, code: twoFactorCode });
      if (error) throw error;
      setTwoFactorFactorId(twoFactorSetup.factorId);
      setTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      toast.success('Two-factor authentication is enabled');
    } catch (error: any) {
      toast.error(error?.message || 'That code could not be verified');
    } finally {
      setIsSecurityBusy(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!twoFactorFactorId || !window.confirm('Turn off two-factor authentication for this account?')) return;
    try {
      setIsSecurityBusy(true);
      const { error } = await supabase.auth.mfa.unenroll({ factorId: twoFactorFactorId });
      if (error) throw error;
      setTwoFactorFactorId('');
      setTwoFactorEnabled(false);
      toast.success('Two-factor authentication is off');
    } catch (error: any) {
      toast.error(error?.message || 'Could not disable two-factor authentication');
    } finally {
      setIsSecurityBusy(false);
    }
  };

  const handleSignOutAllDevices = async () => {
    if (!window.confirm('Sign out of FinMax on all devices? You will need to log in again.')) return;
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      onLogout();
    } catch (error: any) {
      toast.error(error?.message || 'Could not sign out of all devices');
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const [expRes, incRes, budRes, pdfExporter] = await Promise.all([
        api.getExpenses(),
        api.getIncomes(),
        api.getBudgets(),
        import('../utils/pdfExport'),
      ]);

      const expenses = expRes.data?.expenses || [];
      const incomes = incRes.data?.incomes || [];
      const budgets = budRes.data?.budgets || [];

      await pdfExporter.exportFinancialReportToPdf({
        userEmail,
        currency,
        expenses,
        incomes,
        budgets,
      });

      toast.success('PDF financial statement exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'PDF export failed');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleImportCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImportingCsv(true);
      const content = await file.text();
      const result = await importUserDataFromCsv(content);
      await onDataChanged();

      if (result.errors.length > 0) {
        toast.warning(`Imported ${result.imported}, skipped ${result.skipped}. Check console for row errors.`);
        console.warn('CSV import row errors:', result.errors);
      } else {
        toast.success(`Imported ${result.imported} rows successfully`);
      }
    } catch (error: any) {
      toast.error(error.message || 'CSV import failed');
    } finally {
      event.target.value = '';
      setIsImportingCsv(false);
    }
  };

  const menuItems = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'financial' as const, label: 'Financial Preferences', icon: Wallet },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'data' as const, label: 'Data Management', icon: Database },
    { id: 'subscription' as const, label: 'Subscription', icon: CreditCard },
  ];

  const sectionTitles: Record<SettingsSection, { title: string; sub: string }> = {
    profile: { title: 'Profile Settings', sub: 'Manage your personal information' },
    financial: { title: 'Financial Preferences', sub: 'Customize your financial settings' },
    notifications: { title: 'Notification Settings', sub: 'Manage how you receive notifications' },
    appearance: { title: 'Appearance Settings', sub: 'Customize your interface' },
    security: { title: 'Security Settings', sub: 'Manage your account security' },
    data: { title: 'Data Management', sub: 'Manage your financial data' },
    subscription: { title: 'Subscription & Billing', sub: 'Manage your subscription plan' },
  };

  const selectStyle: React.CSSProperties = {
    ...inputBase,
    appearance: 'none', cursor: 'pointer',
    paddingLeft: '2.75rem',
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Avatar */}
            <GlassCard rounded="apple">
              <div className="flex items-center gap-6">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ background: 'rgba(0,242,234,0.1)', border: '2px solid rgba(0,242,234,0.3)', boxShadow: '0 0 20px rgba(0,242,234,0.15)' }}>
                    {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : <User className="size-12" style={{ color: TEAL }} />}
                  </div>
                  <label className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ background: 'rgba(0,0,0,0.65)' }}>
                    <Upload className="size-6 text-white" />
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} disabled={isUploadingProfileImage} className="hidden" />
                  </label>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1" style={headingFont}>{fullName}</h3>
                  <p className="text-sm mb-3" style={{ color: '#A1A1A1', ...monoFont }}>{userEmail}</p>
                  <label className="text-sm font-semibold transition-colors cursor-pointer" style={{ color: TEAL, ...monoFont }}>
                    {isUploadingProfileImage ? 'Saving photo…' : profileImage ? 'Change profile photo' : 'Upload profile photo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} disabled={isUploadingProfileImage} className="hidden" />
                  </label>
                </div>
              </div>
            </GlassCard>

            {/* Personal info */}
            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-5" style={headingFont}>Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Full Name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputBase}
                    onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.07)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07)'; }} />
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: '#A1A1A1' }} />
                    <input type="email" value={userEmail} disabled style={{ ...inputBase, paddingLeft: '2.75rem', color: '#A1A1A1', cursor: 'not-allowed' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-4" style={{ color: '#A1A1A1' }} />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ ...inputBase, paddingLeft: '2.75rem' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.07)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07)'; }} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <NeonButton onClick={handleSaveProfile} disabled={isSavingProfile}>
                    <Save className="size-4" /> {isSavingProfile ? 'Saving…' : 'Save Changes'}
                  </NeonButton>
                </div>
              </div>
            </GlassCard>

            {/* Security quick actions */}
            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-4" style={headingFont}>Quick Security</h3>
              <div className="space-y-3">
                <motion.button className="w-full flex items-center justify-between px-4 py-3 rounded-xl group relative overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)' }}
                  whileHover={{ borderColor: 'rgba(0,242,234,0.3)' }}>
                  <div className="flex items-center gap-3">
                    <Lock className="size-5" style={{ color: '#A1A1A1' }} />
                    <span className="text-white text-sm" style={headingFont}>Change Password</span>
                  </div>
                  <ChevronRight className="size-4" style={{ color: '#A1A1A1' }} />
                </motion.button>
                <motion.a href="/account-deletion.html" className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.22)', backdropFilter: 'blur(10px)' }}
                  whileHover={{ background: 'rgba(248,113,113,0.12)' }}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="size-5 text-red-400" />
                    <span className="text-red-400 text-sm" style={headingFont}>Delete Account</span>
                  </div>
                  <ChevronRight className="size-4 text-red-400/60" />
                </motion.a>
              </div>
            </GlassCard>
          </motion.div>
        );

      case 'financial':
        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-5" style={headingFont}>Financial Preferences</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Default Currency</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-4 z-10" style={{ color: TEAL }} />
                    <select value={currency} onChange={(e) => onCurrencyChange(e.target.value)} style={selectStyle}>
                      {['INR - Indian Rupee (₹)', 'USD - US Dollar ($)', 'EUR - Euro (€)', 'GBP - British Pound (£)', 'JPY - Japanese Yen (¥)', 'AUD - Australian Dollar (A$)'].map((o) => (
                        <option key={o} value={o.split(' ')[0]} style={{ background: '#0A0A0A' }}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Salary Credit Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4 z-10" style={{ color: TEAL }} />
                    <select value={salaryCreditDate} onChange={(e) => setFinancialPreferences(current => ({ ...current, salaryCreditDate: e.target.value }))} style={selectStyle}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d} style={{ background: '#0A0A0A' }}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of every month</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-2" style={{ color: '#A1A1A1', ...monoFont }}>Financial Year</label>
                  <select value={financialYear} onChange={(e) => setFinancialPreferences(current => ({ ...current, financialYear: e.target.value }))} style={inputBase as any}
                    onFocus={(e) => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,242,234,0.15), inset 0 1px 0 rgba(255,255,255,0.07)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,242,234,0.18)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07)'; }}>
                    <option value="April-March" style={{ background: '#0A0A0A' }}>April – March (India)</option>
                    <option value="January-December" style={{ background: '#0A0A0A' }}>January – December (Calendar Year)</option>
                    <option value="July-June" style={{ background: '#0A0A0A' }}>July – June (Australia)</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(0,242,234,0.08)' }}>
                <ToggleRow icon={Bell} iconColor={TEAL} label="Enable Budget Alerts" description="Save your budget alert preference" on={budgetAlerts} onToggle={() => updateFinancialPreference('budgetAlerts')} accentColor={accentColor} />
                <ToggleRow icon={AlertTriangle} iconColor="#FBBF24" label="Over-Budget Warning" description="Save your over-budget preference" on={overBudgetWarning} onToggle={() => updateFinancialPreference('overBudgetWarning')} accentColor={accentColor} />
              </div>
              <div className="mt-5">
                <NeonButton className="w-full py-3">Save Preferences</NeonButton>
              </div>
            </GlassCard>
          </motion.div>
        );

      case 'notifications':
        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-2" style={headingFont}>Notification Settings</h3>
              <p className="text-sm mb-5" style={{ color: '#A1A1A1', ...monoFont }}>Manage how you receive notifications</p>
              <div>
                <ToggleRow icon={Mail} iconColor="#60A5FA" label="Email Notifications" description="Preference saved; automatic email delivery is not connected" on={emailNotifications} onToggle={() => updateNotificationPreference('emailNotifications')} accentColor={accentColor} />
                <ToggleRow icon={AlertTriangle} iconColor="#FBBF24" label="Budget Alerts" description="Save your preference for future alerts" on={budgetAlertsNotif} onToggle={() => updateNotificationPreference('budgetAlerts')} accentColor={accentColor} />
                <ToggleRow icon={Calendar} iconColor="#F87171" label="Bill Reminders" description="Save your preference for future reminders" on={billReminders} onToggle={() => updateNotificationPreference('billReminders')} accentColor={accentColor} />
                <ToggleRow icon={CreditCard} iconColor="#A78BFA" label="EMI Reminders" description="Save your preference for future reminders" on={emiReminders} onToggle={() => updateNotificationPreference('emiReminders')} accentColor={accentColor} />
                <div className="pt-0">
                  <ToggleRow icon={Bell} iconColor="#34D399" label="Weekly Financial Summary" description="Save your preference for a weekly summary" on={weeklySummary} onToggle={() => updateNotificationPreference('weeklySummary')} accentColor={accentColor} />
                </div>
              </div>
            </GlassCard>
            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-2" style={headingFont}>Email an Expense Report</h3>
              <p className="text-sm mb-5" style={{ color: '#A1A1A1', ...monoFont }}>Prepare a CSV of all expenses saved in FinMax, including statement imports.</p>
              <label className="block text-sm text-neutral-300 mb-2" htmlFor="expense-report-email">Send to</label>
              <input id="expense-report-email" type="email" value={reportEmail} onChange={event => setReportEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" style={inputBase} />
              <p className="text-xs mt-2 mb-4" style={{ color: '#A1A1A1', ...monoFont }}>Your mail app will ask you to review and send. FinMax does not send email in the background.</p>
              <NeonButton className="w-full sm:w-auto" onClick={handleEmailExpenseReport} disabled={isPreparingReport}>
                <Mail className="size-4" /> {isPreparingReport ? 'Preparing report…' : 'Prepare email report'}
              </NeonButton>
            </GlassCard>
          </motion.div>
        );

      case 'appearance':
        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-2" style={headingFont}>Appearance Settings</h3>
              <p className="text-sm mb-5" style={{ color: '#A1A1A1', ...monoFont }}>Customize your interface</p>
              <ToggleRow icon={Palette} iconColor={accentColor} label="Dark Mode" description="Choose the dark or light Settings theme" on={darkMode} onToggle={() => updateAppearancePreference('darkMode', !darkMode)} accentColor={accentColor} />
              <ToggleRow icon={Monitor} iconColor="#60A5FA" label="Compact Mode" description="Reduce spacing in Settings" on={compactMode} onToggle={() => updateAppearancePreference('compactMode', !compactMode)} accentColor={accentColor} />
              <ToggleRow icon={Smartphone} iconColor="#34D399" label="Enable Animations" description="Use motion effects and transitions" on={animationsEnabled} onToggle={() => updateAppearancePreference('animationsEnabled', !animationsEnabled)} accentColor={accentColor} />

              {/* Accent color picker */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,242,234,0.08)' }}>
                <label className="block text-xs mb-4" style={{ color: '#A1A1A1', ...monoFont }}>Accent Color</label>
                <div className="flex gap-3 flex-wrap">
                  {ACCENT_COLORS.map(color => (
                    <button key={color} aria-label={`Use ${color} accent`} aria-pressed={color === accentColor} onClick={() => updateAppearancePreference('accentColor', color)}
                      className="w-12 h-12 rounded-xl transition-all relative overflow-hidden"
                      style={{ backgroundColor: color, boxShadow: color === accentColor ? `0 0 16px ${color}60` : 'none', outline: color === accentColor ? `2px solid rgba(255,255,255,0.7)` : 'none', outlineOffset: '3px' }}
                    >
                      {color === accentColor && <Check className="size-6 text-black m-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        );

      case 'security':
        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="p-5 rounded-2xl overflow-hidden relative"
              style={{ background: twoFactorEnabled ? 'rgba(52,211,153,0.07)' : 'rgba(96,165,250,0.07)', border: `1px solid ${twoFactorEnabled ? 'rgba(52,211,153,0.25)' : 'rgba(96,165,250,0.25)'}`, backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: twoFactorEnabled ? 'rgba(52,211,153,0.15)' : 'rgba(96,165,250,0.15)', border: `1px solid ${twoFactorEnabled ? 'rgba(52,211,153,0.3)' : 'rgba(96,165,250,0.3)'}` }}>
                  <Shield className="size-6" style={{ color: twoFactorEnabled ? '#34D399' : '#60A5FA' }} />
                </div>
                <div>
                  <div className="font-semibold" style={{ color: twoFactorEnabled ? '#34D399' : '#60A5FA', ...headingFont }}>{twoFactorEnabled ? 'Two-factor authentication is on' : 'Two-factor authentication is off'}</div>
                  <div className="text-sm break-all" style={{ color: '#A1A1A1', ...monoFont }}>{userEmail}</div>
                </div>
              </div>
            </div>

            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-4" style={headingFont}>Security Options</h3>
              <div className="space-y-3">
                <button onClick={() => setShowPasswordForm(value => !value)} className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)' }}
                  aria-expanded={showPasswordForm}>
                  <div className="flex items-center gap-3">
                    <Lock className="size-5" style={{ color: '#A1A1A1' }} />
                    <div className="text-left">
                      <div className="font-semibold text-white text-sm" style={headingFont}>Change Password</div>
                      <div className="text-xs" style={{ color: '#A1A1A1', ...monoFont }}>Update your signed-in account password</div>
                    </div>
                  </div>
                  <ChevronRight className="size-4" style={{ color: '#A1A1A1' }} />
                </button>

                {showPasswordForm && (
                  <form onSubmit={handleChangePassword} className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <label className="block text-sm text-neutral-300" htmlFor="new-password">New password</label>
                    <input id="new-password" type="password" minLength={8} required autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} style={inputBase} />
                    <label className="block text-sm text-neutral-300" htmlFor="confirm-password">Confirm new password</label>
                    <input id="confirm-password" type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} style={inputBase} />
                    <NeonButton type="submit" disabled={isSecurityBusy}>{isSecurityBusy ? 'Updating…' : 'Update password'}</NeonButton>
                  </form>
                )}

                <div className="flex items-center justify-between px-4 py-3.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)' }}>
                  <div className="flex items-center gap-3">
                    <Shield className="size-5" style={{ color: '#A1A1A1' }} />
                    <div>
                      <div className="font-semibold text-white text-sm" style={headingFont}>Two-Factor Authentication</div>
                      <div className="text-xs" style={{ color: '#A1A1A1', ...monoFont }}>{twoFactorEnabled ? 'Authenticator app verified' : 'Protect sign-in with an authenticator app'}</div>
                    </div>
                  </div>
                  <NeonButton size="sm" variant={twoFactorEnabled ? 'danger' : 'primary'} disabled={isSecurityBusy} onClick={twoFactorEnabled ? handleDisableTwoFactor : handleStartTwoFactor}>
                    {twoFactorEnabled ? 'Turn off' : 'Set up'}
                  </NeonButton>
                </div>

                {twoFactorSetup && (
                  <form onSubmit={handleVerifyTwoFactor} className="space-y-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <h4 className="font-semibold text-white">Connect an authenticator</h4>
                    <p className="text-sm text-neutral-400">Scan this QR code with an authenticator app, then enter its 6-digit code.</p>
                    <img src={twoFactorSetup.qrCode} alt="Authenticator setup QR code" className="w-44 h-44 p-2 bg-white rounded-lg" />
                    <p className="text-xs text-neutral-400 break-all">Manual setup key: <span className="text-white">{twoFactorSetup.secret}</span></p>
                    <label htmlFor="totp-code" className="block text-sm text-neutral-300">6-digit code</label>
                    <input id="totp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={twoFactorCode} onChange={event => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))} style={inputBase} />
                    <div className="flex gap-2">
                      <NeonButton type="submit" disabled={isSecurityBusy}>{isSecurityBusy ? 'Verifying…' : 'Verify and enable'}</NeonButton>
                      <NeonButton type="button" variant="ghost" onClick={() => setTwoFactorSetup(null)}>Cancel</NeonButton>
                    </div>
                  </form>
                )}
              </div>
            </GlassCard>

            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-4" style={headingFont}>Active Sessions</h3>
              <div className="flex items-center gap-3 p-4 rounded-xl min-w-0"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {/Android|iPhone|iPad/.test(navigator.userAgent) ? <Smartphone className="size-5 shrink-0" style={{ color: '#A1A1A1' }} /> : <Monitor className="size-5 shrink-0" style={{ color: '#A1A1A1' }} />}
                <div className="min-w-0">
                  <div className="font-semibold text-sm flex flex-wrap items-center gap-2 text-white" style={headingFont}>
                    <span>{currentDevice}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)', ...monoFont }}>This device</span>
                  </div>
                  <div className="text-xs break-words" style={{ color: '#A1A1A1', ...monoFont }}>{lastSignIn}</div>
                </div>
              </div>
              <p className="text-xs mt-3" style={{ color: '#A1A1A1', ...monoFont }}>Supabase only exposes this browser session here; other device sessions cannot be listed individually.</p>
              <div className="mt-4">
                <NeonButton variant="danger" onClick={handleSignOutAllDevices}><LogOut className="size-4" /> Sign out of all devices</NeonButton>
              </div>
            </GlassCard>
          </motion.div>
        );

      case 'data':
        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-2" style={headingFont}>Export Data</h3>
              <p className="text-sm mb-5" style={{ color: '#A1A1A1', ...monoFont }}>Download your financial data in various formats</p>
              <div className="grid grid-cols-2 gap-3">
                <NeonButton onClick={handleExportCsv} disabled={isExportingCsv}>
                  <Download className="size-4" /> {isExportingCsv ? 'Exporting...' : 'Export as CSV'}
                </NeonButton>
                <NeonButton variant="ghost" onClick={handleExportPdf} disabled={isExportingPdf}>
                  <Download className="size-4" /> {isExportingPdf ? 'Exporting...' : 'Export as PDF'}
                </NeonButton>
              </div>
            </GlassCard>

            <GlassCard rounded="apple">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-white" style={headingFont}>Import Data</h3>
                  <p className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>
                    Import financial statements from your bank (CSV or PDF)
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold"
                  style={{ background: 'rgba(0,242,234,0.15)', color: TEAL, border: '1px solid rgba(0,242,234,0.3)', ...monoFont }}>
                  Upgraded
                </span>
              </div>

              <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-2 text-xs text-neutral-300 mb-1" style={monoFont}>
                  <Sparkles className="size-3.5 text-cyan-400" />
                  <span>Smart Bank Statement Import</span>
                </div>
                <p className="text-xs text-neutral-400" style={monoFont}>
                  Supports bank CSV statements, standard PDFs, and password-protected PDF statements with automatic merchant categorization & duplicate detection.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <NeonButton onClick={() => setIsImportWizardOpen(true)}>
                  <Upload className="size-4" /> Import Statement (CSV / PDF)
                </NeonButton>
                <label className="inline-block">
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsvFile} disabled={isImportingCsv} />
                  <NeonButton variant="ghost" disabled={isImportingCsv}>
                    <FileUp className="size-4" /> {isImportingCsv ? 'Importing...' : 'FinMax Backup CSV'}
                  </NeonButton>
                </label>
              </div>
            </GlassCard>

            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-2" style={headingFont}>Backup & Restore</h3>
              <p className="text-sm mb-5" style={{ color: '#A1A1A1', ...monoFont }}>Create a backup or restore from previous backup</p>
              <div className="grid grid-cols-2 gap-3">
                <NeonButton><Database className="size-4" /> Create Backup</NeonButton>
                <NeonButton variant="ghost"><Upload className="size-4" /> Restore Backup</NeonButton>
              </div>
            </GlassCard>

            <div className="p-6 rounded-2xl relative overflow-hidden"
              style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.22)', backdropFilter: 'blur(20px)' }}>
              <div className="relative z-10">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="size-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold mb-1" style={{ color: '#F87171', ...headingFont }}>Danger Zone</h3>
                    <p className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>These actions cannot be undone</p>
                  </div>
                </div>
                <NeonButton variant="danger"><Trash2 className="size-4" /> Reset All Financial Data</NeonButton>
              </div>
            </div>
          </motion.div>
        );

      case 'subscription':
        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Plan card */}
            <div className="p-6 rounded-2xl relative overflow-hidden"
              style={{ background: 'rgba(0,242,234,0.05)', border: '1px solid rgba(0,242,234,0.22)', backdropFilter: 'blur(24px)', boxShadow: '0 0 40px rgba(0,242,234,0.06), inset 0 1.5px 0 rgba(0,242,234,0.2)' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(0,242,234,0.08) 0%, transparent 60%)' }} />
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(0,242,234,0.6), transparent)' }} />
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div>
                  <div className="text-xs mb-1 uppercase tracking-widest" style={{ color: '#A1A1A1', ...monoFont }}>Current Plan</div>
                  <h3 className="text-3xl font-bold text-white mb-1" style={headingFont}>Pro Plan</h3>
                  <p className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>Full access to all features</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: TEAL, ...headingFont, textShadow: `0 0 20px rgba(0,242,234,0.4)` }}>₹499</div>
                  <div className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>/month</div>
                </div>
              </div>
              <div className="space-y-2 mb-6 relative z-10">
                {['Unlimited expense tracking', 'Advanced financial calculators', 'Smart financial insights', 'Priority support'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm" style={{ color: '#A1A1A1', ...monoFont }}>
                    <Check className="size-4 shrink-0" style={{ color: TEAL }} /> {f}
                  </div>
                ))}
              </div>
              <NeonButton className="w-full py-3 relative z-10">Upgrade to Premium</NeonButton>
            </div>

            {/* Payment */}
            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-4" style={headingFont}>Payment Method</h3>
              <div className="flex items-center justify-between p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-8 rounded flex items-center justify-center"
                    style={{ background: 'rgba(0,242,234,0.1)', border: '1px solid rgba(0,242,234,0.25)' }}>
                    <CreditCard className="size-5" style={{ color: TEAL }} />
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm" style={monoFont}>•••• •••• •••• 4242</div>
                    <div className="text-xs" style={{ color: '#A1A1A1', ...monoFont }}>Expires 12/2026</div>
                  </div>
                </div>
                <button className="text-sm font-semibold" style={{ color: TEAL, ...monoFont }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >Edit</button>
              </div>
            </GlassCard>

            {/* Billing history */}
            <GlassCard rounded="apple">
              <h3 className="text-lg font-bold text-white mb-4" style={headingFont}>Billing History</h3>
              <div className="space-y-3">
                {[{ date: 'Feb 1, 2026', amount: '₹499' }, { date: 'Jan 1, 2026', amount: '₹499' }, { date: 'Dec 1, 2025', amount: '₹499' }].map((inv, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                      <Calendar className="size-5" style={{ color: '#A1A1A1' }} />
                      <div>
                        <div className="font-semibold text-white text-sm" style={headingFont}>{inv.date}</div>
                        <div className="text-xs" style={{ color: '#A1A1A1', ...monoFont }}>{inv.amount}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 text-xs rounded-full" style={{ background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)', ...monoFont }}>Paid</span>
                      <button className="text-sm font-semibold" style={{ color: TEAL, ...monoFont }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      >Download</button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        );

      default: return null;
    }
  };

  return (
    <MotionConfig reducedMotion={animationsEnabled ? 'never' : 'always'}>
    <div id="finmax-settings" className="min-h-screen text-white" data-theme={darkMode ? 'dark' : 'light'} data-compact={compactMode} style={{ background: darkMode ? '#05070a' : '#f3f6fa', color: darkMode ? '#fff' : '#182230', ...monoFont }}>
      {/* Header */}
      <div className="relative z-10 px-4 sm:px-8 py-4 sm:py-5"
        style={{
          background: 'rgba(0,0,0,0.38)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          borderBottom: '1px solid rgba(0,242,234,0.1)',
          boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04)',
        }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button onClick={onBack}
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,242,234,0.18)', backdropFilter: 'blur(12px)', color: '#A1A1A1' }}
              whileHover={{ borderColor: TEAL, color: TEAL, boxShadow: '0 0 14px rgba(0,242,234,0.2)' }}
            ><ArrowLeft className="size-5" /></motion.button>
            <Logo />
          </div>
          <motion.button onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#A1A1A1', backdropFilter: 'blur(12px)', ...monoFont }}
            whileHover={{ color: '#F87171', borderColor: 'rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.07)' }}
          ><LogOut className="size-4" /> Logout</motion.button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row relative z-10 min-w-0">
        {/* Sidebar */}
        <motion.aside
          className="w-full lg:w-72 lg:min-h-[calc(100vh-69px)] p-4 sm:p-6 flex flex-col shrink-0"
          style={{
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(28px) saturate(200%)',
            WebkitBackdropFilter: 'blur(28px) saturate(200%)',
            borderRight: '1px solid rgba(0,242,234,0.1)',
            borderBottom: '1px solid rgba(0,242,234,0.1)',
            boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)',
          }}
          initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.45 }}
        >
          {/* Sidebar sheen */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 35%)' }} />

          <div className="hidden lg:block mb-6 relative z-10">
            <h1 className="text-2xl font-bold text-white mb-1" style={headingFont}>Settings</h1>
            <p className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>Manage your account preferences</p>
          </div>

          <nav className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto relative z-10 pb-1 -mb-1">
            {menuItems.map(({ id, label, icon: Icon }) => {
              const active = activeSection === id;
              return (
                <motion.button key={id} onClick={() => setActiveSection(id)}
                  className="w-auto lg:w-full shrink-0 flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all relative overflow-hidden whitespace-nowrap"
                  style={active ? {
                    background: 'rgba(0,242,234,0.1)',
                    border: '1px solid rgba(0,242,234,0.28)',
                    color: accentColor,
                    boxShadow: `0 0 18px ${accentColor}20, inset 0 1px 0 ${accentColor}30`,
                    ...monoFont,
                  } : { border: '1px solid transparent', color: '#A1A1A1', ...monoFont }}
                  whileHover={active ? {} : { x: 4, color: '#fff', background: 'rgba(255,255,255,0.04)' }}
                >
                  {active && <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                    style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />}
                  <Icon className="size-5 shrink-0" style={active ? { color: accentColor, filter: `drop-shadow(0 0 4px ${accentColor})` } : {}} />
                  <span className="text-sm font-medium">{label}</span>
                  {active && (
                    <motion.div layoutId="settingsDot" className="ml-auto w-2 h-2 rounded-full"
                      style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
                  )}
                </motion.button>
              );
            })}
          </nav>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-white mb-1" style={headingFont}>{sectionTitles[activeSection].title}</h2>
            <p className="text-sm" style={{ color: '#A1A1A1', ...monoFont }}>{sectionTitles[activeSection].sub}</p>
          </motion.div>
          <div className="max-w-3xl">{renderContent()}</div>
        </main>
      </div>

      {/* Upgraded Statement Import Wizard (CSV & PDF with password support) */}
      <Suspense fallback={<div className="settings-import-loading" role="status">Loading statement tools…</div>}>
      {isImportWizardOpen && <DeferredImportWizard
        isOpen={isImportWizardOpen}
        onClose={() => setIsImportWizardOpen(false)}
        onDataChanged={onDataChanged}
        currency={currency}
      />}
      </Suspense>
    </div>
    </MotionConfig>
  );
}
