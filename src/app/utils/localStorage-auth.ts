import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

const NATIVE_AUTH_REDIRECT = 'com.finmax.mobile://auth/callback';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Session {
  user: User;
  access_token: string;
}

export const auth = {
  /** Register a new user with Supabase Auth */
  signUp: async (
    email: string,
    password: string,
    name: string,
  ): Promise<{ session: Session | null; error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) return { session: null, error: error.message };
    if (!data.session || !data.user) return { session: null, error: 'Failed to create session' };

    return {
      session: {
        user: { id: data.user.id, email: data.user.email || '', name: data.user.user_metadata?.name || '' },
        access_token: data.session.access_token,
      },
      error: null,
    };
  },

  /** Sign in with Supabase Auth */
  signIn: async (
    email: string,
    password: string,
  ): Promise<{ session: Session | null; error: string | null }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { session: null, error: error.message };
    if (!data.session || !data.user) return { session: null, error: 'Invalid session' };

    return {
      session: {
        user: { id: data.user.id, email: data.user.email || '', name: data.user.user_metadata?.name || '' },
        access_token: data.session.access_token,
      },
      error: null,
    };
  },

  /** Restore Supabase Session */
  getSession: async (): Promise<{ session: Session | null; error: string | null }> => {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) return { session: null, error: error.message };
    if (!session || !session.user) return { session: null, error: null };

    return {
      session: {
        user: { id: session.user.id, email: session.user.email || '', name: session.user.user_metadata?.name || '' },
        access_token: session.access_token,
      },
      error: null,
    };
  },

  /** Sign in with Google OAuth via Supabase */
  signInWithGoogle: async (): Promise<{ error: string | null }> => {
    const isNative = Capacitor.isNativePlatform();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: isNative ? NATIVE_AUTH_REDIRECT : window.location.origin,
        skipBrowserRedirect: isNative,
      },
    });
    if (error) return { error: error.message };

    if (isNative) {
      if (!data.url) return { error: 'Google sign-in could not be started.' };
      const authorizationUrl = new URL(data.url);
      const requestedRedirect = authorizationUrl.searchParams.get('redirect_to');
      if (requestedRedirect !== NATIVE_AUTH_REDIRECT) {
        return { error: 'Google sign-in is not configured to return to the FinMax app.' };
      }
      await Browser.open({ url: data.url });
    }
    return { error: null };
  },

  /** Complete the Supabase OAuth redirect opened outside the Android WebView. */
  handleOAuthCallback: async (callbackUrl: string): Promise<{ error: string | null }> => {
    try {
      const callback = new URL(callbackUrl);
      const callbackError = callback.searchParams.get('error_description') || callback.searchParams.get('error');
      if (callbackError) return { error: callbackError };

      const code = callback.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        return { error: error?.message || null };
      }

      const hash = new URLSearchParams(callback.hash.slice(1));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        return { error: error?.message || null };
      }

      return { error: 'Google sign-in returned without a session.' };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unable to complete Google sign-in.' };
    }
  },

  /** Sign out of Supabase */
  signOut: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  /** Returns current token based on Supabase session */
  getToken: async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  },
};
