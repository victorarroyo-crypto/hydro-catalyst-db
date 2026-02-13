import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '@/integrations/supabase/externalClient';
import type { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Sync user to external Supabase app_users table
 * This ensures FK constraints work when validating contracts/invoices
 */
const syncUserToExternal = async (user: User) => {
  try {
    // Sync to app_users
    await externalSupabase.from('app_users').upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    });
    // Also sync to users table (referenced by chem_projects FK)
    await externalSupabase.from('users').upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    });
    console.log('[Auth] User synced to external DB:', user.id);
  } catch (error) {
    // Silent fail - don't block login flow
    console.error('[Auth] Error syncing user to external:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Sync user to external DB on SIGNED_IN
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            syncUserToExternal(session.user);
          }
          
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Sync user on session restore (page refresh, etc.)
        syncUserToExternal(session.user);
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // Sync user after successful login
    if (!error && data.user) {
      syncUserToExternal(data.user);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    // Sync user after successful signup
    if (!error && data.user) {
      syncUserToExternal(data.user);
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};