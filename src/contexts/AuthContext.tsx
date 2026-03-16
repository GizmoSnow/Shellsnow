import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSignedOut: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSignedOut, setIsSignedOut] = useState(false);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', { session, error });
      setUser(session?.user ?? null);
      setIsSignedOut(!session?.user);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', { event, session });

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsSignedOut(true);
      } else if (session?.user) {
        // For any event with a valid session, update user and clear signed out flag
        setUser(session.user);
        setIsSignedOut(false);
      }
    });

    // Refresh session when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page visible, refreshing session');
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setUser(session.user);
            setIsSignedOut(false);
          } else if (!session) {
            setUser(null);
            setIsSignedOut(true);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('Sign in response:', { data, error });

      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
      }

      return { error };
    } catch (err) {
      console.error('Unexpected sign in error:', err);
      return { error: err as any };
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, isSignedOut, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
