import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { Profile } from '@/lib/types';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; user?: Profile | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const user = await api.getCurrentUser();
      if (user && user.user) {
        setProfile(user.user as Profile);
      }
    } catch (error) {
      // Not logged in
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    await loadCurrentUser();
  }

  async function signIn(email: string, password: string) {
    try {
      const result = await api.login(email, password);
      if (result && result.user) {
        const userProfile = result.user as Profile;
        setProfile(userProfile);
        return { error: null, user: userProfile };
      }
      return { error: 'Login failed', user: null };
    } catch (error) {
      return { error: 'Invalid email or password.', user: null };
    }
  }

  async function signOut() {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setProfile(null);
    }
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
