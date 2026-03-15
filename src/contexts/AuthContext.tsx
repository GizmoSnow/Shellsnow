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
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', { session, error });
      setUser(session?.user ?? null);
      setIsSignedOut(!session?.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        console.log('Auth state change:', { event, session });

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsSignedOut(true);
        } else if (event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            setUser(session.user);
            setIsSignedOut(false);
          }
        } else if (event === 'SIGNED_IN') {
          if (session?.user) {
            setUser(session.user);
            setIsSignedOut(false);
          }
        } else if (event === 'INITIAL_SESSION') {
          setUser(session?.user ?? null);
          setIsSignedOut(!session?.user);
        } else if (event === 'USER_UPDATED') {
          if (session?.user) {
            setUser(session.user);
            setIsSignedOut(false);
          }
        } else {
          // For any other event, update user but don't change signed out state
          if (session?.user) {
            setUser(session.user);
            setIsSignedOut(false);
          }
        }
      })();
    });

    return () => subscription.unsubscribe();
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
