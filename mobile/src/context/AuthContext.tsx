import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, supabase } from '../api/client';
import { AuthSession, User } from '../types';

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  requestSmsOtp: (phone: string) => Promise<void>;
  verifySmsOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'finmax_user';
const TOKEN_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = Boolean(user && session);

  const applyAuthResponse = useCallback(async (nextSession: AuthSession | null, nextError: string | null) => {
    if (nextError) {
      setError(nextError);
      throw new Error(nextError);
    }

    if (!nextSession) {
      throw new Error('Session is unavailable');
    }

    setSession(nextSession);
    setUser(nextSession.user);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextSession.user));
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const response = await authApi.getSession();
        if (response.session) {
          setSession(response.session);
          setUser(response.session.user);
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.session.user));
        } else {
          const cached = await AsyncStorage.getItem(USER_STORAGE_KEY);
          if (cached) {
            setUser(JSON.parse(cached) as User);
          }
        }
      } catch (initError) {
        setError(initError instanceof Error ? initError.message : 'Failed to initialize session');
      } finally {
        setIsLoading(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        setSession(null);
        setUser(null);
        void AsyncStorage.removeItem(USER_STORAGE_KEY);
        return;
      }

      const normalized = {
        user: {
          id: nextSession.user.id,
          email: nextSession.user.email || '',
          phone: nextSession.user.phone,
          name: (nextSession.user.user_metadata?.name as string) || nextSession.user.email || 'FinMax User',
        },
        accessToken: nextSession.access_token,
        refreshToken: nextSession.refresh_token,
        expiresAt: nextSession.expires_at,
      } satisfies AuthSession;

      setSession(normalized);
      setUser(normalized.user);
      void AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalized.user));
    });

    void initialize();
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const handle = setInterval(async () => {
      const response = await authApi.refreshSession();
      if (!response.session || response.error) {
        setError(response.error || 'Session expired. Please log in again.');
        await signOut();
        return;
      }
      setSession(response.session);
      setUser(response.session.user);
    }, TOKEN_REFRESH_INTERVAL_MS);

    return () => clearInterval(handle);
  }, [isAuthenticated]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authApi.signUp(email, password, name);
      await applyAuthResponse(response.session, response.error);
    } finally {
      setIsLoading(false);
    }
  }, [applyAuthResponse]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authApi.signIn(email, password);
      await applyAuthResponse(response.session, response.error);
    } finally {
      setIsLoading(false);
    }
  }, [applyAuthResponse]);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authApi.signInWithGoogle();
      await applyAuthResponse(response.session, response.error);
    } finally {
      setIsLoading(false);
    }
  }, [applyAuthResponse]);

  const requestSmsOtp = useCallback(async (phone: string) => {
    setError(null);
    const response = await authApi.requestSmsOtp(phone);
    if (response.error) {
      setError(response.error);
      throw new Error(response.error);
    }
  }, []);

  const verifySmsOtp = useCallback(async (phone: string, token: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authApi.verifySmsOtp(phone, token);
      await applyAuthResponse(response.session, response.error);
    } finally {
      setIsLoading(false);
    }
  }, [applyAuthResponse]);

  const signOut = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authApi.signOut();
      setUser(null);
      setSession(null);
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    isLoading,
    isAuthenticated,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    requestSmsOtp,
    verifySmsOtp,
    signOut,
    clearError,
  }), [user, session, isLoading, isAuthenticated, error, signUp, signIn, signInWithGoogle, requestSmsOtp, verifySmsOtp, signOut, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
