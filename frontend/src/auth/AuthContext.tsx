import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type AuthError,
} from 'firebase/auth';
import { getFirebaseAuth } from '../config/firebase';
import { api, setUnauthorizedHandler } from '../api/client';
import { tokenStorage } from '../api/storage';

export interface UserProfile {
  userId: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  role: string;
  tier: 'government' | 'institution' | 'external';
  tenantId: string | null;
  department: string | null;
}

interface AuthState {
  status: 'loading' | 'signed-out' | 'signed-in';
  user: UserProfile | null;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInDev: (role?: string) => Promise<void>;
  signUpGoogle: () => Promise<string>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function exchangeWithBackend(idToken: string): Promise<UserProfile> {
  const res = await api.post('/auth/login', { idToken, deviceId: 'web' });
  const payload = (res.data as { data: { accessToken: string; refreshToken: string; user: UserProfile } }).data;
  await tokenStorage.setItem('accessToken', payload.accessToken);
  await tokenStorage.setItem('refreshToken', payload.refreshToken);
  return payload.user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      setUser((res.data as { data: UserProfile }).data);
      setStatus('signed-in');
    } catch {
      setUser(null);
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const token = await tokenStorage.getItem('accessToken');
      if (token) {
        await refreshProfile();
      } else {
        setStatus('signed-out');
      }
    })();
  }, [refreshProfile]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('signed-out');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    const idToken = await cred.user.getIdToken();
    const profile = await exchangeWithBackend(idToken);
    setUser(profile);
    setStatus('signed-in');
  }, []);

  const signInGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const authInst = getFirebaseAuth();
    try {
      const cred = await signInWithPopup(authInst, provider);
      const idToken = await cred.user.getIdToken();
      const profile = await exchangeWithBackend(idToken);
      setUser(profile);
      setStatus('signed-in');
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr.code === 'auth/popup-blocked' || authErr.code === 'auth/popup-closed-by-user' || authErr.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(authInst, provider);
      } else {
        throw err;
      }
    }
  }, []);

  useEffect(() => {
    const authInst = getFirebaseAuth();
    getRedirectResult(authInst)
      .then(async (cred) => {
        if (cred) {
          const idToken = await cred.user.getIdToken();
          const profile = await exchangeWithBackend(idToken);
          setUser(profile);
          setStatus('signed-in');
        }
      })
      .catch(() => {
        // ignore redirect-result errors (e.g. on first load with no pending redirect)
      });
  }, []);

  const signUpGoogle = useCallback(async (): Promise<string> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const authInst = getFirebaseAuth();
    try {
      const cred = await signInWithPopup(authInst, provider);
      return await cred.user.getIdToken();
    } catch (err) {
      const authErr = err as AuthError;
      if (authErr.code === 'auth/popup-blocked' || authErr.code === 'auth/popup-closed-by-user' || authErr.code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(authInst, provider);
        return '';
      }
      throw err;
    }
  }, []);

  const signInDev = useCallback(async (role = 'assistant-manager') => {
    const res = await api.post('/auth/dev-login', { role });
    const payload = (res.data as { data: { accessToken: string; refreshToken: string; user: UserProfile } }).data;
    await tokenStorage.setItem('accessToken', payload.accessToken);
    await tokenStorage.setItem('refreshToken', payload.refreshToken);
    setUser(payload.user);
    setStatus('signed-in');
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await tokenStorage.getItem('refreshToken');
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch {
      // best effort
    }
    await tokenStorage.deleteItem('accessToken');
    await tokenStorage.deleteItem('refreshToken');
    await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
    setUser(null);
    setStatus('signed-out');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, signInEmail, signInGoogle, signInDev, signUpGoogle, signOut, refreshProfile }),
    [status, user, signInEmail, signInGoogle, signInDev, signUpGoogle, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
