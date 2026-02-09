import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  username: string;
  email: string;
  elo: number;
  level: number;
  xp: number;
  totalBattles: number;
  wins: number;
  losses: number;
  streak: number;
  badges: string[];
  joinedAt: string;
  assessmentCompleted: boolean;
}

interface UserContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (username: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  completeAssessment: (elo: number) => Promise<void>;
  updateElo: (delta: number) => Promise<void>;
  addBadge: (badge: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

const mapProfile = (row: any, email: string): UserProfile => ({
  username: row.username,
  email,
  elo: row.elo,
  level: row.level,
  xp: row.xp,
  totalBattles: row.total_battles,
  wins: row.wins,
  losses: row.losses,
  streak: row.streak,
  badges: row.badges ?? [],
  joinedAt: row.created_at,
  assessmentCompleted: row.assessment_completed,
});

const fetchProfile = async (session: Session): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return mapProfile(data, session.user.email ?? '');
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Use setTimeout to avoid potential deadlocks with Supabase auth
        setTimeout(async () => {
          const profile = await fetchProfile(session);
          setUser(profile);
          setLoading(false);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const profile = await fetchProfile(session);
        setUser(profile);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: window.location.origin,
      },
    });
    return error ? error.message : null;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const completeAssessment = useCallback(async (elo: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const level = Math.floor(elo / 200) + 1;
    await supabase.from('profiles').update({
      elo,
      assessment_completed: true,
      level,
    }).eq('user_id', session.user.id);
    setUser(prev => prev ? { ...prev, elo, assessmentCompleted: true, level } : prev);
  }, []);

  const updateElo = useCallback(async (delta: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !user) return;
    const newElo = Math.max(0, user.elo + delta);
    await supabase.from('profiles').update({ elo: newElo }).eq('user_id', session.user.id);
    setUser(prev => prev ? { ...prev, elo: newElo } : prev);
  }, [user]);

  const addBadge = useCallback(async (badge: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !user) return;
    if (user.badges.includes(badge)) return;
    const newBadges = [...user.badges, badge];
    await supabase.from('profiles').update({ badges: newBadges }).eq('user_id', session.user.id);
    setUser(prev => prev ? { ...prev, badges: newBadges } : prev);
  }, [user]);

  return (
    <UserContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login, signup, logout,
      completeAssessment, updateElo, addBadge,
    }}>
      {children}
    </UserContext.Provider>
  );
};
