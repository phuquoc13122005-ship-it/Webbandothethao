import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '../lib/db';

type AuthProvider = 'local' | 'google';

export interface AuthUser {
  id: string;
  email: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  provider: AuthProvider;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getAuthServerBaseUrl() {
  const configuredUrl = import.meta.env.VITE_AUTH_SERVER_URL;
  if (configuredUrl && configuredUrl.trim()) {
    return configuredUrl.replace(/\/$/, '');
  }
  return 'http://localhost:4000';
}

async function fetchGoogleSessionUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${getAuthServerBaseUrl()}/auth/me`, {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    if (!payload?.authenticated || !payload.user?.id) {
      return null;
    }

    return {
      id: payload.user.id,
      email: payload.user.email ?? null,
      fullName: payload.user.full_name ?? payload.user.name ?? null,
      avatarUrl: payload.user.avatar_url ?? payload.user.picture ?? null,
      provider: 'google',
    };
  } catch {
    return null;
  }
}

function mapSessionUserToAuthUser(sessionUser: any): AuthUser | null {
  if (!sessionUser?.id) return null;
  const provider = sessionUser.provider === 'google' ? 'google' : 'local';
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? null,
    fullName: (sessionUser.user_metadata?.full_name as string | undefined)
      ?? sessionUser.full_name
      ?? null,
    avatarUrl: (sessionUser.user_metadata?.avatar_url as string | undefined)
      ?? sessionUser.avatar_url
      ?? null,
    provider,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.auth.getSession().then(async ({ data: { session } }: { data: { session: any } }) => {
      const mapped = mapSessionUserToAuthUser(session?.user);
      if (mapped) {
        setUser(mapped);
      } else {
        const googleUser = await fetchGoogleSessionUser();
        setUser(googleUser);
      }
      setLoading(false);
    });

    const { data: { subscription } } = db.auth.onAuthStateChange(async (_event: string, session: any) => {
      const mapped = mapSessionUserToAuthUser(session?.user);
      if (mapped) {
        setUser(mapped);
      } else {
        const googleUser = await fetchGoogleSessionUser();
        setUser(googleUser);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await db.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signInWithGoogle = async () => {
    try {
      window.location.href = `${getAuthServerBaseUrl()}/auth/google`;
    } catch {
      return { error: 'Không thể khởi tạo đăng nhập Google.' };
    }
    return { error: null };
  };

  const signOut = async () => {
    await db.auth.signOut();
    try {
      await fetch(`${getAuthServerBaseUrl()}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors so local logout still works.
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
