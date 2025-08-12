import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type User = {
  id: string;
  email?: string;
  // Add other user properties as needed
} | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
  // You can optionally add a callback prop to handle navigation on sign out
  onSignOut?: () => void;
};

export function AuthProvider({ children, onSignOut }: AuthProviderProps) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state and set up listener
  useEffect(() => {
    const getSession = async () => {
      console.log('AuthProvider: Getting session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }
        console.log('AuthProvider: Session retrieved:', { session, user: session?.user });
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error in getSession:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', { event, session, user: session?.user });
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        if (onSignOut) onSignOut();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [onSignOut]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Signing in with:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log('Sign in response:', { data, error });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Signing up with:', email);
      const { error } = await supabase.auth.signUp({ email, password });
      console.log('Sign up response:', { error });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    console.log('Signing out...');
    await supabase.auth.signOut();
    console.log('Signed out');
    // Navigation after sign out should be handled by onSignOut callback or app logic
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Resetting password for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/update-password', // Update this with your actual password reset URL
      });
      console.log('Password reset response:', { error });
      return { error };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error: error as Error };
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
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
