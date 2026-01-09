import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdvisorUser {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: string;
  sector: string | null;
  credits_balance: number;
  free_queries_used: number;
  free_queries_reset_at: string;
}

interface AdvisorAuthContextType {
  advisorUser: AdvisorUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, name: string, company?: string) => Promise<{ error?: string }>;
  signOut: () => void;
  refreshCredits: () => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<{ error?: string }>;
}

const AdvisorAuthContext = createContext<AdvisorAuthContextType | undefined>(undefined);

const ADVISOR_USER_KEY = 'advisor_user';

export function AdvisorAuthProvider({ children }: { children: ReactNode }) {
  const [advisorUser, setAdvisorUser] = useState<AdvisorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem(ADVISOR_USER_KEY);
    if (storedUser) {
      try {
        setAdvisorUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(ADVISOR_USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      // Simple hash for demo - in production use bcrypt on backend
      const passwordHash = btoa(password);
      
      const { data, error } = await supabase
        .from('advisor_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('password_hash', passwordHash)
        .single();

      if (error || !data) {
        return { error: 'Credenciales incorrectas' };
      }

      const user: AdvisorUser = {
        id: data.id,
        email: data.email,
        name: data.name,
        company: data.company,
        role: data.role || 'user',
        sector: data.sector,
        credits_balance: Number(data.credits_balance) || 0,
        free_queries_used: data.free_queries_used || 0,
        free_queries_reset_at: data.free_queries_reset_at,
      };

      setAdvisorUser(user);
      localStorage.setItem(ADVISOR_USER_KEY, JSON.stringify(user));
      return {};
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: 'Error al iniciar sesión' };
    }
  };

  const signUp = async (email: string, password: string, name: string, company?: string): Promise<{ error?: string }> => {
    try {
      // Check if user exists
      const { data: existing } = await supabase
        .from('advisor_users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (existing) {
        return { error: 'Este email ya está registrado' };
      }

      // Simple hash for demo - in production use bcrypt on backend
      const passwordHash = btoa(password);

      const { data, error } = await supabase
        .from('advisor_users')
        .insert({
          email: email.toLowerCase(),
          password_hash: passwordHash,
          name,
          company: company || null,
          credits_balance: 0,
          free_queries_used: 0,
          free_queries_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Signup error:', error);
        return { error: 'Error al crear la cuenta' };
      }

      const user: AdvisorUser = {
        id: data.id,
        email: data.email,
        name: data.name,
        company: data.company,
        role: data.role || 'user',
        sector: data.sector,
        credits_balance: Number(data.credits_balance) || 0,
        free_queries_used: data.free_queries_used || 0,
        free_queries_reset_at: data.free_queries_reset_at,
      };

      setAdvisorUser(user);
      localStorage.setItem(ADVISOR_USER_KEY, JSON.stringify(user));
      return {};
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: 'Error al crear la cuenta' };
    }
  };

  const signOut = () => {
    setAdvisorUser(null);
    localStorage.removeItem(ADVISOR_USER_KEY);
  };

  const refreshCredits = async () => {
    if (!advisorUser) return;

    const { data } = await supabase
      .from('advisor_users')
      .select('credits_balance, free_queries_used, free_queries_reset_at')
      .eq('id', advisorUser.id)
      .single();

    if (data) {
      const updatedUser = {
        ...advisorUser,
        credits_balance: Number(data.credits_balance) || 0,
        free_queries_used: data.free_queries_used || 0,
        free_queries_reset_at: data.free_queries_reset_at,
      };
      setAdvisorUser(updatedUser);
      localStorage.setItem(ADVISOR_USER_KEY, JSON.stringify(updatedUser));
    }
  };

  const resetPassword = async (email: string, newPassword: string): Promise<{ error?: string }> => {
    try {
      // Check if user exists
      const { data: existing } = await supabase
        .from('advisor_users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (!existing) {
        return { error: 'No existe una cuenta con este email' };
      }

      // Simple hash for demo - in production use bcrypt on backend
      const passwordHash = btoa(newPassword);

      const { error } = await supabase
        .from('advisor_users')
        .update({ password_hash: passwordHash })
        .eq('email', email.toLowerCase());

      if (error) {
        console.error('Reset password error:', error);
        return { error: 'Error al cambiar la contraseña' };
      }

      return {};
    } catch (err) {
      console.error('Reset password error:', err);
      return { error: 'Error al cambiar la contraseña' };
    }
  };

  return (
    <AdvisorAuthContext.Provider
      value={{
        advisorUser,
        isLoading,
        isAuthenticated: !!advisorUser,
        signIn,
        signUp,
        signOut,
        refreshCredits,
        resetPassword,
      }}
    >
      {children}
    </AdvisorAuthContext.Provider>
  );
}

export function useAdvisorAuth() {
  const context = useContext(AdvisorAuthContext);
  if (context === undefined) {
    throw new Error('useAdvisorAuth must be used within an AdvisorAuthProvider');
  }
  return context;
}
