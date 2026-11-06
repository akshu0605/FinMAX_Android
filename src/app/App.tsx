import { lazy, Suspense, useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { SmoothScroll } from './components/SmoothScroll';
import { CyberBackground } from './components/CyberBackground';
import { auth } from './utils/localStorage-auth';
import { supabase } from './utils/supabase';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

const Dashboard = lazy(() => import('./components/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading] = useState(true);

  // ── Listen to auth state changes (handles OAuth redirects + session restore) ──
  useEffect(() => {
    // onAuthStateChange fires immediately with the current session,
    // and again after Google OAuth redirect with the new session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserName(session.user.user_metadata?.name || session.user.user_metadata?.full_name || '');
        setUserEmail(session.user.email || '');
        setUserId(session.user.id);
        setAccessToken(session.access_token);
        setIsAuthenticated(true);
        setShowAuthModal(false);
      } else {
        setIsAuthenticated(false);
        setUserName('');
        setUserEmail('');
        setUserId('');
        setAccessToken('');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Android sends OAuth redirects back to the app's registered URL scheme.
  // The back button closes the auth dialog or follows the dashboard's view history.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    const listeners: Array<{ remove: () => Promise<void> }> = [];
    const handledOAuthUrls = new Set<string>();

    const completeOAuth = async (url: string) => {
      let callback: URL;
      try {
        callback = new URL(url);
      } catch {
        return;
      }
      if (callback.protocol !== 'com.finmax.mobile:' || callback.hostname !== 'auth' || callback.pathname !== '/callback') return;
      if (handledOAuthUrls.has(url)) return;
      handledOAuthUrls.add(url);

      // Close the system Custom Tab as soon as Android hands the callback to us,
      // including when exchanging the returned code takes time or fails.
      await Browser.close().catch(() => undefined);
      const { error } = await auth.handleOAuthCallback(url);
      if (error) {
        handledOAuthUrls.delete(url);
        toast.error(error);
      }
    };

    void (async () => {
      listeners.push(await NativeApp.addListener('appUrlOpen', ({ url }) => {
        void completeOAuth(url);
      }));

      const launch = await NativeApp.getLaunchUrl();
      if (launch?.url) await completeOAuth(launch.url);

      listeners.push(await NativeApp.addListener('backButton', ({ canGoBack }) => {
        const backEvent = new Event('finmaxBackButton', { cancelable: true });
        window.dispatchEvent(backEvent);
        if (backEvent.defaultPrevented) return;

        if (showAuthModal) {
          setShowAuthModal(false);
          return;
        }
        if (canGoBack) {
          window.history.back();
          return;
        }
        void NativeApp.exitApp();
      }));

      if (!active) await Promise.all(listeners.map((listener) => listener.remove()));
    })();

    return () => {
      active = false;
      void Promise.all(listeners.map((listener) => listener.remove()));
    };
  }, [showAuthModal]);


  const applySession = (session: { user: { name: string; email: string; id: string }; access_token: string }) => {
    setUserName(session.user.name || '');
    setUserEmail(session.user.email || '');
    setUserId(session.user.id);
    setAccessToken(session.access_token);
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  // Login handler
  const handleLogin = async (email: string, password: string) => {
    const { session, error } = await auth.signIn(email, password);
    if (error || !session) {
      toast.error(error || 'Login failed. Please try again.');
      return;
    }
    applySession(session);
    toast.success('Welcome back!');
  };

  // Sign up handler
  const handleSignup = async (email: string, password: string, name: string) => {
    const { session, error } = await auth.signUp(email, password, name);
    if (error || !session) {
      toast.error(error || 'Registration failed. Please try again.');
      return;
    }
    applySession(session);
    toast.success('Account created! Welcome to FinMax 🚀');
  };

  // Logout handler
  const handleLogout = async () => {
    await auth.signOut();
    setIsAuthenticated(false);
    setUserName('');
    setUserEmail('');
    setUserId('');
    setAccessToken('');
    toast.success('Signed out successfully.');
  };

  const handleGetStarted = () => { setAuthMode('signup'); setShowAuthModal(true); };
  const handleOpenLogin = () => { setAuthMode('signin'); setShowAuthModal(true); };

  // Loading splash component
  if (loading) {
    return (
      <div className="size-full flex items-center justify-center" style={{ background: '#000000' }}>
        <div
          className="text-xl animate-pulse"
          style={{
            color: '#DDB96B',
            fontFamily: 'JetBrains Mono, "Courier New", monospace',
            textShadow: '0 0 20px rgba(221,185,107,0.25)',
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <SmoothScroll>
      <div className="size-full">
        <CyberBackground />

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(10,10,10,0.95)',
              border: '1px solid rgba(221,185,107,0.25)',
              color: '#fff',
              fontFamily: 'JetBrains Mono, "Courier New", monospace',
              backdropFilter: 'blur(20px)',
            },
          }}
          richColors
        />

        <div className="relative z-10 size-full">
          {!isAuthenticated ? (
            <LandingPage onGetStarted={handleGetStarted} onLogin={handleOpenLogin} />
          ) : (
            <Suspense fallback={<div className="min-h-screen bg-[#080909]" aria-label="Loading dashboard" />}>
              <Dashboard
                userName={userName}
                userEmail={userEmail}
                userId={userId}
                accessToken={accessToken}
                onLogout={handleLogout}
              />
            </Suspense>
          )}
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
          onSignup={handleSignup}
          initialMode={authMode}
        />
      </div>
    </SmoothScroll>
  );
}
